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

const { toHumanTime } = require("../../util/time");
const { format } = require("../../util/string");
const { Message, Channel } = require("discord.js");
const CommandPermission = require("../../util/commands/CommandPermission");
const CommandScope = require("../../util/commands/CommandScope");
const RateLimiter = require("../../util/commands/RateLimiter");
const CalendarRange = require("../../modules/CalendarRange");
const TimeUnit = require("../../modules/TimeUnit");

const Translation = require("../../modules/i18n/Translation");
const TranslationMerge = require("../../modules/i18n/TranslationMerge");
const TranslationPlural = require("../../modules/i18n/TranslationPlural");

// provide a fallback for old .translate() based commands
// until they are finally also converted
Message.prototype.translate = format;
Channel.prototype.translate = format;

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
        this.help = null;
        this.aliases = [];
        this.explicit = false;
        this.scope = new CommandScope(CommandScope.DEFAULT).freeze();
        this.season = new CalendarRange;
    }

    get category() {
        return this._category;
    }

    async rateLimit(context) {
        const id = `${context.channel.type === "text" ? context.guild.id : ""}:${context.channel.id}`;
        if (
            !this.rateLimiter ||
            (this._rateLimitMessageRateLimiter && !this._rateLimitMessageRateLimiter.testAndAdd(id))
        ) return;

        await context.send(new TranslationPlural(
            "command.ratelimit",
            [
                "Whoa whoa not so fast! You may only do this {{count}} time every {{time_frame}}. There is still {{time_left}} left to wait.",
                "Whoa whoa not so fast! You may only do this {{count}} times every {{time_frame}}. There is still {{time_left}} left to wait.",
            ],
            this.rateLimiter.max,
            {
                count: this.rateLimiter.max,
                time_frame: this.rateLimiter.timeUnit.toTranslation(),
                time_left: toHumanTime(this.rateLimiter.tryAgainIn(context.author.id)),
            }
        ));
    }

    async noPermission(context) {
        await context.send(new TranslationMerge(new Translation(
            "command.no_permissions",
            "IDK what you're doing here. This is restricted area >:c Required Permissions:"
        ), this.permissions.toString()));
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

    setHelp(v) {
        this.help = v;
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

    setSeason(range) {
        this.season = range || new CalendarRange;
        return this;
    }

    hasScope(channel) {
        if (!this.scope.has(CommandScope.FLAGS.GUILD) && channel.type === "text") return false;
        if (!this.scope.has(CommandScope.FLAGS.DM) && channel.type === "dm") return false;
        return true;
    }

    isInSeason() {
        return this.season.isToday();
    }

    async beforeProcessCall() { /* Do nothing */ }

    async run(ctx, command_name, pass_through) {
        return await this.call(ctx, { pass_through, command_name });
    }

    async call() { /* Do nothing */ }
}

module.exports = BaseCommand;
