const { fork } = require("child_process");
const fs = require("fs-extra");
const { CronJob } = require("cron");

const out = fs.createWriteStream("./logs/out.log", { flags: "a" });
const err = fs.createWriteStream("./logs/err.log", { flags: "a" });

const child = fork("./src/index.js", [], { cwd: process.cwd(), silent: true });
child.stdout.on("data", data => {
    out.write(data);
    process.stdout.write(data);
});
child.stderr.on("data", data => {
    err.write(data);
    process.stderr.write(data);
});

// new CronJob("0 0 0 * * *", () => {

// }, null, true, "Europe/Berlin");
