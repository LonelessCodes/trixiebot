const log = require("../modules/log");
const { timeout } = require("../modules/util");
const Discord = require("discord.js");
const Command = require("../class/Command");

class PenisCommand extends Command {
    constructor(client, config, db) {
        super(client, config);

        this.db = db.collection("penis");
    }

    async onmessage(message) {
        if (/^(penis|cock|dick)\b/i.test(message.content)) {
            const member = message.mentions.members.first() || message.member;

            if (message.mentions.everyone) {
                await message.channel.send("everyone has fucking huge diccs k. You're all beautiful");
                return;
            }

            if (member.user.id === this.client.user.id) {
                const length = 20;
                const girth = 18;
                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D ( ͡° ͜ʖ ͡°)\nLength: **${length.toFixed(1)} in**   Girth: **${girth.toFixed(1)} in**`);
                return;
            }

            const doc = await this.db.findOne({ userId: member.user.id });
            if (!doc) {
                const random = Math.random() - 0.2;
                const length = Math.pow((random > 0 ?
                    (Math.pow(random, 1.4) + 0.2) * 15 + 3 :
                    (random + 0.2) * 15 + 3) / 20, 1.4) * 20 + 1.5;
                const girth = Math.pow((Math.random() + (random - 0.2)) * 0.3, 2) * 8 + 5;

                await this.db.insertOne({
                    userId: member.user.id,
                    girth,
                    length
                });

                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\nLength: **${length.toFixed(1)} in**   Girth: **${girth.toFixed(1)} in**`);
            } else {
                const { length, girth } = doc;

                await message.channel.send(`8${new Array(Math.round(length)).fill("=").join("")}D\nLength: **${length.toFixed(1)} in**   Girth: **${girth.toFixed(1)} in**`);
            }
        }
    }

    usage(prefix) {
        return `\`${prefix}penis <mention?>\` - check on what package your buddy is carrying~ (alias ${prefix}cock, ${prefix}dick)
\`mention\` - optional`;
    }
}

module.exports = PenisCommand;
