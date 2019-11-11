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

const Translation = require("../../modules/i18n/Translation");

class RateLimit {
    constructor(triesLeft, cooldown) {
        this.timestamp = Date.now();
        this.triesLeft = triesLeft;
        this.cooldown = cooldown;
    }

    incTries() {
        this.triesLeft++;
    }

    decTries() {
        if (this.triesLeft === 0) return;

        this.triesLeft--;

        setTimeout(() => this.incTries(), this.cooldown);
    }

    test() {
        if (this.triesLeft > 0) return false;

        if (this.isCooldownOver())
            this.timestamp = Date.now();

        return true;
    }

    testAndAdd() {
        if (this.triesLeft <= 0) return false;

        this.decTries();

        if (this.isCooldownOver())
            this.timestamp = Date.now();

        return true;
    }

    add() {
        this.decTries();
    }

    get cooldownReset() {
        return this.timestamp + this.cooldown;
    }

    isCooldownOver() {
        return this.cooldownReset < Date.now();
    }

    timeLeft() {
        return Math.max(0, this.cooldownReset - Date.now());
    }
}

class RateLimiter {
    /**
     * @param {TimeUnit} timeUnit The timeunit you'll input the RL time in. For example, TimeUnit#SECONDS.
     * @param {number}   cooldown How many times before you get ratelimited.
     * @param {number}   max      How much time until the ratelimit gets lifted.
     */
    constructor(timeUnit, cooldown, max) {
        this.max = max || 1;
        this.timeUnit = timeUnit;
        this.timeNum = cooldown;
        this.cooldown = timeUnit.toMillis(cooldown);
        /** @type {Map<string, RateLimit} */
        this.rateLimitedUsers = new Map;
    }

    test(key) {
        let rateLimit = this.rateLimitedUsers.get(key);
        if (!rateLimit) {
            rateLimit = new RateLimit(this.max, this.cooldown);
            this.rateLimitedUsers.set(key, rateLimit);
        }

        // Go over everyone and check if cooldown over, to delete and save memory
        for (const [key, rl] of this.rateLimitedUsers) {
            if (rl.isCooldownOver()) this.rateLimitedUsers.delete(key);
        }

        if (!rateLimit.test()) {
            return false;
        }

        return true;
    }

    testAndAdd(key) {
        let rateLimit = this.rateLimitedUsers.get(key);
        if (!rateLimit) {
            rateLimit = new RateLimit(this.max, this.cooldown);
            this.rateLimitedUsers.set(key, rateLimit);
        }

        if (!rateLimit.testAndAdd()) {
            return false;
        }

        // Go over everyone and check if cooldown over, to delete and save memory
        for (const [key, rl] of this.rateLimitedUsers) {
            if (rl.isCooldownOver()) this.rateLimitedUsers.delete(key);
        }

        return true;
    }

    toString() {
        if (this.max > 1) {
            return `${this.max} times in ${this.timeUnit.toString(this.timeNum)}`;
        } else {
            return this.timeUnit.toString(this.timeNum);
        }
    }

    toTranslation() {
        if (this.max > 1) {
            return new Translation("time.x_times_in", "{{x}} times in {{timeframe}}", { x: this.max, timeframe: this.timeUnit.toTranslation(this.timeNum) });
        } else {
            return this.timeUnit.toTranslation(this.timeNum);
        }
    }

    tryAgainIn(key) {
        const rateLimit = this.rateLimitedUsers.get(key);
        if (!rateLimit)
            return 0;

        return rateLimit.timeLeft();
    }
}

RateLimiter.RateLimit = RateLimit;

module.exports = RateLimiter;
