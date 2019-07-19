const { toHumanTime } = require("../modules/util/time");
const { Message, Channel, Guild } = require("discord.js");
const LocaleManager = require("../logic/managers/LocaleManager");
const CommandPermission = require("../logic/commands/CommandPermission");
const CommandScope = require("../logic/commands/CommandScope");
const RateLimiter = require("../logic/RateLimiter");
const TimeUnit = require("../modules/TimeUnit");

// give each Channel and Guild class a locale function, which returns the locale config for this
// specific namespace, and on a Message class give the whole locale config
Message.prototype.locale = function () { return this.client.locale.get(this.guild ? this.guild.id : ""); };
Channel.prototype.locale = function () { return this.client.locale.get(this.guild ? this.guild.id : "", this.id || ""); };
Guild.prototype.locale = async function () { return (await this.client.locale.get(this.id)).global; };

Message.prototype.translate = LocaleManager.autoTranslate;
Channel.prototype.translate = LocaleManager.autoTranslateChannel;
Channel.prototype.sendTranslated = LocaleManager.sendTranslated;

class BaseCommand {
    /**
     * @param {CommandPermission} permissions 
     */
    constructor(permissions) {
        this.id = Symbol("command id");

        this.setRateLimiter(null);
        this.setPermissions(permissions || CommandPermission.USER);
        this.ignore = true;
        this.list = true;
        this._category = null;
        this._help = null;
        this.aliases = [];
        this.explicit = false;
        this.setScope(null);
    }

    async rateLimit(message) {
        if (!this.rateLimiter || (this._rateLimitMessageRateLimiter && !this._rateLimitMessageRateLimiter.testAndAdd(`${message.guild.id}:${message.channel.id}`))) return;
        await this.rateLimitMessage(message);
    }

    async rateLimitMessage(message) {
        await message.channel.sendTranslated(`Whoa whoa not so fast! You may only do this ${this.rateLimiter.max} ${this.rateLimiter.max === 1 ? "time" : "times"} every ${this.rateLimiter.toString()}. There is still ${toHumanTime(this.rateLimiter.tryAgainIn(message.author.id))} left to wait.`);
    }

    setRateLimiter(rateLimiter) {
        if (rateLimiter) {
            this._rateLimitMessageRateLimiter = this._rateLimitMessageRateLimiter || new RateLimiter(TimeUnit.MINUTE, 1);
            this.rateLimiter = rateLimiter;
        } else {
            this._rateLimitMessageRateLimiter = null;
            this.rateLimiter = null;
        }
        return this;
    }

    async noPermission(message) {
        await message.channel.sendTranslated("IDK what you're doing here. This is restricted area >:c");
    }
    
    setPermissions(permissions) {
        this.permissions =
            permissions ?
                permissions instanceof CommandPermission ?
                    permissions :
                    new CommandPermission(permissions instanceof Array ? permissions : [permissions]) :
                CommandPermission.USER;
        return this;
    }

    setIgnore(v = false) {
        this.ignore = v;
        return this;
    }

    setCategory(v) {
        this._category = v;
        this.setPermissions(v.permissions);
        return this;
    }

    get category() {
        return this._category;
    }

    setHelp(v) {
        this._help = v;
        return this;
    }

    dontList() {
        this.list = false;
        return this;
    }

    setExplicit(v = true) {
        this.explicit = v;
        return this;
    }

    setScope(v) {
        this.scope = new CommandScope(v || CommandScope.DEFAULT).freeze();
        return this;
    }

    hasScope(channel) {
        if (!this.scope.has(CommandScope.FLAGS.GUILD) && channel.type === "text") return false;
        if (!this.scope.has(CommandScope.FLAGS.DM) && channel.type === "dm") return false;
        return true;
    }

    get help() {
        return this._help;
    }

    async beforeProcessCall() { }

    async run(message, command_name, content, pass_through, timer) {
        return await this.call(message, content, { pass_through, command_name, timer });
    }

    async call() { }
}

module.exports = BaseCommand;
