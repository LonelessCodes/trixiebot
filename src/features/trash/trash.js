const SimpleCommand = require("../../class/SimpleCommand");

class TrashCommand extends SimpleCommand {
    get commands() {
        return {
            "cider": async message => {
                return "**🍺 " + await message.channel.translate("A round of cider is distributed in the chat!") + "**";
            }
        };
    }
    usage(prefix) {
        return `\`${prefix}cider\` serve cider the chat cider`;
    }
}

module.exports = TrashCommand;
