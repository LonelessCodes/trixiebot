const asciiPromise = require("asciify-image");

const options = {
    fit: "box",
    width: 32,
    height: 32,
    color: false
};

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("ascii", new class extends BaseCommand {
        async call(message, content) {
            let url;
            if (/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g.test(content)) {
                url = content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g)[0];
            } else if (message.attachments.size > 0) {
                const attach = message.attachments.first();
                url = attach.url;
            }

            if (!url) return;

            const ascii = await asciiPromise(url, options);

            await message.channel.send("```\n" + ascii + "\n```");
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Generates ascii art from an image")
            .setUsage("<?url>")
            .addParameterOptional("url", "Url to an image. Or add an attachment to your message"))
        .setCategory(Category.MISC);
};