const EventEmitter = require("events");
const http = require("http");
const querystring = require("querystring");
const log = require("../../modules/log");
const tokens = require("../../../keys/botlist_keys.json");
const secrets = require("../../../keys/webhook.json");
const info = require("../../info");

class UpvotesManager extends EventEmitter {
    constructor(client, db) {
        super();

        this.client = client;

        this.port = info.DEV ? 5001 : 5000;
        this.path = "/webhook/upvote/";

        this.db = db.collection("votes");

        this.server = http.createServer(this.listener.bind(this));

        this.server.listen(this.port, this._emitListening.bind(this));

        this.on("vote", ({ id, type = "vote", timestamp, site }) => {
            if (type === "vote") {
                this.db.insertOne({
                    userId: id,
                    site: site,
                    timestamp
                });
            }

            log(`${id} voted on ${site}`);
        });
    }

    _emitListening() {
        /**
         * Event to notify that the webhook is listening
         * @event UpvotesManager#ready
         * @param {string} hostname The hostname of the webhook server
         * @param {number} port The port the webhook server is running on
         * @param {string} path The path for the webhook
         */
        // Get the user's public IP via an API for hostname later?
        this.emit("ready", { hostname: "0.0.0.0", port: this.port, path: this.path });
    }

    listener(req, res) {
        if (req.method !== "POST") return this._returnResponse(res, 404);
        if (req.headers["content-type"] !== "application/json") return this._returnResponse(res, 400);

        if (!req.url.startsWith(this.path)) return this._returnResponse(res, 404);

        const service = req.url.substr(this.path.length);

        let data = "";
        req.on("data", chunk => {
            if (data.length > 10000) {
                req.destroy();
                return this._returnResponse(res, 400);
            }
            data += chunk;
        });
        req.on("end", () => {
            if (data) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    return this._returnResponse(res, 400);
                }

                this._processVote(req, res, service, data);
            } else {
                return this._returnResponse(res, 400);
            }
        });
    }

    _processVote(req, res, url, data) {
        const [service] = url.split("/");

        if (service === UpvotesManager.discordbotlist) {
            const signature = req.headers["x-dbl-signature"];
            if (!signature) return this._returnResponse(res, 400);

            const [secret, timestamp] = signature.split(" ");
            if (secret !== secrets[UpvotesManager.discordbotlist]) return this._returnResponse(res, 400);

            let millis;
            try {
                millis = parseInt(timestamp);
                if (millis > 1000 * 60 * 2) throw new Error("Timestamp too big");
            } catch (_) {
                return this._returnResponse(res, 400);
            }

            this.emit("vote", {
                id: data.id,
                site: UpvotesManager.discordbotlist,
                timestamp: Date.now() - millis
            });
            return this._returnResponse(res, 200, "Webhook successfully received");
        } else if (service === UpvotesManager.discordbots) {
            const secret = req.headers["authorization"];
            if (secret !== secrets[UpvotesManager.discordbots]) return this._returnResponse(res, 400);

            if (data.query === "") data.query = undefined;
            if (data.query) data.query = querystring.parse(data.query.substr(1));

            const timestamp = Date.now();

            this.emit("vote", {
                id: data.user,
                type: data.type,
                query: data.query,
                site: UpvotesManager.discordbots,
                timestamp
            });
            if (data.isWeekend) {
                this.emit("vote", {
                    id: data.user,
                    type: data.type,
                    query: data.query,
                    site: UpvotesManager.discordbots,
                    timestamp
                });
            }
            return this._returnResponse(res, 200, "Webhook successfully received");
        } else if (service === UpvotesManager.botlistspace) {
            const secret = req.headers["authorization"];
            if (secret !== tokens[UpvotesManager.botlistspace]) return this._returnResponse(res, 400);

            this.emit("vote", {
                id: data.user.id,
                site: UpvotesManager.botlistspace,
                timestamp: Date.now()
            });
            return this._returnResponse(res, 200, "Webhook successfully received");
        } else if (service === UpvotesManager.botsfordiscord) {
            const secret = req.headers["authorization"];
            if (secret !== secrets[UpvotesManager.botsfordiscord]) return this._returnResponse(res, 400);

            this.emit("vote", {
                id: data.user,
                type: data.type,
                site: UpvotesManager.botsfordiscord,
                timestamp: Date.now()
            });
            return this._returnResponse(res, 200, "Webhook successfully received");
        }
        return this._returnResponse(res, 404);
    }

    _returnResponse(res, statusCode, data) {
        res.statusCode = statusCode;
        res.end(data);
    }
}

UpvotesManager.discordbotlist = "discordbotlist.com";
UpvotesManager.discordbots = "discordbots.org";
UpvotesManager.botlistspace = "botlist.space";
UpvotesManager.botsfordiscord = "botsfordiscord.com";

module.exports = UpvotesManager;