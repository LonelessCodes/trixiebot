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
    // Messages analysis
    ANALYSIS: new Category(CommandPermission.USER, "Analysis"),

    // Actions with other users
    ACTION: new Category(CommandPermission.USER, "Action"),

    // Text transformation and translation
    TEXT: new Category(CommandPermission.USER, "Text"),

    // Stuff with audio
    AUDIO: new Category(CommandPermission.USER, "Audio"),

    // Currency system and stuff
    CURRENCY: new Category(CommandPermission.USER, "Currency"),

    // Games you can play with trixie
    GAMES: new Category(CommandPermission.USER, "Games"),

    // Image generation and look up
    IMAGE: new Category(CommandPermission.USER, "Image"),
    FUN: new Category(CommandPermission.USER, "Fun"),

    // Info commands about the bot or the server
    INFO: new Category(CommandPermission.USER, "Info"),


    UTILS: new Category(CommandPermission.USER, "Utility"),
    MISC: new Category(CommandPermission.USER, "Misc"),

    // Any mlp related commands
    MLP: new Category(CommandPermission.USER, "My Little Pony"),

    // Server moderation and administration
    MODERATION: new Category(CommandPermission.ADMIN, "Moderation"),

    // Owner only commands
    OWNER: new Category(CommandPermission.OWNER, "Owner"),

    Category,
});
