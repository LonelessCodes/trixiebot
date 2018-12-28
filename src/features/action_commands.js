const TextActionCommand = require("../class/TextActionCommand");

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
    "(づ￣ ³￣)づ{{user}} ⊂(´・ω・｀⊂)"
];

module.exports = async function install(cr) {
    cr.register("hug", new TextActionCommand("Hug someone!!!", hugs, "Hugging yourself? How about huggig someone you love!"))
        .setAllowEveryone(true);
    cr.registerAlias("hug", "hugs");

    cr.register("pat", new TextActionCommand("*patpat*", "*patpats {{user}}*", "Aww, take a pat <3"))
        .setAllowEveryone(true);

    cr.register("kiss", new TextActionCommand("Kiss someone -3-", [
        "( ˘ ³˘){{user}}",
        "（*＾3＾）{{user}}",
        "(╯3╰){{user}}",
        "（๑・౩・๑）{{user}}",
        "(*´･з･){{user}}",
        "(〃ﾟ3ﾟ〃){{user}}",
        "～(^з^)-♡{{user}}",
        "*kisses {{user}}*"
    ], "Aww, *kisses*"))
        .setAllowEveryone(true);

    cr.register("touch", new TextActionCommand("Touch someone o.o\"", [
        "{{user}}ԅ(‾⌣‾ԅ)",
        "{{user}}ԅ╏ ˵ ⊚ ◡ ⊚ ˵ ╏┐",
        "(¬_¬”)-cԅ(‾⌣‾ԅ)",
        "{{user}}ԅ( ˘ω˘ ԅ)",
        "{{user}}ԅ(≖‿≖ ;ԅ)",
        "{{user}}ԅ(‹o›Д‹o›ԅ)"
    ], "Aww, *kisses*"))
        .setAllowEveryone(true);

    cr.register("point", new TextActionCommand("Point at someone", [
        "(☞ﾟ∀ﾟ)☞ {{user}}",
        "( ´థ౪థ)σ’`ﾞ {{user}}",
        "┗(•ˇ_ˇ•)―→ {{user}}",
        "〈(•ˇ‿ˇ•)-→ {{user}}",
        "（☞´^ิ∀^ิ｀）☞ {{user}}",
        "(╭☞´ิ∀´ิ)╭☞ {{user}}",
        "(╭☞•́⍛•̀)╭☞ {{user}}",
        "(☞^o^) ☞ {{user}}",
        "☞๏็ັཪ๏็๎☞ {{user}}",
        "( ━☞´◔‿ゝ◔`)━☞ {{user}}",
        "(☞三☞ ఠ ਉ ఠ))☞三☞ {{user}}"
    ], ">:3 *points at u*"))
        .setAllowEveryone(true);

    cr.register("poke", new TextActionCommand("Poke poke", "*pokes {{user}}*", "Aww, *pokes you* :eyes:"))
        .setAllowEveryone(true);

    cr.register("slap", new TextActionCommand("Slap someone real dirty >:c", "*slaps {{user}}*", "Hmm, why do you want this? Uh, I guess... *slaps you*"))
        .setAllowEveryone(true);

    cr.register("bite", new TextActionCommand("Ouchie! Bite someone", "*bites {{user}}* :eyes:", "*bites you*"))
        .setAllowEveryone(true);

    cr.register("lick", new TextActionCommand("Lick someone clean!", "*licks {{user}}* :heart:", "*licks you*"))
        .setAllowEveryone(true)
        .setExplicit(true);

    cr.register("tickle", new TextActionCommand("Nuuuu I'm so ticklish!!!! >~<\nTickle someone", "*tickles {{user}}*", "*tickles you*"))
        .setAllowEveryone(true);

    cr.register("smile", new TextActionCommand("Smile at someone", "*smiles at {{user}}* :heart:", "*smiles at you*"))
        .setAllowEveryone(true);

    cr.register("stare", new TextActionCommand("Stare at someone :eyes:", "*stares at {{user}}* :eyes:", "*stares at you*"))
        .setAllowEveryone(true);

    cr.register("holdhands", new TextActionCommand("Hold hands with a cutie", "*holding {{user}}'s hand* :heart:", "*holding your hand*"))
        .setAllowEveryone(true);

    cr.register("cuddle", new TextActionCommand("Cuddle someone and give them a warm feeling", "*cuddles {{user}}* :heart:", "*cuddles you*"))
        .setAllowEveryone(true);

    cr.register("snuggle", new TextActionCommand("Snuggle someone and die from the cuteness!!! >3<", "*snuggles {{user}}* :heart:", "*snuggles you*"))
        .setAllowEveryone(true);

    cr.register("nuzzle", new TextActionCommand("Nuzzle someone", "*nuzzles {{user}}*", "*nuzzles you*"))
        .setAllowEveryone(true);

    cr.register("nom", new TextActionCommand("nomnom someone", "*nomnoms {{user}}*", "*nomnoms you*"))
        .setAllowEveryone(true);
    cr.registerAlias("nom", "nomnom");
};