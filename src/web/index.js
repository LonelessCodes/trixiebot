const fs = require("fs");
const log = require("../modules/log");
const path = require("path");
const btoa = require("btoa");
const fetch = require("node-fetch");
const statistics = require("../logic/statistics");
const http = require("http");
const https = require("https");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const compression = require("compression");
const serveStatic = require("serve-static");
const socketIO = require("socket.io");
const MongoStore = require("connect-mongo")(session);
const Dashboard = require("./Dashboard");

const privateKey = fs.readFileSync("/etc/letsencrypt/live/trixie.loneless.org-0003/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/trixie.loneless.org-0003/cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

function options(addobj) {
    const now = new Date;
    const obj = {
        description: "Discord Bot to query Derpibooru.org and much much more!",
        copyright: now.getFullYear() === 2018 ? "2018" : "2018 - " + now.getFullYear()
    };
    for (let key in addobj) {
        obj[key] = addobj[key];
    }
    return obj;
}

class WebApp {
    constructor(client, config, db) {
        this.app = express();
        this.client = client;
        this.config = config;
        this.db = db;

        this.auth = require("../../keys/discord.json");
        this.redirect = encodeURIComponent("https://trixie.loneless.org/callback");

        this.addStatic();
        this.addMiddlewares();
        this.addRoutes();

        const server = https.createServer(credentials, this.app);
        http.createServer((req, res) => {
            res.writeHead(301, { "Location": "https://" + req.headers["host"] + req.url });
            res.end();
        }).listen(80);

        this.io = socketIO(server);

        this.addSocketLogic();

        server.listen(443, () => {
            const host = "trixie.loneless.org";
            const port = server.address().port;

            log(`Server listening at https://${host}:${port}`);
        });
    }

    addStatic() {
        this.app.use(compression());
        this.app.use("/static", serveStatic(path.join(__dirname, "static"), {
            maxAge: "365d",
            immutable: true,
            index: false,
            redirect: false,
            dotfiles: "ignore"
        }));
    }

    addMiddlewares() {
        this.app.set("view engine", "ejs");
        this.app.set("trust proxy", 1);

        this.app.use(helmet());

        this.app.use(session({
            name: "sessid",
            secret: require("../../keys/express.json").secret,
            store: new MongoStore({ db: this.db }),
            ttl: 7 * 24 * 3600, // = 14 days. Default
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: true,
                maxAge: 3 * 24 * 3600 * 1000
            }
        }));
    }

    addRoutes() {
        this.app.get("/", (req, res) => {
            res.status(200).sendFile(path.join(__dirname, "static", "index.html"));
            res.render("pages/index", options({
                log: []
            }));
        });

        this.app.get("/login", (req, res) => {
            res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${this.auth.client_id}&scope=identify%20guilds&response_type=code&redirect_uri=${this.redirect}`);
        });

        this.app.get("/logout", async (req, res) => {
            req.session.destroy(() => {
                res.redirect("/");
            });
        });

        this.app.get("/callback", async (req, res) => {
            if (!req.query.code) throw new Error("NoCodeProvided");
            const code = req.query.code;
            const creds = btoa(`${this.auth.client_id}:${this.auth.client_secret}`);

            const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${this.redirect}`, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${creds}`,
                }
            });
            const json = await response.json();

            req.session.authenticated = true;
            req.session.access_token = json.access_token;
            req.session.refresh_token = json.refresh_token;

            res.redirect("/dashboard");
        });

        this.app.use("/dashboard", new Dashboard(this, this.client, this.config, this.db).router);

        this.app.all("*", (req, res) => {
            res.status(404);
            if (req.method === "GET") res.render("pages/404");
            else res.end();
        });
    }

    async addSocketLogic() {
        this.io.on("connection", socket => {
            socket.emit("statistics", Object.assign({}, ...[...statistics.entries()].map(stat => ({
                [stat[0]]: stat[1].get()
            }))));
        });
        statistics.addListener("change", ({ name, value }) => {
            this.io.emit("statistics", {
                [name]: value // just discovered this syntax and its GLORIOUS
            });
        });
    }
}

module.exports = WebApp;
