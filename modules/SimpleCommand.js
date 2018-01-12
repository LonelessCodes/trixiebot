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
                        message.channel.send(commands[command]);
                    } else if (typeof commands[command] === "function") {
                        commands[command](message);
                    } else if (commands[command] instanceof Discord.RichEmbed) {
                        message.channel.send({ embed: commands[command] });
                    }
                    return;
                }
            }
        }, opts);
    }
}

module.exports = SimpleCommand;
