class Queue {
    constructor() {
        this.running = false;
        this.queue = [];
    }

    push(func) {
        return new Promise(resolve => {
            //add callback to the queue
            this.queue.push(() => {
                return func().then(result => {
                    resolve(result);
                    this.next();
                });
            });
    
            if (!this.running) {
                // if nothing is running, then start the engines!
                this.next();
            }
        });
    }

    next() {
        this.running = false;
        //get the first element off the queue and execute it
        const shift = this.queue.shift();
        if (shift) {
            this.running = true;
            shift();
        }
    }
}

module.exports = Queue;
