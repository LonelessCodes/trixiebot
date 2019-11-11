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

const { Position } = require("./CallStack");

class Context {
    constructor(interpreter, pos, args = []) {
        this.interpreter = interpreter;
        this.guildId = interpreter.guildId;
        this.settings = interpreter.settings;
        this.pos = pos;
        this.args = args;
    }

    error(msg, pos) {
        return this.interpreter.error(msg, pos || this.pos);
    }

    plus(offset) {
        const pos = Position.fromCST(this.pos);
        pos.column += offset;
        pos.offset += offset;
        return pos;
    }
}

module.exports = Context;
