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

const info = require("../../info");
const log = require("../../log").namespace("ipc");
const ipc = require("node-ipc");
const IPCAdapter = require("./IPCAdapter");
const cpc = require("./cpc");

ipc.config.silent = true;
ipc.config.id = info.DEV ? "trixiedev" : "trixiebot";
ipc.config.retry = 1000;
ipc.config.logger = log.bind(log);

ipc.serve();

module.exports = cpc(new IPCAdapter(ipc.server));

ipc.server.start();
