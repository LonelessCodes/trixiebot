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
