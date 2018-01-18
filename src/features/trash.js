const SimpleCommand = require("../modules/SimpleCommand");

const command = new SimpleCommand({
    "!cider": "**🍺 A round of cider is distributed in the chat!**"
}, {
    usage: "`!cider` serve cider the chat cider",
    ignore: true
});

module.exports = command;
