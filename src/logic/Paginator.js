const { userToString } = require("../modules/util");
const CONST = require("../modules/const");
const Events = require("events");
// eslint-disable-next-line no-unused-vars
const { User, TextChannel, Message, MessageReaction, RichEmbed } = require("discord.js");

class Paginator extends Events {
    /**
     * @param {string} title
     * @param {string} content
     * @param {number} items_per_page 
     * @param {string[]} items 
     * @param {User} user
     * @param {number} timeout 
     * @param {boolean} show_page_numbers 
     * @param {boolean} allow_text_input 
     */
    constructor(title, content, items_per_page, items, user, timeout = 60000, show_page_numbers = true, wrap_page_ends = true, number_items = false, prefix_suffix = ["", ""]) {
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
        this.prefix_suffix = [prefix_suffix[0] || "", prefix_suffix[1] || ""];
    }

    /**
     * Begins pagination on page 1 as a new Message in the provided TextChannel
     * 
     * @param {TextChannel} channel 
     */
    display(channel) {
        this.paginate(channel, 1);
    }

    /**
     * @param {TextChannel} channel 
     * @param {number} page_num 
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
    async pagination(message, page_num) {
        // if (this.allow_text_input || (this.left_text != null && this.right_text != null)) {
        //     this.paginationWithTextInput(message, page_num);
        // } else {
        //     this.paginationWithoutTextInput(message, page_num);
        // }
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
                if (new_page_num == 1 && this.wrap_page_ends)
                    new_page_num = this.page_count + 1;
                if (new_page_num > 1)
                    new_page_num--;
                break;
            case Paginator.RIGHT:
                if (new_page_num == this.page_count && this.wrap_page_ends)
                    new_page_num = 0;
                if (new_page_num < this.page_count)
                    new_page_num++;
                break;
            case Paginator.STOP:
                await this.end(message);
                return;
        }

        try {
            reaction.remove(this.user);
        } catch (_) { _; }

        const m = await message.edit(...this.renderPage(new_page_num));
        this.pagination(m, new_page_num);
    }

    renderPage(page_num) {
        const embed = new RichEmbed().setColor(CONST.COLOR.PRIMARY);

        if (this.title && this.title !== "") {
            embed.setAuthor(userToString(this.user, true) + " | " + this.title, this.user.avatarURL);
        } else {
            embed.setAuthor(userToString(this.user, true), this.user.avatarURL);
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
            { embed }
        ];
    }

    /**
     * @param {Message} message 
     */
    async end(message) {
        await message.clearReactions().catch(() => { });
        this.emit("end", message);
    }
}

// ◀ ⏹ ▶
Paginator.LEFT = "◀"; 
Paginator.STOP = "⏹";
Paginator.RIGHT = "▶";

module.exports = Paginator;