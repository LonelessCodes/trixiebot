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
/* eslint-disable brace-style */

const Translation = require("../i18n/Translation");

/**
 * @param {string} str
 * @returns {any}
 */
function getNamedArgs(str) {
    const match = str.match(/(\w+:\s*[^\s]+)/g);
    if (!match) return {};

    const res = {};
    for (let elem of match) {
        const [value, key] = elem.split(/:\s*/).reverse(); // reverse is important
        res[key] = value;
    }

    return res;
}

function findChannels(message, args_arr) {
    const args_str = args_arr.join(" ");
    const channels = message.mentions.channels;

    let def;
    let sfw;
    let nsfw;
    if (args_arr.length === 0) { // no channel given
        def = message.channel;
    } else if (args_arr.length === 1 && channels.size) { // default channel given
        def = channels.first();
    } else {
        let { sfw: a_sfw, nsfw: a_nsfw } = getNamedArgs(args_str);

        if (a_sfw === "none" && a_nsfw === "none") {
            return new Translation("alert.both_none", "`sfw` and `nsfw` can't both be `none`");
        }

        if (channels.size === 0) {
            // !alert <url> dsadsdsdsdsdasaddfdnghfg
            if (a_sfw !== "none" && a_nsfw !== "none") def = message.channel;
            // !alert <url> sfw:none
            else if (a_sfw === "none") nsfw = message.channel;
            // !alert <url> nsfw:none
            else if (a_nsfw === "none") sfw = message.channel;
        } else {
            if (typeof a_sfw === "string" && a_sfw !== "none") a_sfw = a_sfw.slice(2, -1);
            if (typeof a_nsfw === "string" && a_nsfw !== "none") a_nsfw = a_nsfw.slice(2, -1);

            if (a_sfw && channels.has(a_sfw)) {
                sfw = channels.get(a_sfw); channels.delete(a_sfw);
            }
            if (a_nsfw && channels.has(a_nsfw)) {
                nsfw = channels.get(a_nsfw); channels.delete(a_nsfw);
            }

            // !alert <url> sfw:#ch or nsfw:#ch
            // if (channels.size === 0)
            // else
            // !alert <url> #ch ...
            if (channels.size > 0) {
                if (!sfw && !nsfw) {
                    // !alert <url> #ch sfw:none
                    if (a_sfw === "none") nsfw = channels.first();
                    // !alert <url> #ch nsfw:none
                    else if (a_nsfw === "none") sfw = channels.first();
                    // !alert <url> #ch
                    else def = channels.first();
                }
                // !alert <url> #ch sfw:#ch
                else if (sfw && !nsfw) {
                    if (!a_nsfw) nsfw = channels.first();
                }
                // !alert <url> #ch nsfw:#ch
                else if (!sfw && nsfw) {
                    if (!a_sfw) sfw = channels.first();
                }
                // !alert <url> #ch sfw:#ch nsfw:#ch
                // else
            }
        }
    }

    return { def, sfw, nsfw };
}

module.exports = {
    getNamedArgs,
    findChannels,
};
