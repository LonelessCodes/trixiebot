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
    // messages analysis 
    ANALYSIS: new Category(CommandPermission.USER, "Analysis"),

    // actions with other users
    ACTION: new Category(CommandPermission.USER, "Action"),

    // text transformation and translation
    TEXT: new Category(CommandPermission.USER, "Text"),

    // stuff with audio
    AUDIO: new Category(CommandPermission.USER, "Audio"),

    // currency system and stuff
    CURRENCY: new Category(CommandPermission.USER, "Currency"),

    // games you can play with trixie
    GAMES: new Category(CommandPermission.USER, "Games"),

    // image generation and look up
    IMAGE: new Category(CommandPermission.USER, "Image"),
    FUN: new Category(CommandPermission.USER, "Fun"),

    // info commands about the bot or the server
    INFO: new Category(CommandPermission.USER, "Info"),

    
    UTILS: new Category(CommandPermission.USER, "Utility"),
    MISC: new Category(CommandPermission.USER, "Misc"),

    // any mlp related commands
    MLP: new Category(CommandPermission.USER, "My Little Pony"),

    // server moderation and administration
    MODERATION: new Category(CommandPermission.ADMIN, "Moderation"),

    // owner only commands
    OWNER: new Category(CommandPermission.OWNER, "Owner"),

    Category
});