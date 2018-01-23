const log = require("../modules/log");
const Command = require("../class/Command");

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

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
    "(ó ì_í)=óò=(ì_í ò)",
    "°Д°",
    "( ﾟヮﾟ)",
    "┬─┬﻿ ︵ /(.□. ）",
    "٩◔̯◔۶",
    "≧☉_☉≦",
    "☼.☼",
    "^̮^",
    "(>人<)",
    "〆(・∀・＠)",
    "(~_^)",
    "^̮^",
    "^̮^",
    ">_>",
    "(^̮^)",
    "(/) (°,,°) (/)",
    "^̮^",
    "^̮^",
    "=U",
    "(･.◤)"
];

const command = new Command(async function onmessage(message) {
    if (/^\!face\b/i.test(message.content)) {
        const face = faces.random();
        await message.channel.send(face);
        log(`Requested random face. Given ${face}`);
    }
    else if (/^\!lenny\b/i.test(message.content)) {
        await message.channel.send(faces[0]);
        log("Requested lenny emoticon");
    }
    else if (/^\!shrug\b/i.test(message.content)) {
        await message.channel.send(faces[1]);
        log("Requested shrug emoticon");
    }
}, {
    usage: "`!face` returns a random ASCII face",
    ignore: true
});

module.exports = command;
