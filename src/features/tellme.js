const fetch = require("node-fetch");
const log = require("../modules/log");
const querystring = require("querystring");
const CONST = require("../modules/const");
const Discord = require("discord.js");
const Command = require("../class/Command");

class TellMeCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^tellme\b/i.test(message.content)) return;

        const question = message.content.substr(7).trim();
        if (question === "") {
            await message.channel.send(this.usage(message.prefix));
            log("Requested usage of tellme command");
            return;
        }

        /** @type {} */
        const request = await fetch(`https://8ball.delegator.com/magic/JSON/${querystring.escape(question)}`);
        const { magic } = await request.json();
        if (!magic) {
            throw new Error("TellMe didn't return a valid json body");
        }

        const embed = new Discord.RichEmbed()
            .setColor(CONST.COLOUR)
            .setTitle(`${magic.answer} :crystal_ball:`)
            .setImage("https://derpicdn.net/img/view/2017/7/20/1490419.png")
            .setFooter("Edited screenshot by xhazxmatx");

        await message.channel.send({ embed });
        log(`Fulfilled fortune for ${question} successfully.`);
        return;
    }
    usage(prefix) {
        return `\`${prefix}tellme <question>\`
\`question\` - You won't believe it yourself. Spoopy`;
    }
}

module.exports = TellMeCommand;
