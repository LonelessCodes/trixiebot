const log = require("../modules/log");
const sql = require("../modules/database");
const db = new sql.Database("./data/points.sqlite");
const Command = require("../modules/Command");

function get_level(points) {
    return Math.floor(0.1 * Math.sqrt(points));
}

const cooldown = new Map;
const cooldowntime = 60 * 1000;
const command = new Command(async function onmessage(message) {
    if (cooldown.has(message.member)) return;

    cooldown.set(message.member, "1");
    setTimeout(() => cooldown.delete(message.member), cooldowntime);

    try {
        const row = await db.get(`SELECT * FROM scores \
        WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
        if (!row) {
            await db.run("INSERT INTO scores (guildId, userId, points, level) VALUES (?, ?, ?, ?)", [message.guild.id, message.author.id, 1, 0]);
        } else {
            row.points++;
            let curLevel = get_level(row.points);
            if (curLevel > row.level) {
                row.level = curLevel;
                await db.run(`UPDATE scores \
                SET points = ${row.points}, level = ${row.level} \
                WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
                await message.channel.send(`${message.author.toString()} You've leveled up to level **${curLevel}**! Ain't that dandy?`);
                log(`Level-up ${message.author.displayName} ${curLevel - 1} => ${curLevel}`);
            }
            else await db.run(`UPDATE scores \
            SET points = ${row.points} \
            WHERE userId = "${message.author.id}" AND guildId = "${message.guild.id}"`);
        }
    } catch (err) {
        log("Points Error", err);
    }
}, async function init() {
    await db.run("CREATE TABLE IF NOT EXISTS scores (guildId TEXT, userId TEXT, points INTEGER, level INTEGER)");
}, {
    ignore: true
});

module.exports = command;
