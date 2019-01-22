const asciiPromise = require("asciify-image");

const options = {
    fit: "box",
    width: 31,
    height: 32,
    color: false
};

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("ascii", new class extends BaseCommand {
        async call(message, content) {
            const urls = [];
            const match = content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g);
            urls.push(...(match || []));
            for (const a of message.attachments.array()) {
                urls.push(a.url);
            }

            if (urls.length === 0) return;

            try {
                const ascii = await asciiPromise(urls[0], options);

                await message.channel.send("```\n" + ascii + "\n```");
            } catch (err) {
                await message.channel.send("Soooooooooooooooooooooooooomething went wrong");
            }
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Generates ascii art from an image")
            .setUsage("<?url>")
            .addParameterOptional("url", "Url to an image. Or add an attachment to your message"))
        .setCategory(Category.MISC);
};