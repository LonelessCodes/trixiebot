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
        .setHelp(new HelpContent().setDescription("Get a random ASCII face"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
    cr.registerCommand("lenny", new TextCommand(faces[0]))
        .setHelp(new HelpContent().setDescription("( ͡° ͜ʖ ͡°)"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);
    cr.registerCommand("shrug", new TextCommand(faces[1]))
        .setHelp(new HelpContent().setDescription("¯\\_(ツ)_/¯"))
        .setCategory(Category.MISC)
        .setScope(CommandScope.ALL);

    cr.registerCommand("tableflip", new TextCommand("(╯°□°）╯︵ ┻━┻"))
        .setHelp(new HelpContent().setDescription("(╯°□°）╯︵ Tableflip"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
    cr.registerAlias("tableflip", "tf");
    cr.registerCommand("untableflip", new TextCommand("┬─┬ ノ( ゜-゜ノ)"))
        .setHelp(new HelpContent().setDescription("That's right, put it back where it was ノ( ゜-゜ノ)"))
        .setCategory(Category.ACTION)
        .setScope(CommandScope.ALL);
    cr.registerAlias("untableflip", "utf");
};
