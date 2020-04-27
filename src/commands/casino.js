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

const SimpleCommand = require("../core/commands/SimpleCommand");
const OverloadCommand = require("../core/commands/OverloadCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;

const credits = require("../core/managers/CreditsManager");
const BlackJack = require("../modules/casino/BlackJack");

const Translation = require("../modules/i18n/Translation").default;

module.exports = function install(cr) {
    cr.registerCommand("blackjack", new OverloadCommand())
        .registerOverload(
            "1+",
            new SimpleCommand(async ({ guild, author, content, ctx }) => {
                const bet = parseInt(content);
                if (Number.isNaN(bet)) return new Translation("bj.invalid_bet", "Invalid bet! Plz put a number wumber uwu");

                if (bet < BlackJack.MIN_BET)
                    return new Translation("casino.minimum", "Minimum bet should be {{bet}}", {
                        bet: credits.getBalanceTrans(BlackJack.MIN_BET, await credits.getName(guild)),
                    });
                if (bet > BlackJack.MAX_BET)
                    return new Translation("casino.maximum", "Maximum bet should be {{bet}}", {
                        bet: credits.getBalanceTrans(BlackJack.MAX_BET, await credits.getName(guild)),
                    });

                if (!(await credits.canPurchase(author, bet)))
                    return new Translation("casino.not_enough", "You don't have enough {{name}} to gamble :c", {
                        name: await credits.getName(guild),
                    });

                return await BlackJack.exec(ctx, bet);
            })
        )
        .setHelp(
            new HelpContent()
                .setUsage("<bet>", "Play a round of blackjack")
                .addParameter(
                    "bet",
                    "The money you're willing to bet. Between " + BlackJack.MIN_BET + " and " + BlackJack.MAX_BET
                )
        )
        .setCategory(Category.ECONOMY);

    cr.registerAlias("blackjack", "bj");
};
