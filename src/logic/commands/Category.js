const CommandPermission = require("./CommandPermission");

class Category {
    constructor(permissions, name) {
        this.permissions = permissions;
        this.name = name;
    }

    toString() {
        return this.name;
    }
}

module.exports = Object.freeze({
    ANALYSIS: new Category(CommandPermission.USER, "Analysis"),
    ACTION: new Category(CommandPermission.USER, "Action"),
    TEXT: new Category(CommandPermission.USER, "Text"),
    AUDIO: new Category(CommandPermission.USER, "Audio"),
    CURRENCY: new Category(CommandPermission.USER, "Currency"),
    GAMES: new Category(CommandPermission.USER, "Games"),
    IMAGE: new Category(CommandPermission.USER, "Image"),
    FUN: new Category(CommandPermission.USER, "Fun"),
    MODERATION: new Category(CommandPermission.ADMIN, "Moderation"),
    OWNER: new Category(CommandPermission.OWNER, "Owner"),
    INFO: new Category(CommandPermission.USER, "Info"),
    UTILS: new Category(CommandPermission.USER, "Utility"),
    MISC: new Category(CommandPermission.USER, "Misc")
});