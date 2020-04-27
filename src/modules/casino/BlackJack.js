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

const { doNothing } = require("../../util/util");
const random = require("../random/random").default;
const credits = require("../../core/managers/CreditsManager");
const { basicTEmbed } = require("../i18n/TranslationEmbed");

const Translation = require("../i18n/Translation").default;
const TranslationMerge = require("../i18n/TranslationMerge").default;

class Card {
    /**
     * @param {number} unique
     */
    constructor(unique = 0) {
        this.unique = unique;
        this.value = (unique % 13) + 1;
        this.suit = Math.floor(unique / 13);
    }

    get ace() {
        return this.value === 1;
    }

    get worth() {
        return this.ace ? 11 : Math.min(this.value, 10);
    }

    equals(card) {
        return this.unique === card.unique;
    }

    render() {
        return Card.VALUES[this.value - 1] + Card.SUITS[this.suit];
    }
}
Card.VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
Card.SUITS = [":spades:", ":clubs:", ":hearts:", ":diamonds:"];

class Deck {
    constructor() {
        /** @type {Card[]} */
        this.cards = [];
    }

    // Instead of generating the whole deck on start, when a card is pulled, check
    // if it has already been pulled before, cause that would be impossible
    pullCard() {
        if (this.cards.length >= 52) return;

        let cardpull;
        let keepgoing = true;
        while (keepgoing) {
            cardpull = new Card(Math.floor(random(52)));
            keepgoing = false;

            for (let card of this.cards) {
                if (cardpull.equals(card)) {
                    keepgoing = true;
                    break;
                }
            }
        }
        this.cards.push(cardpull);
        return cardpull;
    }
}

class Player {
    constructor() {
        /** @type {Card[]} */
        this.cards = [];
    }

    get score() {
        let aces = 0;
        let endscore = 0;

        for (let card of this.cards) {
            if (card.ace && aces === 0) {
                aces++;
            } else {
                endscore += card.worth;
            }
        }

        if (aces === 1) {
            if (endscore + 11 > BlackJack.MAX_HAND) {
                endscore++;
            } else {
                endscore += 11;
            }
        }

        return endscore;
    }

    pullCards(deck, num = 1) {
        while (num--) {
            const card = deck.pullCard();
            if (!card) return;

            this.cards.push(card);
        }
    }

    render() {
        const score = this.score;

        const value = new TranslationMerge(new Translation("bj.value", "Value:"), score);
        if (score > BlackJack.MAX_HAND) value.push("-", new Translation("bj.busted", "BUSTED"));
        else if (score === 21 && this.cards.length === 2) value.push("-", new Translation("bj.blackjack", "BLACKJACK"));

        return new TranslationMerge(
            this.cards.map(card => card.render()).join(" - "),
            value
        ).separator("\n");
    }
}

class Dealer extends Player {
    play(deck) {
        while (this.score < 17) this.pullCards(deck);
    }

    render(visible = false) {
        if (visible) return super.render();

        return new TranslationMerge(
            this.cards[0].render() + " - " + this.cards.slice(1).map(() => "XX").join(" - "),
            new TranslationMerge(new Translation("bj.value", "Value:"), "--")
        ).separator("\n");
    }
}

class Result {
    constructor(status, win) {
        this.status = status;
        this.win = win;
    }
}
Result.BUSTED = 0;
Result.YOU_WIN = 1;
Result.PUSH = 2;
Result.DEALER_WINS = 3;

class BlackJack {
    constructor(bet) {
        this.bet = bet;
        this.deck = new Deck;
        this.player = new Player;
        this.dealer = new Dealer;

        this.doubledown_able = true;

        this.done = false;
        /** @type {Result} */
        this.result = null;

        this.player.pullCards(this.deck, 2);
        this.dealer.pullCards(this.deck, 2);
    }

    hit() {
        if (this.doubledown_able) {
            // Another option open to the player is doubling their bet when
            // the original two cards dealt total 9, 10, or 11.
            const score = this.player.score;
            this.doubledown_able = score >= 9 && score <= 11;
            this.doubledown_able = false;
        }

        this.player.pullCards(this.deck, 1);

        if (this.player.score > BlackJack.MAX_HAND) return this.stand();
    }

    stand() {
        this.done = true;

        // plays the dealer's turn, hits up to 17 then stands
        this.dealer.play(this.deck);

        const player_s = this.player.score;
        const dealer_s = this.dealer.score;

        if (player_s > BlackJack.MAX_HAND) { // Player is higher than 21
            this.result = new Result(Result.BUSTED, 0);
        } else if (player_s > dealer_s) { // player is <= 21 but higher than dealer
            if (player_s === BlackJack.MAX_HAND && this.player.cards.length === 2) { // Player has a natural
                this.result = new Result(Result.YOU_WIN, Math.floor(this.bet * 1.5)); // "the dealer immediately pays that player one and a half times the amount of their bet"
            } else {
                this.result = new Result(Result.YOU_WIN, this.bet);
            }
        } else if (player_s < dealer_s) { // player is <= 21 and but dealer is higher
            if (dealer_s > BlackJack.MAX_HAND) { // dealer is higher than 21
                this.result = new Result(Result.YOU_WIN, this.bet);
            } else { // dealer is <= 21 but higher than player
                this.result = new Result(Result.DEALER_WINS, 0);
            }
        } else { // player and dealer is equal
            this.result = new Result(Result.PUSH, 0);
        }

        return this.result;
    }

    doubledown() {
        if (!this.doubledown_able) return;
        this.bet *= 2;
        // run hit, and if hit doesn't stand by itself, then stand
        return this.hit() || this.stand();
    }

    async render(guild, author) {
        const embed = basicTEmbed(new Translation("bj.title", "Blackjack"), author);

        if (!this.done) {
            this.doubledown_able = this.doubledown_able && await credits.canPurchase(author, this.bet * 2);
            if (this.doubledown_able)
                embed.setDescription(new Translation("bj.hit_stand_double", "Type `hit` to draw another card, `stand` to pass or `double` to double down"));
            else
                embed.setDescription(new Translation("bj.hit_stand", "Type `hit` to draw another card or `stand` to pass"));

            embed.addField(new Translation("bj.your_hand", "Your hand"), this.player.render(), true);
            embed.addField(new Translation("bj.dealer_hand", "Dealer hand"), this.dealer.render(false), true);
        } else {
            let status;
            switch (this.result.status) {
                case Result.BUSTED:
                    status = new Translation("bj.result.busted", "**BUSTED!** You lost {{money}}", { money: credits.getBalanceTrans(this.bet, await credits.getName(guild)) }); break;
                case Result.DEALER_WINS:
                    status = new Translation("bj.result.dealer", "**Dealer wins!** You lost {{money}}", { money: credits.getBalanceTrans(this.bet, await credits.getName(guild)) }); break;
                case Result.PUSH:
                    status = new Translation("bj.result.push", "**PUSH!**"); break;
                case Result.YOU_WIN:
                    status = new Translation("bj.result.win", "**YOU WON** {{money}}", { money: credits.getBalanceTrans(this.result.win, await credits.getName(guild)) }); break;
            }
            embed.setDescription(status);
            embed.addField(new Translation("bj.your_hand", "Your hand"), this.player.render(), true);
            embed.addField(new Translation("bj.dealer_hand", "Dealer hand"), this.dealer.render(true), true);
        }

        return embed;
    }

    async end(guild, author) {
        if (this.result.status === Result.YOU_WIN) await credits.makeTransaction(guild, author, this.result.win, "blackjack", "Won at blackjack");
        else if (this.result.status === Result.BUSTED || this.result.status === Result.DEALER_WINS) await credits.makeTransaction(guild, author, -this.bet, "blackjack", "Lost at blackjack");

        return await this.render(guild, author);
    }

    /*
     * Game Lifecyle
     */
    static async exec({ channel, author, ctx }, bet) {
        const game = new BlackJack(bet);

        while (!game.done) {
            const msg = await ctx.send(await game.render(channel.guild, author));

            const options = game.doubledown_able ? /hit|stand|double/i : /hit|stand/i;
            const msgs = await channel.awaitMessages(m => m.author.equals(author) && options.test(m.content), { max: 1, time: 30000 });

            if (msg.deletable) msg.delete().catch(doNothing);

            let action = "";
            if (msgs.size === 0) action = "stand";
            else action = msgs.first().content.toLowerCase();
            switch (action) {
                case "hit": {
                    const result = game.hit();
                    if (result) return await game.end(channel.guild, author);
                    break;
                }
                case "stand": {
                    game.stand();
                    return await game.end(channel.guild, author);
                }
                case "double": {
                    game.doubledown();
                    return await game.end(channel.guild, author);
                }
            }
        }
    }
}
BlackJack.MAX_HAND = 21;
BlackJack.MIN_BET = 10;
BlackJack.MAX_BET = 2000;

module.exports = BlackJack;
