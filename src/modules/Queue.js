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

class Queue {
    constructor() {
        this.running = false;
        this.queue = [];
    }

    push(func) {
        return new Promise(resolve => {
            // Add callback to the queue
            this.queue.push(() => func().then(result => {
                resolve(result);
                this.next();
            }));

            if (!this.running) {
                // If nothing is running, then start the engines!
                this.next();
            }
        });
    }

    next() {
        this.running = false;
        // Get the first element off the queue and execute it
        const shift = this.queue.shift();
        if (shift) {
            this.running = true;
            shift();
        }
    }
}

module.exports = Queue;
