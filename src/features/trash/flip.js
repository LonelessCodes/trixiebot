const fliptext = require("flip-text");

const BaseCommand = require("../../class/BaseCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("flip", new class extends BaseCommand {
        async call(message, content) {
            const mention = message.alt_mentions.members.first();
            if (!mention) {
                if (content === "") {
                    await message.channel.send(`Usage: \`${message.prefix}flip <user|string>\``);
                    return;
                }
                await message.channel.send(`(╯°□°）╯︵ ${fliptext(content)}`);
                return;
            }
            await message.channel.send(`(╯°□°）╯︵ ${fliptext(mention.displayName)}`);
        }
    })
        .setHelp(new HelpContent().setDescription("Aw heck I'm gonna flip you upside down!\nFlips a text or username upside down like a good boi").setUsage("<user|string>").addParameter("user|string", "user or text to flip"))
        .setCategory(Category.ACTION);

    cr.register("unflip", new class extends BaseCommand {
        async call(message, content) {
            const mention =  message.alt_mentions.members.first();
            if (!mention) {
                if (content === "") {
                    await message.channel.send(`Usage: \`${message.prefix}unflip <user|string>\``);
                    return;
                }
                await message.channel.send(`${content} ノ( ゜-゜ノ)`);
                return;
            }
            await message.channel.send(`${mention.displayName || mention.username} ノ( ゜-゜ノ)`);
        }
    })
        .setHelp(new HelpContent().setDescription("Oh sorry didn't mean to. Lemme just...!\nUn-Flips a text or username like a real good boi who doesn't want you any trouble").setUsage("<user|string>").addParameter("user|string", "user or text to unflip"))
        .setCategory(Category.ACTION);
};