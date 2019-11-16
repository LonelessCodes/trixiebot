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
const Translation = require("../../modules/i18n/Translation");

class Category {
    /**
     * @param {CommandPermission} permissions
     * @param {Translation} name
     */
    constructor(permissions, name) {
        this.permissions = permissions;
        this.name = name;
    }

    toString() {
        return this.name.phrase;
    }

    toTranslation() {
        return this.name;
    }
}

module.exports = Object.freeze({
    CONFIG: new Category(CommandPermission.ADMIN, new Translation("category.config", "Configuration")),
    MODERATION: new Category(CommandPermission.ADMIN, new Translation("category.moderation", "Moderation")),
    AUDIO: new Category(CommandPermission.USER, new Translation("category.audio", "Audio")),
    ECONOMY: new Category(CommandPermission.USER, new Translation("category.economy", "Economy")),
    SOCIAL: new Category(CommandPermission.USER, new Translation("category.social", "Social")),
    ACTION: new Category(CommandPermission.USER, new Translation("category.action", "Action")),
    FUN: new Category(CommandPermission.USER, new Translation("category.fun", "Fun")),
    IMAGE: new Category(CommandPermission.USER, new Translation("category.image", "Image")),
    INFO: new Category(CommandPermission.USER, new Translation("category.info", "Info")),
    UTIL: new Category(CommandPermission.USER, new Translation("category.util", "Utility")),
    TRIXIE: new Category(CommandPermission.USER, new Translation("category.trixie", "Trixie")),
    OWNER: new Category(CommandPermission.OWNER, new Translation("category.owner", "Owner")),

    Category,
});
