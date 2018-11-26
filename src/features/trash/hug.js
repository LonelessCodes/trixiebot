const TextActionCommand = require("../../class/TextActionCommand");
const HelpContent = require("../../logic/commands/HelpContent");
const Category = require("../../logic/commands/Category");

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
    cr.register("hug", new TextActionCommand(hugs, "Hugging yourself? How about huggig someone you love!"))
        .setHelp(new HelpContent()
            .setDescription("hug someone!!!!!")
            .setUsage("<user mention> <?intensity>")
            .addParameter("user mention", "who you'd want to hug")
            .addParameterOptional("intensity", "how hard ya wanna hugg"))
        .setCategory(Category.ACTION);
    cr.registerAlias("hug", "hugs");
};