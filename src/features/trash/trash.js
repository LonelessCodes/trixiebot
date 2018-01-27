const SimpleCommand = require("../../class/SimpleCommand");

class TrashCommand extends SimpleCommand{
    get commands() {
        return {
            "!cider": "**🍺 A round of cider is distributed in the chat!**",
            "!donate": "👍 https://www.paypal.me/Loneless"
        };
    }
    get usage() {
        return "`!cider` serve cider the chat cider";
    }
}

module.exports = TrashCommand;
