const Events = require("events");

class Pagination extends Events {
    constructor(page_limit, count, authorId, awaitMessages) {
        super();

        this.pages_count = Math.ceil(count / page_limit);

        const listen = () => {
            awaitMessages(message => {
                if (message.author.id !== authorId) return;
                if (/^exit/i.test(message.content)) return true;
                if (!/^\d+$/.test(message.content)) return;

                const page_number = parseInt(message.content);

                this.emit("change", (page_number - 1) * page_limit, page_limit, page_number);

                listen();
                return true;
            }, {
                max: 1,
                time: 60000
            });
        };
        listen();
    }
}

module.exports = Pagination;