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

const { randomItem } = require("../../util/array");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const TextCommand = require("../../core/commands/TextCommand");
const HelpContent = require("../../util/commands/HelpContent");
const Category = require("../../util/commands/Category");
const CommandScope = require("../../util/commands/CommandScope");

const faces = [
    "( ͡° ͜ʖ ͡°)",
    "¯\\_(ツ)_/¯",
    "̿̿ ̿̿ ̿̿ ̿'̿'\\̵͇̿̿\\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿",
    "▄︻̷̿┻̿═━一",
    "( ͡°( ͡° ͜ʖ( ͡° ͜ʖ ͡°)ʖ ͡°) ͡°)",
    "ʕ•ᴥ•ʔ",
    "(▀̿Ĺ̯▀̿ ̿)",
    "(ง ͠° ͟ل͜ ͡°)ง",
    "༼ つ ◕_◕ ༽つ",
    "ಠ_ಠ",
    "(づ｡◕‿‿◕｡)づ",
    "̿'̿'\\̵͇̿̿\\з=( ͠° ͟ʖ ͡°)=ε/̵͇̿̿/'̿̿ ̿ ̿ ̿ ̿ ̿",
    "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ ✧ﾟ･: *ヽ(◕ヮ◕ヽ)",
    "[̲̅$̲̅(̲̅5̲̅)̲̅$̲̅]",
    "┬┴┬┴┤ ͜ʖ ͡°) ├┬┴┬┴",
    "( ͡°╭͜ʖ╮͡° )",
    "(͡ ͡° ͜ つ ͡͡°)",
    "(• ε •)",
    "(ง'̀-'́)ง",
    "(ಥ﹏ಥ)",
    "﴾͡๏̯͡๏﴿ O'RLY?",
    "(ノಠ益ಠ)ノ彡┻━┻",
    "[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]",
    "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "(☞ﾟ∀ﾟ)☞",
    "| (• ◡•)| (❍ᴥ❍ʋ)",
    "(◕‿◕✿)",
    "(ᵔᴥᵔ)",
    "(╯°□°)╯︵ ʞooqǝɔɐɟ",
    "(¬‿¬)",
    "(☞ﾟヮﾟ)☞ ☜(ﾟヮﾟ☜)",
    "(づ￣ ³￣)づ",
    "ლ(ಠ益ಠლ)",
    "ಠ╭╮ಠ",
    "̿ ̿ ̿'̿'\\̵͇̿̿\\з=(•_•)=ε/̵͇̿̿/'̿'̿ ̿",
    "/╲/\\╭( ͡° ͡° ͜ʖ ͡° ͡°)╮/\\╱\\",
    "(;´༎ຶД༎ຶ`)",
    "♪~ ᕕ(ᐛ)ᕗ",
    "♥‿♥",
    "༼ つ  ͡° ͜ʖ ͡° ༽つ",
    "༼ つ ಥ_ಥ ༽つ",
    "(╯°□°）╯︵ ┻━┻",
    "( ͡ᵔ ͜ʖ ͡ᵔ )",
    "ヾ(⌐■_■)ノ♪",
    "~(˘▾˘~)",
    "◉_◉",
    "\\ (•◡•) /",
    "(~˘▾˘)~",
    "(._.) ( l: ) ( .-. ) ( :l ) (._.)",
    "༼ʘ̚ل͜ʘ̚༽",
    "༼ ºل͟º ༼ ºل͟º ༼ ºل͟º ༽ ºل͟º ༽ ºل͟º ༽",
    "┬┴┬┴┤(･_├┬┴┬┴",
    "ᕙ(⇀‸↼‶)ᕗ",
    "ᕦ(ò_óˇ)ᕤ",
    "┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻",
    "⚆ _ ⚆",
    "(•_•) ( •_•)>⌐■-■ (⌐■_■)",
    "(｡◕‿‿◕｡)",
    "ಥ_ಥ",
    "ヽ༼ຈل͜ຈ༽ﾉ",
    "⌐╦╦═─",
    "(☞ຈل͜ຈ)☞",
    "˙ ͜ʟ˙",
    "☜(˚▽˚)☞",
    "(•ω•)",
    "(ง°ل͜°)ง",
    "(｡◕‿◕｡)",
    "（╯°□°）╯︵( .o.)",
    ":')",
    "┬──┬ ノ( ゜-゜ノ)",
    "(っ˘ڡ˘ς)",
    "ಠ⌣ಠ",
    "ლ(´ڡ`ლ)",
    "(°ロ°)☝",
    "｡◕‿‿◕｡",
    "( ಠ ͜ʖರೃ)",
    "╚(ಠ_ಠ)=┐",
    "(─‿‿─)",
    "ƪ(˘⌣˘)ʃ",
    "(；一_一)",
    "(¬_¬)",
    "( ⚆ _ ⚆ )",
    "(ʘᗩʘ')",
    "☜(⌒▽⌒)☞",
    "｡◕‿◕｡",
    "¯\\(°_o)/¯",
    "(ʘ‿ʘ)",
    "ლ,ᔑ•ﺪ͟͠•ᔐ.ლ",
    "(´・ω・`)",
    "ಠ~ಠ",
    "(° ͡ ͜ ͡ʖ ͡ °)",
    "┬─┬ノ( º _ ºノ)",
    "(´・ω・)っ由",
    "ಠ_ಥ",
    "Ƹ̵̡Ӝ̵̨̄Ʒ",
    "(>ლ)",
    "ಠ‿↼",
    "ʘ‿ʘ",
    "(ღ˘⌣˘ღ)",
    "ಠoಠ",
    "ರ_ರ",
    "(▰˘◡˘▰)",
    "◔̯◔",
    "◔ ⌣ ◔",
    "(✿´‿`)",
    "¬_¬",
    "ب_ب",
    "｡゜(｀Д´)゜｡",
    "°Д°",
    "( ﾟヮﾟ)",
    "┬─┬﻿ ︵ /(.□. ）",
    "٩◔̯◔۶",
    "≧☉_☉≦",
    "☼.☼",
    "(>人<)",
    "〆(・∀・＠)",
    "(~_^)",
    ">_>",
    "(/) (°,,°) (/)",
    "^̮^",
    "=U",
];

module.exports = function install(cr) {
    cr.registerCommand("face", new SimpleCommand(() => randomItem(faces)))
        .setHelp(new HelpContent().setUsage("", "Get a random ASCII face"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
    cr.registerCommand("lenny", new TextCommand(faces[0]))
        .setHelp(new HelpContent().setUsage("", "( ͡° ͜ʖ ͡°)"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);
    cr.registerCommand("shrug", new TextCommand(faces[1]))
        .setHelp(new HelpContent().setUsage("", "¯\\_(ツ)_/¯"))
        .setCategory(Category.FUN)
        .setScope(CommandScope.ALL);

    cr.registerCommand("tableflip", new TextCommand("(╯°□°）╯︵ ┻━┻"))
        .setHelp(new HelpContent().setUsage("", "(╯°□°）╯︵ Tableflip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
    cr.registerAlias("tableflip", "tf");
    cr.registerCommand("untableflip", new TextCommand("┬─┬ ノ( ゜-゜ノ)"))
        .setHelp(new HelpContent().setUsage("", "That's right, put it back where it was ノ( ゜-゜ノ)"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
    cr.registerAlias("untableflip", "utf");
};
