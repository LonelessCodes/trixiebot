const log = require("../modules/log");
const sql = require("../modules/database");
const db = new sql.Database("./data/points.sqlite");
const Command = require("../modules/Command");

let lastUser = null;
const command = new Command(async function onmessage(message) {
    if (lastUser === message.author.id) return;
    lastUser = message.author.id;

    try {
        const row = await db.get(`SELECT * FROM scores \
        WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
        if (!row) {
            await db.run("INSERT INTO scores (guildId, userId, points, level) VALUES (?, ?, ?, ?)", [message.guild.id, message.author.id, 1, 0]);
        } else {
            let curLevel = Math.floor(0.1 * Math.sqrt(row.points + 1));
            if (curLevel > row.level) {
                row.level = curLevel;
                await db.run(`UPDATE scores \
                SET points = ${row.points + 1}, level = ${row.level} \
                WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
                // await message.channel.send(`${message.author.toString()} You've leveled up to level **${curLevel}**! Ain't that dandy?`);
                log(`Level-up ${message.author.displayName} ${curLevel - 1} => ${curLevel}`);
            }
            else await db.run(`UPDATE scores \
            SET points = ${row.points + 1} \
            WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
        }
    } catch (err) {
        log("Points Error", err);
    }
}, async function init() {
    await db.run("CREATE TABLE IF NOT EXISTS scores (guildId TEXT, userId TEXT, points INTEGER, level INTEGER)");
});

module.exports = command;
