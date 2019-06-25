const asciiPromise = require("asciify-image");
const filetype = require("file-type");
const request = require("request");
const HelpBuilder = require("../logic/commands/HelpBuilder");

const options = {
    fit: "box",
    width: 31,
    height: 32,
    color: false
};

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    const ascii_cmd = new SimpleCommand(async (message, content, { command_name }) => {
        const urls = [];
        const match = content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g);
        urls.push(...(match || []));
        for (const a of message.attachments.array()) {
            urls.push(a.url);
        }

        if (urls.length === 0) {
            await HelpBuilder.sendHelp(message, command_name, ascii_cmd);
            return;
        }

        await new Promise((resolve, reject) => {
            const req = request(urls[0], { timeout: 5000, encoding: null }, (err, res, body) => {
                const type = filetype(body);

                if (!/jpg|png|gif/.test(type.ext)) {
                    return reject("The image must be JPG, PNG or GIF");
                }

                asciiPromise(body, options, async (err, ascii) => {
                    if (err) {
                        return reject("Soooooooooooooooooooooooooomething went wrong");
                    }

                    resolve("```\n" + ascii + "\n```");
                });
            });

            req.on("error", () => {
                req.destroy();
                return reject("Request failed");
            });
            req.on("response", res => {
                if (res.statusCode !== 200) {
                    res.destroy();
                    return reject("Request failed");
                }

                const header = res.headers["content-type"].split("/")[1];
                if (!header || !/jpg|jpeg|png|gif/.test(header)) {
                    res.destroy();
                    return reject("The image must be JPG, PNG or GIF");
                }
            });
        }).then(body =>
            message.channel.send(body)
        ).catch(err =>
            message.channel.send(err)
        );
    });

    cr.register("ascii", ascii_cmd)
        .setHelp(new HelpContent()
            .setDescription("Generates ascii art from an image")
            .setUsage("<?url>")
            .addParameterOptional("url", "Url to an image. Or add an attachment to your message"))
        .setCategory(Category.MISC);
};