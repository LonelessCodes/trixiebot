const fetch = require("node-fetch");
const log = require("../modules/log");
const querystring = require("querystring");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("8ball", new class extends BaseCommand {
        async call(message, question) {
            if (question === "") {
                return;
            }

            /** @type {} */
            const request = await fetch(`https://8ball.delegator.com/magic/JSON/${querystring.escape(question)}`);
            const { magic } = await request.json();
            if (!magic) {
                throw new Error("TellMe didn't return a valid json body");
            }

            const embed = new Discord.RichEmbed()
                .setColor(CONST.COLOR.PRIMARY)
                .setTitle(`${magic.answer} :crystal_ball:`)
                // .setImage("https://derpicdn.net/img/view/2017/7/20/1490419.png")
                // .setFooter("Edited screenshot by xhazxmatx");

            await message.channel.send({ embed });
            log(`Fulfilled fortune for ${question} successfully.`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("An easy way to find out the quick answer to ANY yes or no question!!!\nYou won't believe it yourself. Spoopy")
            .setUsage("<question>")
            .addParameter("question", "The question you are eager to ask"))
        .setCategory(Category.MISC);
    cr.registerAlias("8ball", "tellme");
};