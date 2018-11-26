const TimeUnit = require("../modules/TimeUnit");

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
     * @param {number}   max      How many times before you get ratelimited.
     * @param {number}   cooldown  How much time until the ratelimit gets lifted.
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

        // go over everyone and check if cooldown over, to delete and save memory
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

        // go over everyone and check if cooldown over, to delete and save memory
        for (const [key, rl] of this.rateLimitedUsers) {
            if (rl.isCooldownOver()) this.rateLimitedUsers.delete(key);
        }

        return true;
    }

    toString() {
        return this.timeUnit.toString(this.timeNum);
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