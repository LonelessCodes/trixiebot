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

const secureRandom = require("../modules/random/secureRandom").default;

const SimpleCommand = require("../core/commands/SimpleCommand");
const TreeCommand = require("../core/commands/TreeCommand");
const HelpContent = require("../util/commands/HelpContent").default;
const Category = require("../util/commands/Category").default;

const PaginatorGuildAction = require("../modules/actions/PaginatorGuildAction");

const Translation = require("../modules/i18n/Translation").default;
const TranslationMerge = require("../modules/i18n/TranslationMerge").default;

function graph(uom, r, length, girth) {
    return new TranslationMerge(
        new Translation("penis.length", "Length:"),
        `**${(length * r).toFixed(1)} ${uom}**  `,
        new Translation("penis.girth", "Girth:"),
        `**${(girth * r).toFixed(1)} ${uom}**`
    );
}

function pp(length) {
    return `8${new Array(Math.round(length)).fill("=").join("")}D`;
}

module.exports = function install(cr, { client, db }) {
    const database = db.collection("penis");

    const penisCommand = cr
        .registerCommand("penis", new TreeCommand())
        .setExplicit(true)
        .setHelp(
            new HelpContent()
                .setDescription(
                    "Check on what package your buddy is carrying~ (or you are caring)\nRandomy generated penis size."
                )
                .setUsage("<?mention>")
                .addParameterOptional("mention", "User who's penis you wish to ~~pleasure~~ measure")
        )
        .setCategory(Category.FUN);

    /**
     * SUB COMMANDS
     */

    penisCommand.registerDefaultCommand(
        new SimpleCommand(async ({ message, config, mentions }) => {
            const uom = config.uom;
            const r = uom === "cm" ? 2.54 : 1;

            const member = mentions.members.first() || message.member;

            if (mentions.everyone) {
                return new Translation("penis.everyone", "everyone has fucking huge diccs k. You're all beautiful");
            }

            if (member.user.id === client.user.id) {
                const length = 20;
                const girth = 18;
                return new TranslationMerge(pp(length) + " ( ͡° ͜ʖ ͡°)", graph(uom, r, length, girth)).separator("\n");
            }

            const doc = await database.findOne({ userId: member.user.id });
            if (!doc) {
                const random = await secureRandom() - 0.2;
                const length = (Math.pow((random > 0 ?
                    ((Math.pow(random, 1.4) + 0.2) * 15) + 3 :
                    ((random + 0.2) * 15) + 3) / 20, 1.4) * 20) + 1.5;
                const girth = (Math.pow((await secureRandom() + ((random - 0.1) * 2)) * 0.3, 2) * 8) + 6;
    
                await database.insertOne({
                    userId: member.user.id,
                    girth,
                    length,
                });
    
                return new TranslationMerge(
                    pp(length),
                    graph(uom, r, length, girth)
                ).separator("\n");
            }

            const { length, girth } = doc;

            return new TranslationMerge(pp(length), graph(uom, r, length, girth)).separator("\n");
        })
    );

    penisCommand.registerSubCommand("leaderboard", new SimpleCommand(async ({ message, config, ctx }) => {
        const uom = config.uom;
        const r = uom === "cm" ? 2.54 : 1;

        const members = await message.guild.members.fetch();
        const penises = await database.find({ $or: members.map(member => ({ userId: member.user.id })) }).toArray();
        const sorted = penises.sort((a, b) => b.length - a.length);

        const items = [];
        for (const penis of sorted) {
            const member = message.guild.members.cache.get(penis.userId);
            if (!member) continue;
            items.push(
                await ctx.translate(
                    new TranslationMerge(
                        "**" + pp(penis.length) + `   ${member.user.tag}**`,
                        graph(uom, r, penis.length, penis.girth)
                    ).separator("\n")
                )
            );
        }

        await new PaginatorGuildAction(
            "Penis Leaderboard",
            new Translation("penis.top_penises", "The top penises in this server"),
            items,
            message.author,
            message.guild,
            { items_per_page: 20, number_items: true }
        ).display(message.channel, await ctx.translator());
    }))
        .setHelp(new HelpContent().setUsage("", "Shows where you are in the penis size ranking"));

    cr.registerAlias("penis", "cock");
    cr.registerAlias("penis", "dick");
};
