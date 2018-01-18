const log = require("./log");
const Discord = require("discord.js");
const Command = require("./Command");

class SimpleCommand extends Command {
    /**
     * @param {{ [command: string]: function(message: Discord.Message)|Discord.RichEmbed|string; }} commands 
     */
    constructor(commands, opts = { ignore: true }) {
        super(async function (message) {
            for (const command in commands) {
                if ((new RegExp(`^${command}\\b`, "i")).test(message.content)) {
                    if (typeof commands[command] === "string") {
                        await message.channel.send(commands[command]);
                    } else if (typeof commands[command] === "function") {
                        await commands[command].apply(this, message);
                    } else if (commands[command] instanceof Discord.RichEmbed) {
                        await message.channel.send({ embed: commands[command] });
                    }
                    log(`${command} executed`);
                    return;
                }
            }
        }, opts);
    }
}

module.exports = SimpleCommand;
