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

const { timeout } = require("../../util/promises");
const uuid = require("uuid");
const EventEmitter = require("events");

class CPC extends EventEmitter {
    constructor(child) {
        super();

        this.setMaxListeners(0);

        this._listeners = {};

        this.child = child;
        this.child.setMaxListeners(0);

        this.child.on("message", this.onMessage.bind(this));
    }

    onMessage({ bus, payload }) {
        this.emit(bus, payload);
    }

    send(bus, payload) {
        if (this.child.send)
            this.child.send({ bus, payload });
    }

    answer(busWanted, handler) {
        this.child.on("message", async ({ bus: busGotten, id, payload }) => {
            if (busWanted !== busGotten) return;
            const response = await handler(payload);
            if (this.child.send)
                this.child.send({ bus: busGotten, id, payload: response });
        });
    }

    awaitAnswer(busRequest, payloadRequest, opts = {}) {
        const p = new Promise(resolve => {
            const idRequest = uuid.v1();

            const handler = ({ bus: busGotten, id: idGotten, payload: payloadGotten }) => {
                if (idRequest !== idGotten) return;
                if (busRequest !== busGotten) return;

                this.child.removeListener("message", handler);
                resolve(payloadGotten);
            };
            this.child.on("message", handler);

            if (this.child.send)
                this.child.send({ bus: busRequest, id: idRequest, payload: payloadRequest });
        });
        if (opts.timeout) {
            return Promise.race([
                p,
                timeout(opts.timeout).then(() => {
                    throw new Error("Exceeded ipc timeout.");
                }),
            ]);
        }
        return p;
    }

    destroy() {
        this.removeAllListeners();
        this.child.removeAllListeners();
    }
}

module.exports = child => new CPC(child);
