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

const { userToString } = require("../../util/util");
const CONST = require("../../const");
const events = require("events");
// eslint-disable-next-line no-unused-vars
const I18nLocale = require("../../modules/i18n/I18nLocale");
const Resolvable = require("../../modules/i18n/Resolvable");
const Translation = require("../../modules/i18n/Translation");
const TranslationEmbed = require("../../modules/i18n/TranslationEmbed");
const TranslationMerge = require("../../modules/i18n/TranslationMerge");
// eslint-disable-next-line no-unused-vars
const { User, TextChannel, Message, MessageReaction, Permissions } = require("discord.js");

class PaginatorAction extends events.EventEmitter {
    /**
     * @param {string|Resolvable} title The title of the embed
     * @param {string|Resolvable} content The message text
     * @param {(string|Resolvable)[]} items The items to show
     * @param {User} user The user object of the instantiator
     * @param {Object} [opts] Options for the paginator
     * @param {number} [opts.items_per_page] Max items per page
     * @param {number} [opts.timeout] Time to wait for interactions before destroying Paginator
     * @param {boolean} [opts.show_page_numbers] Wether to show page numbers
     * @param {boolean} [opts.wrap_page_ends] Wether should wrap around back to the first page if clicking "next" on last page
     * @param {boolean} [opts.number_items] Wether to number the items
     * @param {[(string|Resolvable), (string|Resolvable)]} [opts.prefix_suffix] What to prefix and or suffix to the list of each page
     */
    constructor(title, content, items, user, {
        items_per_page = 15,
        timeout = 60000,
        show_page_numbers = true,
        wrap_page_ends = true,
        number_items = false,
        prefix_suffix = ["", ""],
    } = {}) {
        super();

        this.title = title;
        this.content = content;
        this.total_items = items.length;
        this.strings = items;
        this.user = user;
        this.items_per_page = items_per_page;
        this.timeout = timeout;
        this.show_page_numbers = show_page_numbers;
        this.page_count = Math.ceil(this.total_items / this.items_per_page);
        this.wrap_page_ends = wrap_page_ends;
        this.number_items = number_items;
        this.prefix_suffix = [prefix_suffix[0] || "", prefix_suffix[1] || ""];
    }

    /**
     * Begins pagination on page 1 as a new Message in the provided TextChannel
     * @param {TextChannel} channel The channel to render the Paginator in
     * @param {I18nLocale} translator The translator object to build the messages
     * @returns {Promise<Message>}
     */
    async display(channel, translator) {
        return await this.paginate(channel, translator, 1);
    }

    /**
     * @param {TextChannel} channel
     * @param {I18nLocale} translator
     * @param {number} page_num
     * @returns {Promise<Message>}
     */
    async paginate(channel, translator, page_num) {
        if (page_num < 1)
            page_num = 1;
        else if (page_num > this.page_count)
            page_num = this.page_count;

        const page = this.renderPage(page_num).map(elem => Resolvable.resolve(elem, translator));
        return await this.initialize(await channel.send(...page), translator, page_num);
    }

    /**
     * @param {Message} message
     * @param {I18nLocale} translator
     * @param {number} page_num
     * @returns {Promise<Message>}
     */
    async initialize(message, translator, page_num) {
        if (this.page_count > 1) {
            await message.react(PaginatorAction.LEFT);
            await message.react(PaginatorAction.STOP);
            await message.react(PaginatorAction.RIGHT);
            this.pagination(message, translator, page_num);
        } else {
            await message.react(PaginatorAction.STOP);
            this.pagination(message, translator, page_num);
        }

        return message;
    }

    /**
     * @param {Message} message
     * @param {I18nLocale} translator
     * @param {number} page_num
     */
    pagination(message, translator, page_num) {
        const collector = message.createReactionCollector(
            (reaction, user) => this.checkReaction(reaction, user),
            { time: this.timeout, max: 1 }
        );

        collector.on("end", (collected, reason) => {
            if (reason === "time" || collected.size === 0) return this.end(message);

            this.handleMessageReactionAddAction(collected.first(), message, translator, page_num);
        });
    }

    /**
     * @param {MessageReaction} reaction
     * @param {User} user
     * @returns {boolean}
     */
    checkReaction(reaction, user) {
        if (user.id !== this.user.id) return false;

        switch (reaction.emoji.name) {
            case PaginatorAction.LEFT:
            case PaginatorAction.STOP:
            case PaginatorAction.RIGHT:
                break;
            default:
                return false;
        }

        return true;
    }

    /**
     * @param {MessageReaction} reaction
     * @param {Message} message
     * @param {I18nLocale} translator
     * @param {number} page_num
     */
    async handleMessageReactionAddAction(reaction, message, translator, page_num) {
        let new_page_num = page_num;
        switch (reaction.emoji.name) {
            case PaginatorAction.LEFT:
                if (new_page_num === 1 && this.wrap_page_ends)
                    new_page_num = this.page_count + 1;
                if (new_page_num > 1)
                    new_page_num--;
                break;
            case PaginatorAction.RIGHT:
                if (new_page_num === this.page_count && this.wrap_page_ends)
                    new_page_num = 0;
                if (new_page_num < this.page_count)
                    new_page_num++;
                break;
            case PaginatorAction.STOP:
                await this.end(message);
                return;
        }

        try {
            if (message.channel.permissionsFor(message.guild.me).has(Permissions.FLAGS.MANAGE_MESSAGES))
                reaction.users.remove(this.user);
        } catch (_) { _; }

        const msg = this.renderPage(new_page_num).map(elem => Resolvable.resolve(elem, translator));
        this.pagination(await message.edit(...msg), translator, new_page_num);
    }

    renderHeader() {
        const user_header = userToString(this.user, true);
        const author_icon = this.user.avatarURL({ size: 32, dynamic: true });
        if (this.title && this.title !== "") {
            return [new TranslationMerge(user_header, "|", this.title), author_icon];
        } else {
            return [user_header, author_icon];
        }
    }

    renderPage(page_num) {
        const embed = new TranslationEmbed().setColor(CONST.COLOR.PRIMARY);

        embed.setAuthor(...this.renderHeader());

        const start = (page_num - 1) * this.items_per_page;
        const end = this.strings.length < page_num * this.items_per_page ?
            this.strings.length :
            page_num * this.items_per_page;

        const rows = new TranslationMerge(this.prefix_suffix[0]);
        for (let i = start; i < end; i++) {
            let str = "";
            if (this.number_items) str += "`" + (i + 1) + ".` ";
            str += this.strings[i] + "\n";
            rows.push(str);
        }
        rows.push(this.prefix_suffix[1]);
        embed.setDescription(rows.separator("\n"));

        if (this.show_page_numbers) embed.setFooter(new Translation(
            "paginator.page", "Page {{page}}", { page: `${page_num}/${this.page_count}` }
        ));

        return [
            this.content,
            embed,
        ];
    }

    /**
     * @param {Message} message
     */
    async end(message) {
        await message.reactions.removeAll().catch(() => { /* Do nothing */ });
        this.emit("end", message);
    }
}

// ◀ ⏹ ▶
PaginatorAction.LEFT = "◀";
PaginatorAction.STOP = "⏹";
PaginatorAction.RIGHT = "▶";

module.exports = PaginatorAction;
