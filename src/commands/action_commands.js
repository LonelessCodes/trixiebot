/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

const TextActionCommand = require("../core/commands/TextActionCommand");
const Translation = require("../modules/i18n/Translation").default;

const hugs = [
    "(っ´▽｀)っ{{user}}",
    "(っ´▽｀)っ{{user}}",
    "(つˆ⌣ˆ)つ{{user}}",
    "(つˆ⌣ˆ)つ{{user}}",
    "╰(´︶`)╯{{user}}",
    "(⊃｡•́‿•̀｡)⊃{{user}}",
    "(づ｡◕‿‿◕｡)づ{{user}}",
    "(つ≧▽≦)つ{{user}}",
    "(つ≧▽≦)つ{{user}}",
    "(づ￣ ³￣)づ{{user}} ⊂(´・ω・｀⊂)",
];

module.exports = function install(cr) {
    cr.registerCommand("hug", new TextActionCommand(
        "Hug someone!!!", hugs,
        new Translation("action.hug.self", "Hugging yourself? How about huggig someone you love!")
    )).setAllowEveryone(true);
    cr.registerAlias("hug", "hugs");

    cr.registerCommand("kiss", new TextActionCommand("Kiss someone -3-", [
        "( ˘ ³˘){{user}}",
        "（*＾3＾）{{user}}",
        "(╯3╰){{user}}",
        "（๑・౩・๑）{{user}}",
        "(*´･з･){{user}}",
        "(〃ﾟ3ﾟ〃){{user}}",
        "～(^з^)-♡{{user}}",
        "*kisses {{user}}*",
    ], new Translation("action.kiss.self", "Aww, *kisses*")))
        .setAllowEveryone(true);

    cr.registerCommand("slap", new TextActionCommand("Slap someone real dirty >:c", "*slaps {{user}}*", "Hmm, why do you want this? Uh, I guess... *slaps you*"))
        .setAllowEveryone(true);
};
