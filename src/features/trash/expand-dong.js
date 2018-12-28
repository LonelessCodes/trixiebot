const { timeout } = require("../../modules/util");

const BaseCommand = require("../../class/BaseCommand");
const TreeCommand = require("../../class/TreeCommand");

module.exports = async function install(cr) {
    // expand dong
    cr.register("expand", new TreeCommand).dontList().registerSubCommand("dong", new class extends BaseCommand {
        async call(message) {
            let progress = 3;
            const dick = await message.channel.send(`8${new Array(progress).fill("=").join("")}D`);
            while (progress++ < 30) {
                await timeout(1000); // can't go faster because of rate limits
                await dick.edit(`8${new Array(progress).fill("=").join("")}D`);
            }
        }
    });
};
