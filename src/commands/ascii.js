/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const asciiPromise = require("asciify-image");
const filetype = require("file-type");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const HelpBuilder = require("../util/commands/HelpBuilder");

const options = {
    fit: "box",
    width: 31,
    height: 32,
    color: false,
};

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation");

module.exports = function install(cr) {
    const ascii_cmd = new SimpleCommand(async ({ message, content, ctx }, command_name) => {
        const urls = [];
        const match = content.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g);
        urls.push(...(match || []));
        for (const a of message.attachments.array()) {
            urls.push(a.url);
        }

        if (urls.length === 0) {
            await HelpBuilder.sendHelp(ctx, command_name, ascii_cmd);
            return;
        }

        const controller = new AbortController();

        return await fetch(urls[0], { timeout: 6000, size: 1024 * 1024 * 8, signal: controller.signal })
            .catch(() => { throw new Translation("ascii.failed_dl", "Couldn't download image"); })
            .then(res => {
                if (!res.ok) throw new Translation("ascii.doesnt_exist", "Image doesn't exist");

                const header = res.headers.get("content-type").split("/")[1];
                if (!header || !/jpg|jpeg|png|gif/.test(header)) throw new Translation("ascii.invalid_type", "The image must be JPG, PNG or GIF");

                return res.buffer();
            })
            .then(async body => {
                const minimumBytes = 4100;
                const type = await filetype.fromBuffer(body.slice(0, minimumBytes));
                if (!type || !/jpg|png|gif/.test(type.ext)) throw new Translation("ascii.invalid_type", "The image must be JPG, PNG or GIF");
                return body;
            })
            .then(async body => {
                try {
                    return await asciiPromise(body, options);
                } catch (e) {
                    throw new Translation("ascii.error", "Soooooooooooooooooooooooooomething went wrong");
                }
            })
            .then(ascii => "```\n" + ascii + "\n```")
            .catch(err => {
                controller.abort();
                if (err.name === "AbortError" || err.name === "FetchError") return new Translation("ascii.failed_dl", "Couldn't download image");
                if (err instanceof Translation) return err;
                return err.message;
            });
    });

    cr.registerCommand("ascii", ascii_cmd)
        .setHelp(new HelpContent()
            .setUsage("<?url>", "Generates ascii art from an image")
            .addParameterOptional("url", "Url to an image. Or add an attachment to your message"))
        .setCategory(Category.UTIL)
        .setScope(CommandScope.ALL);
};
