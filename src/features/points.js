const log = require("../modules/log");
const Command = require("../class/Command");

function get_level(points) {
    return Math.floor(0.1 * Math.sqrt(points));
}

function random_point() {
    return [10, 15][Math.floor(Math.random() * 2)];
}

const cooldown = new Map;
const cooldowntime = 60 * 1000;

class PointsCommand extends Command {
    constructor(client, config, db) {
        super(client, config);
        this.db = db.collection("points");
    }
    async onmessage(message) {
        if (message.prefixUsed) {
            // commands down here
        }

        if (cooldown.has(message.member)) return;

        cooldown.set(message.member, "1");
        setTimeout(() => cooldown.delete(message.member), cooldowntime);

        try {
            const row = await this.db.findOne({
                guildId: message.guild.id,
                memberId: message.member.id
            });
            if (!row) {
                await this.db.insertOne({
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
                    // await message.channel.send(`${message.author.toString()} You've leveled up to level **${curLevel}**! Ain't that dandy? (This is completely useless right now)`);
                    log(`Level-up ${message.author.username} ${curLevel - 1} => ${curLevel}`);
                }
                await this.db.updateOne({
                    guildId: message.guild.id,
                    memberId: message.member.id
                }, {
                    $set: {
                        points: row.points,
                        level: row.level
                    }
                });
            }
        } catch (err) {
            log("Points Error", err);
        }
    }

    get guildOnly() { return true; }
    
    get ignore() {
        return true;
    }
}

module.exports = PointsCommand;
