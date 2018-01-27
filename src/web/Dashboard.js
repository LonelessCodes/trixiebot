const express = require("express");

module.exports = class Dashboard {
    constructor(app, client, db) {
        this.router = express.Router();
        this.app = app;
        this.client = client;
        this.db = db;

        this.addMiddlewares();
        this.addRoutes();
    }

    addMiddlewares() {

    }

    addRoutes() {
        this.router.get("/", async (req, res) => {
            if (!req.session.authenticated) {
                res.end("no");
            } else {
                res.end("yes");
            }
        });
    }
};
