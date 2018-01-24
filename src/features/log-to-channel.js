const { resolveStdout } = require("../modules/util");
const Command = require("../class/Command");

function hook_stdout(callback) {
    const old_write = process.stdout.write;

    process.stdout.write = (function writeSetup(write) {
        return function writeFunc(string, encoding, fd) {
            write.apply(process.stdout, arguments);
            callback(string, encoding, fd);
        };
    })(process.stdout.write);

    return function removeCustomLogic() {
        process.stdout.write = old_write;
    };
}

const command = new Command(null, async function init(client) {
    const channel = client.guilds.get("397369538196406273").channels.get("405775427722936321");

    channel.send("`--------------------`");

    hook_stdout(function onlog(string) {
        channel.send(`\`${resolveStdout(string)}\``);
    });
});

module.exports = command;
