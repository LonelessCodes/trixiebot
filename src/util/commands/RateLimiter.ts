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

import TimeUnit from "../../modules/TimeUnit";
import Translation from "../../modules/i18n/Translation";

export class RateLimit {
    timestamp: number;
    tries_left: number;
    cooldown: number;

    constructor(tries_left: number, cooldown: number) {
        this.timestamp = Date.now();
        this.tries_left = tries_left;
        this.cooldown = cooldown;
    }

    incTries() {
        this.tries_left++;
    }

    decTries() {
        if (this.tries_left === 0) return;

        this.tries_left--;

        setTimeout(() => this.incTries(), this.cooldown);
    }

    test() {
        if (this.tries_left > 0) return false;

        if (this.isCooldownOver()) this.timestamp = Date.now();

        return true;
    }

    testAndAdd() {
        if (this.tries_left <= 0) return false;

        this.decTries();

        if (this.isCooldownOver()) this.timestamp = Date.now();

        return true;
    }

    add() {
        this.decTries();
    }

    get cooldown_reset() {
        return this.timestamp + this.cooldown;
    }

    isCooldownOver() {
        return this.cooldown_reset < Date.now();
    }

    timeLeft() {
        return Math.max(0, this.cooldown_reset - Date.now());
    }
}

export default class RateLimiter {
    max: number;
    time_unit: TimeUnit;
    time_num: number;
    cooldown: number;
    private _rate_limited_users: Map<string, RateLimit>;

    /**
     * @param {TimeUnit} time_unit The timeunit you'll input the RL time in. For example, TimeUnit#SECONDS.
     * @param {number}   cooldown How many times before you get ratelimited.
     * @param {number}   max      How much time until the ratelimit gets lifted.
     */
    constructor(time_unit: TimeUnit, cooldown: number, max: number = 1) {
        this.max = max;
        this.time_unit = time_unit;
        this.time_num = cooldown;
        this.cooldown = time_unit.toMillis(cooldown);
        /** @type {Map<string, RateLimit>} */
        this._rate_limited_users = new Map();
    }

    test(key: string): boolean {
        let rate_limit = this._rate_limited_users.get(key);
        if (!rate_limit) {
            rate_limit = new RateLimit(this.max, this.cooldown);
            this._rate_limited_users.set(key, rate_limit);
        }

        // Go over everyone and check if cooldown over, to delete and save memory
        for (const [key, rl] of this._rate_limited_users) {
            if (rl.isCooldownOver()) this._rate_limited_users.delete(key);
        }

        if (!rate_limit.test()) {
            return false;
        }

        return true;
    }

    testAndAdd(key: string): boolean {
        let rate_limit = this._rate_limited_users.get(key);
        if (!rate_limit) {
            rate_limit = new RateLimit(this.max, this.cooldown);
            this._rate_limited_users.set(key, rate_limit);
        }

        if (!rate_limit.testAndAdd()) {
            return false;
        }

        // Go over everyone and check if cooldown over, to delete and save memory
        for (const [key, rl] of this._rate_limited_users) {
            if (rl.isCooldownOver()) this._rate_limited_users.delete(key);
        }

        return true;
    }

    toString() {
        if (this.max > 1) {
            return `${this.max} times in ${this.time_unit.toString(this.time_num)}`;
        }
        return this.time_unit.toString(this.time_num);
    }

    toTranslation() {
        if (this.max > 1) {
            return new Translation("time.x_times_in", "{{x}} times in {{timeframe}}", {
                x: this.max,
                timeframe: this.time_unit.toTranslation(this.time_num),
            });
        }
        return this.time_unit.toTranslation(this.time_num);
    }

    tryAgainIn(key: string): number {
        const rate_limit = this._rate_limited_users.get(key);
        if (!rate_limit) return 0;

        return rate_limit.timeLeft();
    }
}
