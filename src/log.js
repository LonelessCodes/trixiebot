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

// Future implementation:

// const path = require("path");
// const INFO = require("./info");
// const Logger = require("./util/logger/Logger");
// const LEVEL = require("./util/logger/LEVEL");
// const Terminal = require("./util/logger/Terminal");
// const File = require("./util/logger/File");

// module.exports = new Logger({
//     outputs: [
//         new Terminal({ level: LEVEL.INFO }),
//         new File({ level: LEVEL.DEBUG, out: path.join(INFO.ROOT, ".logs", "trixie-out.log") }),
//         new File({ level: LEVEL.ERROR, out: path.join(INFO.ROOT, ".logs", "trixie-err.log"), filter: ({ level }) => level < LEVEL.INFO }),
//     ],
// });

const Logger = require("./modules/logger/Logger");
module.exports = new Logger();
