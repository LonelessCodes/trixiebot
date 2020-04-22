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

// eslint-disable-next-line no-unused-vars
const { Guild } = require("discord.js");
const PaginatorAction = require("./PaginatorAction");
const TranslationMerge = require("../../modules/i18n/TranslationMerge").default;

class PaginatorGuildAction extends PaginatorAction {
    /**
     * @param {string|Resolvable} title The title of the embed
     * @param {string|Resolvable} content The message text
     * @param {(string|Resolvable)[]} items The items to show
     * @param {User} user The user object of the instantiator
     * @param {Guild} guild The guild object of the instantiator
     * @param {Object} [opts] Options for the paginator
     * @param {number} [opts.items_per_page] Max items per page
     * @param {number} [opts.timeout] Time to wait for interactions before destroying Paginator
     * @param {boolean} [opts.show_page_numbers] Wether to show page numbers
     * @param {boolean} [opts.wrap_page_ends] Wether should wrap around back to the first page if clicking "next" on last page
     * @param {boolean} [opts.number_items] Wether to number the items
     * @param {[(string|Resolvable), (string|Resolvable)]} [opts.prefix_suffix] What to prefix and or suffix to the list of each page
     */
    constructor(title, content, items, user, guild, opts = {}) {
        super(title, content, items, user, opts);

        this.guild = guild;
    }

    renderHeader() {
        const guild_header = this.guild.name;
        const author_icon = this.guild.iconURL({ size: 32, dynamic: true });
        if (this.title && this.title !== "") {
            return [new TranslationMerge(guild_header, "|", this.title), author_icon];
        } else {
            return [guild_header, author_icon];
        }
    }
}

module.exports = PaginatorGuildAction;
