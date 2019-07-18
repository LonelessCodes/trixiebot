const { timeout } = require("../../modules/util");

const SimpleCommand = require("../../class/SimpleCommand");
const TreeCommand = require("../../class/TreeCommand");

module.exports = async function install(cr) {
    // expand dong
    cr.registerCommand("expand", new TreeCommand).dontList().registerSubCommand("dong", new SimpleCommand(async message => {
        let progress = 3;
        const dick = await message.channel.send(`8${new Array(progress).fill("=").join("")}D`);
        while (progress++ < 30) {
            await timeout(1000); // can't go faster because of rate limits
            await dick.edit(`8${new Array(progress).fill("=").join("")}D`);
        }
    }));
};
