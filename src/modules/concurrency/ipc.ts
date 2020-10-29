/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const log = require("../../log").default.namespace("ipc");
import * as veza from "veza";
import { VezaServerLayer } from "@trixiebot/ipc";
import config from "../../config";

const retry_timeout = 3000;

const server = new veza.Server("trixie")
    .on("open", () => log("Open success"))
    .on("connect", client => log(`Client Connected: ${client.name}`))
    .on("disconnect", client => log(`Client Disconnected: ${client.name}`))
    .on("error", (error, client) => log.error(`Error from ${client?.name}`, error));

(function connect() {
    log("Starting server...");
    server.listen(
        config.has("ipc.port") ? config.get("ipc.port") : 6969,
        config.has("ipc.host") ? config.get("ipc.host") : "0.0.0.0"
    ).catch(error => {
        log.error("Cloud not start server... retrying", error);
        setTimeout(connect, retry_timeout);
    });
}());

export default new VezaServerLayer(server);
