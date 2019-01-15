const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

const keys = require("../../keys/cleverbot.json");
const Cleverbot = require("../modules/Cleverbot");

const bot = new Cleverbot(keys.user, keys.key);

module.exports = async function install(cr) {
    cr.register("chat", new class extends BaseCommand {
        async call(message, input) {
            await message.channel.startTyping();

            const session = await bot.create(message.author.id);

            const reply = await session.ask(input);

            await message.channel.stopTyping();
            await message.channel.send(`${message.member.toString()} ${reply}`);
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Talk with Trixie1!!! (using a cleverbot integration)"))
        .setCategory(Category.FUN);
    
    cr.registerAlias("chat", "cleverbot");
};