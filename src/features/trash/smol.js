const tinytext = require("tiny-text");

const BaseCommand = require("../../class/BaseCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("smol", new class extends BaseCommand {
        get help() {
            return new HelpContent().setUsage(`\`{{prefix}}smol <string|user>\`
\`string|user\` - text or user to smollerize uwu`);
        }

        async call(message, content) {
            const mention = message.mentions.members.first();
            if (!mention) {
                const text = content.replace(/[^\S\x0a\x0d]+/g, " ");
                if (text === "") {
                    await message.channel.send(`Usage: \`${message.prefix}smol <string|user>\``);
                    return;
                }
                await message.channel.send(tinytext(text));
                return;
            }
            await message.channel.send(tinytext(mention.displayName));
        }
    }).setCategory(Category.TEXT);
    cr.registerAlias("smol", "small");
};