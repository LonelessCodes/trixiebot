class TypingCache {
    constructor() {
        /**
         * @type {Map<string, number>}
         */
        this.channels = new Map;
    }

    startTyping(channel) {
        this.channels.set(channel.id, (this.channels.get(channel.id) || 0) + 1);
        return channel.startTyping();
    }

    stopTyping(channel, force = false) {
        if (force) {
            this.channels.delete(channel.id);
            return channel.stopTyping();
        }
        const v = (this.channels.get(channel.id) || 0) - 1;
        if (v === 0) {
            this.channels.delete(channel.id);
            return channel.stopTyping();
        }
    }
}

module.exports = new TypingCache;
