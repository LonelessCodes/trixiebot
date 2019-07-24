/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { findArgs } = require("../../util/string");
const log = require("../../log");
const BaseCommand = require("./BaseCommand");
// eslint-disable-next-line no-unused-vars
const { Message, RichEmbed } = require("discord.js");
const BSON = require("bson");

const { Message: CCMessage } = require("../managers/cc_utils/cc_classes");

class CustomCommand extends BaseCommand {
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {*} manager
     * @param {{ id: string, guildId: string, type: number, trigger: string, case_sensitive: boolean, code: string, cst?: BSON.Binary, compile_errors: any[], last_read: Date, created_at: Date, modified_at: Date, disabled_channels: string[], enabled: boolean }} row
     */
    constructor(manager, row) {
        super();

        this.update(row);

        this.manager = manager;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {{ id: string, guildId: string, type: number, trigger: string, case_sensitive: boolean, code: string, cst?: BSON.Binary, compile_errors: any[], last_read: Date, created_at: Date, modified_at: Date, disabled_channels: string[], enabled: boolean }} row
     * @returns {void}
     */
    update(row) {
        this.id = row.id;

        this.guildId = row.guildId;

        this.type = row.type;
        this.trigger = row.trigger;
        this.case_sensitive = row.case_sensitive;

        this.code = row.code;
        this.raw_cst = row.cst;
        this._cst = row._cst || null;

        this.last_read = row.last_read;
        this.compile_errors = row.compile_errors;

        this.created_at = row.created_at;
        this.modified_at = row.modified_at;

        this.disabled_channels = row.disabled_channels;
        this.enabled = row.enabled;
    }

    get cst() {
        if (!this._cst) {
            this._cst = this.raw_cst ? BSON.deserialize(this.raw_cst.buffer) : null;
            this.raw_cst = null;
        }
        return this._cst;
    }

    async compile() {
        const { errors, cst } = await this.manager.compile(this.code);

        if (errors.length > 0) {
            this.update({
                compile_errors: errors,
                cst: null,
                _cst: null,
            });
            await this.manager.database.updateOne({ id: this.id }, { $set: { compile_errors: errors, cst: null } });
            throw errors;
        }

        this.update({
            compile_errors: [],
            cst: null,
            _cst: cst,
        });
        await this.manager.database.updateOne({ id: this.id }, { $set: { compile_errors: [], cst: BSON.serialize(cst) } });
    }

    /**
     * @param {Message} message
     * @param {string} command_name
     * @param {string} content
     */
    async run(message, command_name, content) {
        if (!this.cst) return;

        const guild = message.guild;

        const msg = {
            command_name: this.type === 0 ? command_name : null,
            msg: new CCMessage(message),
            args: this.type !== 0 ? [] : findArgs(content),
            content,
            guild: {
                id: guild.id,
                name: guild.name,
                createdAt: guild.createdTimestamp,
                icon: guild.iconURL,
                memberCount: guild.memberCount,
                ownerId: guild.ownerID,
            },
        };

        const { error, embed, content: cont } =
            await this.manager.run(message, { id: this.id, code: this.code, cst: this.cst, message: msg });

        if (error && error.name === "RuntimeError") {
            error.ts = new Date;
            error.commandId = this.id;
            error.guildId = this.guildId;

            await this.manager.errors_db.insertOne(error);
            return;
        } else if (error) {
            const err = {
                ts: new Date,
                commandId: this.id,
                guildId: this.guildId,
                name: "Unknown Error",
                message: "Not an error thrown by the actual TrixieScript runtime, but by the interpreter",
            };

            log.namespace("cc interpreter").error(error);

            await this.manager.errors_db.insertOne(err);
            return;
        }

        if (embed || cont) {
            await message.channel.send(embed ? new RichEmbed(embed) : cont.toString());
        }
    }
}

module.exports = CustomCommand;
