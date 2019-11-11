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

const { userToString } = require("../util");
const CONST = require("../../const");
const Events = require("events");
// eslint-disable-next-line no-unused-vars
const { User, Guild, TextChannel, Message, MessageReaction, RichEmbed, Permissions } = require("discord.js");

class Paginator extends Events {
    /**
     * @param {string} title The title of the embed
     * @param {string} content The message text
     * @param {number} items_per_page Max items per page
     * @param {string[]} items The items to show
     * @param {User} user The user object of the instantiator
     * @param {Object} [opts] Options for the paginator
     * @param {number} [opts.timeout] Time to wait for interactions before destroying Paginator
     * @param {boolean} [opts.show_page_numbers] Wether to show page numbers
     * @param {boolean} [opts.allow_text_input] Wether to allow inputting page numbers to navigate to them
     * @param {boolean} [opts.wrap_page_ends] Wether should wrap around back to the first page if clicking "next" on last page
     * @param {boolean} [opts.number_items] Wether to number the items
     * @param {Guild} [opts.guild] If Paginator is for something guild related
     * @param {[string, string]} [opts.prefix_suffix] What to prefix and or suffix to the list of each page
     */
    constructor(title, content, items_per_page, items, user, {
        timeout = 60000,
        show_page_numbers = true,
        wrap_page_ends = true,
        number_items = false,
        guild = null,
        prefix_suffix = ["", ""],
    } = {}) {
        super();

        this.title = title;
        this.content = content;
        this.items_per_page = items_per_page;
        this.total_items = items.length;
        this.strings = items;
        this.user = user;
        this.timeout = timeout;
        this.show_page_numbers = show_page_numbers;
        this.page_count = Math.ceil(this.total_items / this.items_per_page);
        this.wrap_page_ends = wrap_page_ends;
        this.number_items = number_items;
        this.guild = guild;
        this.prefix_suffix = [prefix_suffix[0] || "", prefix_suffix[1] || ""];

        /** @type {Message} */
        this.message = null;
    }

    /**
     * Begins pagination on page 1 as a new Message in the provided TextChannel
     * @param {TextChannel} channel The channel to render the Paginator in
     * @returns {Paginator}
     */
    display(channel) {
        this.paginate(channel, 1);
        return this;
    }

    /**
     * @param {TextChannel} channel
     * @param {number} page_num
     * @returns {void}
     */
    async paginate(channel, page_num) {
        if (page_num < 1)
            page_num = 1;
        else if (page_num > this.page_count)
            page_num = this.page_count;

        const msg = this.renderPage(page_num);
        this.initialize(await channel.send(...msg), page_num);
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    async paginateMessage(message, page_num) {
        if (page_num < 1)
            page_num = 1;
        else if (page_num > this.page_count)
            page_num = this.page_count;

        const msg = this.renderPage(page_num);
        this.initialize(await message.edit(...msg), page_num);
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    async initialize(message, page_num) {
        this.message = message;
        if (this.page_count > 1) {
            await message.react(Paginator.LEFT);
            await message.react(Paginator.STOP);
            await message.react(Paginator.RIGHT);
            this.pagination(message, page_num);
        } else {
            await message.react(Paginator.STOP);
            this.pagination(message, page_num);
        }
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    pagination(message, page_num) {
        this.paginationWithoutTextInput(message, page_num);
    }

    /**
     * @param {Message} message
     * @param {number} page_num
     */
    paginationWithoutTextInput(message, page_num) {
        const collector = message.createReactionCollector(
            (reaction, user) => this.checkReaction(reaction, user),
            { time: this.timeout, max: 1 }
        );

        collector.on("end", (collected, reason) => {
            if (reason === "time" || collected.size === 0) return this.end(message);

            this.handleMessageReactionAddAction(collected.first(), message, page_num);
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
            case Paginator.LEFT:
            case Paginator.STOP:
            case Paginator.RIGHT:
                break;
            default:
                return false;
        }

        return true;
    }

    /**
     * @param {MessageReaction} reaction
     * @param {Message} message
     * @param {number} page_num
     */
    async handleMessageReactionAddAction(reaction, message, page_num) {
        let new_page_num = page_num;
        switch (reaction.emoji.name) {
            case Paginator.LEFT:
                if (new_page_num === 1 && this.wrap_page_ends)
                    new_page_num = this.page_count + 1;
                if (new_page_num > 1)
                    new_page_num--;
                break;
            case Paginator.RIGHT:
                if (new_page_num === this.page_count && this.wrap_page_ends)
                    new_page_num = 0;
                if (new_page_num < this.page_count)
                    new_page_num++;
                break;
            case Paginator.STOP:
                await this.end(message);
                return;
        }

        try {
            if (message.channel.permissionsFor(message.guild.me).has(Permissions.FLAGS.MANAGE_MESSAGES))
                reaction.remove(this.user);
        } catch (_) { _; }

        const m = await message.edit(...this.renderPage(new_page_num));
        this.pagination(m, new_page_num);
    }

    renderPage(page_num) {
        const embed = new RichEmbed().setColor(CONST.COLOR.PRIMARY);

        const user_header = this.guild ? this.guild.name : userToString(this.user, true);
        const author_icon = this.guild ? this.guild.iconURL : this.user.avatarURL;
        if (this.title && this.title !== "") {
            embed.setAuthor(user_header + " | " + this.title, author_icon);
        } else {
            embed.setAuthor(user_header, author_icon);
        }

        const start = (page_num - 1) * this.items_per_page;
        const end = this.strings.length < page_num * this.items_per_page ?
            this.strings.length :
            page_num * this.items_per_page;

        const rows = [this.prefix_suffix[0]];
        for (let i = start; i < end; i++) {
            let str = "";
            if (this.number_items) str += "`" + (i + 1) + ".` ";
            str += this.strings[i] + "\n";
            rows.push(str);
        }
        rows.push(this.prefix_suffix[1]);
        embed.setDescription(rows.join("\n"));

        if (this.show_page_numbers) embed.setFooter(`Page ${page_num}/${this.page_count}`);

        return [
            this.content,
            { embed },
        ];
    }

    /**
     * @param {Message} message
     */
    async end(message = this.message) {
        await message.clearReactions().catch(() => { /* Do nothing */ });
        this.emit("end", message);
    }
}

// ◀ ⏹ ▶
Paginator.LEFT = "◀";
Paginator.STOP = "⏹";
Paginator.RIGHT = "▶";

module.exports = Paginator;
