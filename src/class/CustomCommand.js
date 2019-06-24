const { findArgs } = require("../modules/util/string");
const BaseCommand = require("./BaseCommand");
// eslint-disable-next-line no-unused-vars
const { Message, RichEmbed } = require("discord.js");
const BSON = require("bson");

const { Message: CCMessage } = require("../logic/cc_classes.js");

class CustomCommand extends BaseCommand {
    /**
     * @param {*} manager 
     * @param {{ id: string; guildId: string; type: number; trigger: string; case_sensitive: boolean; code: string; cst?: BSON.Binary; compile_errors: any[]; last_read: Date; created_at: Date; modified_at: Date; disabled_channels: string[]; enabled: boolean; }} row
     */
    constructor(manager, row) {
        super();

        this.update(row);

        this.manager = manager;
    }

    /**
     * @param {{ id: string; guildId: string; type: number; trigger: string; case_sensitive: boolean; code: string; cst?: BSON.Binary; compile_errors: any[]; last_read: Date; created_at: Date; modified_at: Date; disabled_channels: string[]; enabled: boolean; }} row
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
                _cst: null
            });
            await this.manager.database.updateOne({ id: this.id }, { $set: { compile_errors: errors, cst: null } });
            throw errors;
        }

        this.update({
            compile_errors: [],
            cst: null,
            _cst: cst
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
                ownerId: guild.ownerID
            }
        };

        const { error, embed, content: cont } =
            await this.manager.run(message, { id: this.id, code: this.code, cst: this.cst, message: msg });

        if (error) {
            error.ts = new Date;
            error.commandId = this.id;
            error.guildId = this.guildId;

            await this.manager.errors_db.insertOne(error);
            return;
        }

        if (embed || cont) {
            await message.channel.send(embed ? new RichEmbed(embed) : cont.toString());
        }
    }
}

module.exports = CustomCommand;