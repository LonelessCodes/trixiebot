/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import CommandPermission from "./CommandPermission";
import Translation from "../../modules/i18n/Translation";

export default class Category {
    id: string;
    permissions: CommandPermission;
    name: Translation;

    constructor(id: string, permissions: CommandPermission, name: Translation) {
        this.id = id;
        this.permissions = permissions;
        this.name = name;
    }

    toString() {
        return this.name.phrase;
    }

    toTranslation() {
        return this.name;
    }

    // CATEGORIES

    static CONFIG = new Category("config", CommandPermission.ADMIN, new Translation("category.config", "Configuration"));
    static MODERATION = new Category("mod", CommandPermission.ADMIN, new Translation("category.moderation", "Moderation"));
    static AUDIO = new Category("audio", CommandPermission.USER, new Translation("category.audio", "Audio"));
    static ECONOMY = new Category("economy", CommandPermission.USER, new Translation("category.economy", "Economy"));
    static SOCIAL = new Category("social", CommandPermission.USER, new Translation("category.social", "Social"));
    static ACTION = new Category("action", CommandPermission.USER, new Translation("category.action", "Action"));
    static FUN = new Category("fun", CommandPermission.USER, new Translation("category.fun", "Fun"));
    static IMAGE = new Category("image", CommandPermission.USER, new Translation("category.image", "Image"));
    static INFO = new Category("info", CommandPermission.USER, new Translation("category.info", "Info"));
    static UTIL = new Category("util", CommandPermission.USER, new Translation("category.util", "Utility"));
    static TRIXIE = new Category("trixie", CommandPermission.USER, new Translation("category.trixie", "Trixie"));
    static OWNER = new Category("owner", CommandPermission.OWNER, new Translation("category.owner", "Owner"));

    static KEYWORD = new Category("keyword", CommandPermission.USER, new Translation("category.keyword", "Keyword"));

    static Category: typeof Category = Category;
}
