const { timeout } = require("../../util/promises");

const SimpleCommand = require("../../core/commands/SimpleCommand");
const TreeCommand = require("../../core/commands/TreeCommand");
const CommandScope = require("../../util/commands/CommandScope");

module.exports = function install(cr) {
    // expand dong
    cr.registerCommand("expand", new TreeCommand)
        .dontList()
        .setScope(CommandScope.All)
        .registerSubCommand("dong", new SimpleCommand(async message => {
            let progress = 3;
            const dick = await message.channel.send(`8${new Array(progress).fill("=").join("")}D`);
            while (progress++ < 30) {
                await timeout(1000); // can't go faster because of rate limits
                await dick.edit(`8${new Array(progress).fill("=").join("")}D`);
            }
        }));
};
