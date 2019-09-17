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

// eslint-disable-next-line no-unused-vars
const { Guild } = require("discord.js");

const Bitfield = require("../modules/Bitfield");

class Context extends Bitfield { }

Context.FLAGS = {
    PERMISSIONS: 1 << 0,
};

/**
 * Bitfield representing every scope combined
 * @type {number}
 */
Context.ALL = Object.values(Context.FLAGS).reduce((all, p) => all | p, 0);

class SelfAnalysis {
    constructor() {
        this.analysers = [];

        this.Context = Context;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {string} desc
     * @param {Context} context
     * @param {(guild: Guild, next: (err?: Error) => void) => void} handler
     */
    register(desc, context, handler) {
        this.analysers.push({ desc, context, handler });
    }

    /**
     * @param {Guild} guild
     * @returns {Promise<{ error: boolean, pos: number, desc: string, context: Context, value: string }[]>}
     */
    async run(guild) {
        const arr = [];
        let pos = 0;
        for (let { desc, context, handler } of this.analysers) {
            const rtn = await new Promise(res => handler(guild, val => res(val)));
            if (rtn instanceof Error) {
                arr.push({ error: true, pos, desc, context, value: rtn.message });
            } else {
                arr.push({ error: false, pos, desc, context, value: rtn });
            }

            pos++;
        }

        return arr;
    }
}

module.exports = new SelfAnalysis;
