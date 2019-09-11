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

const events = require("events");
// eslint-disable-next-line no-unused-vars
const Server = require("node-ipc/dao/socketServer.js");
const random = require("../random/random");
const log = require("../../log").namespace("ipc");

/*
* CPC Interface
* @exit
* @message => data
* #send(data)
*/

class IPCAdapter extends events.EventEmitter {
    /**
     * @param {Server} server
     */
    constructor(server) {
        super();

        this.server = server;
        this.server.on("message", data => this.emit("message", data));

        this.sockets = [];

        this.promiseStart = new Promise(resolve => {
            this.server.on("start", () => {
                this.server.on("connect", socket => {
                    while (this.sockets.length > 0) {
                        this.sockets[0].end();
                        this.sockets.splice(0, 1);
                        this.emit("exit");
                    }
                    this.sockets.push(socket);
                    resolve();
                    log(`## connected to ${socket.id} ##`);
                });

                this.server.on("socket.disconnect", (socket, socketId) => {
                    if (this.sockets.length === 0) return;
                    const i = this.sockets.findIndex(s => socketId === s.id);
                    if (i >= 0) {
                        this.sockets.splice(i, 1);
                        this.emit("exit");
                    }

                    log(`## disconnected from ${socketId} ##`);
                });
            });
        });
    }

    getSocket() {
        if (this.sockets.length === 0) return null;
        return random(this.sockets);
    }

    send(data) {
        this.promiseStart.then(() => {
            const socket = this.getSocket();
            if (!socket) throw new Error("No socket connected");
            this.server.emit(socket, "message", data);
        });
    }
}

module.exports = IPCAdapter;
