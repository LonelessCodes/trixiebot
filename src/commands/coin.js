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

const { timeout } = require("../util/promises");
const { randomItem } = require("../util/array");

const SimpleCommand = require("../core/commands/SimpleCommand");
const HelpContent = require("../util/commands/HelpContent");
const Category = require("../util/commands/Category");
const CommandScope = require("../util/commands/CommandScope");

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;

const coin = ["heads", "tails"];

module.exports = function install(cr) {
    cr.registerCommand("coin", new SimpleCommand(async ({ content, ctx }) => {
        let bet = content.toLowerCase();
        if (bet === "") {
            bet = await randomItem(coin);
            await ctx.send(new TranslationMerge(new Translation("coin.bet", "Your bet:"), bet));
        }

        if (bet === "head") bet = "heads";
        else if (bet === "tail") bet = "tails";

        if (!coin.includes(bet)) {
            await ctx.send(new Translation("coin.invalid", "`{{bet}}` isn't a valid side of le coin. `heads` or `tails`?!", { bet }));
            return;
        }

        const result = await randomItem(coin);

        await ctx.send(new Translation("coin.pending", "The coin flips into the air..."));
        await timeout(2000);
        await ctx.send(result === bet ?
            new Translation("coin.success", "Whew! The coin landed on {{result}}.", { result }) :
            new Translation("coin.busted", "Sorry! The coin landed on {{result}}.", { result })
        );
    }))
        .setHelp(new HelpContent()
            .setUsage("<?bet>")
            .addParameterOptional("bet", "your bet. Either `heads` or `tails`"))
        .setCategory(Category.UTIL)
        .setScope(CommandScope.ALL);
};
