class TypingCache {
    constructor() {
        /**
         * @type {Map<string, number>}
         */
        this.channels = new Map;
    }

    async startTyping(channel) {
        this.channels.set(channel.id, (this.channels.get(channel.id) || 0) + 1);
        return await channel.startTyping();
    }

    async stopTyping(channel, force = false) {
        if (force) {
            this.channels.delete(channel.id);
            return await channel.stopTyping();
        }
        const v = (this.channels.get(channel.id) || 0) - 1;
        if (v === 0) {
            this.channels.delete(channel.id);
            return await channel.stopTyping();
        }

    }
}

module.exports = new TypingCache;
