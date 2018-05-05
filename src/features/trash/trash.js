const SimpleCommand = require("../../class/SimpleCommand");

class TrashCommand extends SimpleCommand {
    get commands() {
        return {
            "cider": async message => "**🍺 " + await message.channel.translate("A round of cider is distributed in the chat!") + "**",
            "donate": "👍 https://www.paypal.me/Loneless"
        };
    }
    usage(prefix) {
        return `\`${prefix}cider\` serve cider the chat cider`;
    }
}

module.exports = TrashCommand;
