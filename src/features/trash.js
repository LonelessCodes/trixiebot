const SimpleCommand = require("../class/SimpleCommand");

const command = new SimpleCommand({
    "!cider": "**🍺 A round of cider is distributed in the chat!**",
    "!donate": "👍 https://www.paypal.me/Loneless"
}, {
    usage: "`!cider` serve cider the chat cider",
    ignore: true
});

module.exports = command;
