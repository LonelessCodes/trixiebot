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

import Discord from "discord.js";
import { toHumanTime } from "../../util/time";
import Category from "../../util/commands/Category";
import HelpContent from "../../util/commands/HelpContent";
import CommandPermission from "../../util/commands/CommandPermission";
import CommandScope from "../../util/commands/CommandScope";
import RateLimiter from "../../util/commands/RateLimiter";
import MessageContext from "../../util/commands/MessageContext";
import TimeUnit from "../../modules/TimeUnit";

import Translation from "../../modules/i18n/Translation";
import TranslationMerge from "../../modules/i18n/TranslationMerge";
import TranslationPlural from "../../modules/i18n/TranslationPlural";

export default abstract class BaseCommand {
    protected _rateLimitMessageRateLimiter: RateLimiter | null = null;

    rateLimiter: RateLimiter | null = null;
    permissions: CommandPermission = CommandPermission.USER;
    category: Category | null = null;
    listed: boolean = true;
    help: HelpContent | null = null;
    aliases: string[] = [];
    explicit: boolean = false;
    scope: CommandScope = new CommandScope(CommandScope.DEFAULT);

    async rateLimit(context: MessageContext) {
        if (
            !this.rateLimiter ||
            (this._rateLimitMessageRateLimiter && !this._rateLimitMessageRateLimiter.testAndAdd(context.channel.id))
        ) {
            return;
        }

        await context.send(
            new TranslationPlural(
                "command.ratelimit",
                [
                    "Whoa whoa not so fast! You may only do this {{count}} time every {{time_frame}}. There is still {{time_left}} left to wait.",
                    "Whoa whoa not so fast! You may only do this {{count}} times every {{time_frame}}. There is still {{time_left}} left to wait.",
                ],
                {
                    count: this.rateLimiter.max,
                    time_frame: this.rateLimiter.time_unit.toTranslation(),
                    time_left: toHumanTime(this.rateLimiter.tryAgainIn(context.author.id)),
                }
            )
        );
    }

    async noPermission(context: MessageContext): Promise<void> {
        await context.send(
            new TranslationMerge(
                new Translation(
                    "command.no_permissions",
                    "IDK what you're doing here. This is restricted area >:c Required Permissions:"
                ),
                this.permissions.toString()
            )
        );
    }

    setRateLimiter(rate_limiter: RateLimiter | null): this {
        if (rate_limiter) {
            this._rateLimitMessageRateLimiter = this._rateLimitMessageRateLimiter || new RateLimiter(TimeUnit.MINUTE, 1);
            this.rateLimiter = rate_limiter;
        } else {
            this._rateLimitMessageRateLimiter = null;
            this.rateLimiter = null;
        }
        return this;
    }

    setPermissions(permissions?: number | CommandPermission | number[]): this {
        this.permissions = permissions
            ? permissions instanceof CommandPermission
                ? permissions
                : new CommandPermission(Array.isArray(permissions) ? permissions : [permissions])
            : CommandPermission.USER;
        return this;
    }

    setCategory(v: Category): this {
        this.category = v;
        this.setPermissions(v.permissions);
        return this;
    }

    setHelp(v: HelpContent): this {
        this.help = v;
        return this;
    }

    setListed(v: boolean): this {
        this.listed = v;
        return this;
    }

    setExplicit(v: boolean = true): this {
        this.explicit = v;
        return this;
    }

    setScope(v: Discord.BitFieldResolvable<"GUILD" | "DM">): this {
        this.scope = new CommandScope(v || CommandScope.DEFAULT);
        return this;
    }

    hasScope(channel: Discord.Channel): boolean {
        return CommandScope.hasScope(this.scope, channel);
    }

    async run(ctx: MessageContext, command_name: string | RegExp): Promise<void> {
        return await this.call(ctx, command_name);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    call(ctx: MessageContext, command_name?: string | RegExp): Promise<void> {
        return Promise.resolve(undefined);
    }
}
