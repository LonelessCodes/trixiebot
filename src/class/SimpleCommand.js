const log = require("../modules/log");
const Discord = require("discord.js");
const Command = require("../class/Command");

class SimpleCommand extends Command {
    get commands() {
        return {};
    }

    async onmessage(message) {
        if (!message.prefixUsed) return;

        for (const command in this.commands) {
            if (new RegExp(`^${command}\\b`, "i").test(message.content)) {
                if (typeof this.commands[command] === "string") {
                    await message.channel.send(this.commands[command]);
                } else if (typeof this.commands[command] === "function") {
                    const rtrn = await this.commands[command].apply(this, [message]);
                    if (typeof rtrn === "string") message.channel.send(rtrn);
                } else if (this.commands[command] instanceof Discord.RichEmbed) {
                    await message.channel.send({ embed: this.commands[command] });
                }
                log(`${command} executed`);
                return;
            }
        }
    }
}

module.exports = SimpleCommand;
