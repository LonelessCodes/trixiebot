const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const log = require("../modules/log");
const Command = require("../class/Command");

const privateKey = fs.readFileSync("/etc/letsencrypt/live/trixie.loneless.org-0003/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/trixie.loneless.org-0003/cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const app = express();

app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.end("TrixieBot!");
});

const server = https.createServer(credentials, app).listen(443, () => {
    const host = "trixie.loneless.org";
    const port = server.address().port;

    log(`Server listening at https://${host}:${port}`);
});
http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers["host"] + req.url });
    res.end();
}).listen(80);

const command = new Command(async function (message) {

}, {});

module.exports = command;
