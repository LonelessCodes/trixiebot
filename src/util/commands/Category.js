/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const CommandPermission = require("./CommandPermission");

class Category {
    /**
     * @param {CommandPermission} permissions
     * @param {string} name
     */
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
