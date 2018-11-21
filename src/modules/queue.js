class Queue {
    constructor() {
        this.running = false;
        this.queue = [];
    }

    push(func) {
        //add callback to the queue
        this.queue.push(() => func(() => this.next()));

        if (!this.running) {
            // if nothing is running, then start the engines!
            this.next();
        }

        return this; // for chaining fun!
    }

    next() {
        this.running = false;
        //get the first element off the queue
        var shift = this.queue.shift();
        if (shift) {
            this.running = true;
            shift();
        }
    }
}

module.exports = Queue;
