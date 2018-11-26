const log = require("../../modules/log");
const fliptext = require("flip-text");

const BaseCommand = require("../../class/BaseCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("flip", new class extends BaseCommand {
        get help() {
            return new HelpContent().setUsage(`\`{{prefix}}flip <user|string>\`
\`user|string\` - user or text to flip`);
        }

        async call(message, content) {
            const mention = message.mentions.members.first();
            if (!mention) {
                if (content === "") {
                    await message.channel.send(`Usage: \`${message.prefix}flip <user|string>\``);
                    log("Sent flip usage");
                    return;
                }
                await message.channel.send(`(╯°□°）╯︵ ${fliptext(content)}`);
                return;
            }
            await message.channel.send(`(╯°□°）╯︵ ${fliptext(mention.displayName)}`);
        }
    })
        .setCategory(Category.ACTION);

    cr.register("unflip", new class extends BaseCommand {
        get help() {
            return new HelpContent().setUsage(`\`{{prefix}}unflip <user|string>\`
\`user|string\` - user or text to unflip`);
        }

        async call(message, content) {
            const mention =  message.mentions.members.first();
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
        .setCategory(Category.ACTION);
};