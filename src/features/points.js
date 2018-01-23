const log = require("../modules/log");
const pointsDB = require("../modules/database/points");
const Command = require("../class/Command");

function get_level(points) {
    return Math.floor(0.1 * Math.sqrt(points));
}

function random_point() {
    return [10, 15][Math.floor(Math.random() * 2)];
}

const cooldown = new Map;
const cooldowntime = 60 * 1000;
const command = new Command(async function onmessage(message) {
    if (cooldown.has(message.member)) return;

    cooldown.set(message.member, "1");
    setTimeout(() => cooldown.delete(message.member), cooldowntime);

    try {
        const row = await pointsDB.findOne({
            guildId: message.guild.id,
            memberId: message.member.id
        });
        if (!row) {
            await pointsDB.save({
                guildId: message.guild.id,
                memberId: message.member.id,
                points: random_point(),
                level: 0
            });
        } else {
            row.points += random_point();
            let curLevel = get_level(row.points);
            if (curLevel > row.level) {
                row.level = curLevel;
                await message.channel.send(`${message.author.toString()} You've leveled up to level **${curLevel}**! Ain't that dandy?`);
                log(`Level-up ${message.author.username} ${curLevel - 1} => ${curLevel}`);
            }
            await pointsDB.update({
                guildId: message.guild.id,
                memberId: message.member.id
            }, {
                points: row.points,
                level: row.level
            });
        }
    } catch (err) {
        log("Points Error", err);
    }
}, {
    ignore: true
});

module.exports = command;
