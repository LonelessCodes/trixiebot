const { timeout } = require("./util");
const uuid = require("uuid");
const EventEmitter = require("events");

class CPC extends EventEmitter {
    constructor(child) {
        super();

        this._listeners = {};

        this.child = child;

        this.child.on("message", this.onMessage.bind(this));
    }

    onMessage({ bus, payload }) {
        this.emit(bus, payload);
    }

    send(bus, payload) {
        if (this.child.send)
            this.child.send({ bus, payload });
    }

    answer(busWanted, callback) {
        this.child.on("message", async ({ bus: busGotten, id, payload }) => {
            if (busWanted !== busGotten) return;
            const response = await callback(payload);
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
                })
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
