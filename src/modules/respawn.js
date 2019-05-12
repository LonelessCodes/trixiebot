const events = require("events");
const { fork, exec, spawn } = require("child_process");
const ps = require("ps-tree");
const os = require("os");

const kill = function (pid, sig) {
    if (os.platform() === "win32") {
        exec("taskkill /pid " + pid + " /T /F");
        return;
    }
    ps(pid, function (_, pids) {
        pids = (pids || []).map(function (item) {
            return parseInt(item.PID, 10);
        });

        pids.push(pid);

        pids.forEach(function (pid) {
            try {
                process.kill(pid, sig);
            } catch (err) {
                // do nothing
            }
        });
    });
};
const defaultSleep = function (sleep) {
    sleep = Array.isArray(sleep) ? sleep : [sleep || 1000];
    return function (restarts) {
        return sleep[restarts - 1] || sleep[sleep.length - 1];
    };
};

class Monitor extends events.EventEmitter {
    constructor(command, opts) {
        super();

        this.id = null; // for respawn-group

        this.status = "stopped";
        this.command = command;
        this.name = opts.name;
        this.cwd = opts.cwd || ".";
        this.env = opts.env || {};
        this.data = opts.data || {};
        this.uid = opts.uid;
        this.gid = opts.gid;
        this.pid = 0;
        this.crashes = 0;
        this.stdio = opts.stdio;
        this.stdout = opts.stdout;
        this.stderr = opts.stderr;
        this.silent = opts.silent;
        this.windowsVerbatimArguments = opts.windowsVerbatimArguments;
        this.spawnFn = opts.fork
            ? fork
            : spawn;

        this.crashed = false;
        this.sleep = typeof opts.sleep === "function" ? opts.sleep : defaultSleep(opts.sleep);
        this.maxRestarts = opts.maxRestarts === 0 ? 0 : opts.maxRestarts || -1;
        this.kill = opts.kill === false ? false : opts.kill || 30000;

        this.child = null;
        this.started = null;
        this.timeout = null;
    }

    stop(cb) {
        if (this.status === "stopped" || this.status === "stopping") return cb && cb();
        this.status = "stopping";

        clearTimeout(this.timeout);

        if (cb) {
            if (this.child) this.child.on("exit", cb);
            else process.nextTick(cb);
        }

        if (!this.child) return this._stopped();

        const self = this;
        const child = self.child;
        const sigkill = function () {
            kill(child.pid, "SIGKILL");
            self.emit("force-kill");
        };

        let wait;
        const onexit = function () {
            clearTimeout(wait);
        };

        if (this.kill !== false) {
            wait = setTimeout(sigkill, this.kill);
            this.child.on("exit", onexit);
        }

        kill(this.child.pid);
    }

    restart() {
        if (this.status === "running") return this;

        const self = this;
        let restarts = 0;
        let clock = 60000;

        const loop = function () {
            const cmd = typeof self.command === "function" ? self.command() : self.command;
            const child = self.spawnFn(cmd[0], cmd.slice(1), {
                cwd: self.cwd,
                env: { ...process.env, ...self.env },
                uid: self.uid,
                gid: self.gid,
                stdio: self.stdio,
                silent: self.silent,
                windowsVerbatimArguments: self.windowsVerbatimArguments
            });

            self.started = new Date();
            self.status = "running";
            self.child = child;
            self.pid = child.pid;
            self.emit("spawn", child);

            child.setMaxListeners(0);

            if (child.stdout) {
                child.stdout.on("data", function (data) {
                    self.emit("stdout", data);
                });

                if (self.stdout) {
                    child.stdout.pipe(self.stdout);
                }
            }

            if (child.stderr) {
                child.stderr.on("data", function (data) {
                    self.emit("stderr", data);
                });

                if (self.stderr) {
                    child.stderr.pipe(self.stderr);
                }
            }

            child.on("message", function (message) {
                self.emit("message", message);
            });

            const clear = function () {
                if (self.child !== child) return false;
                self.child = null;
                self.pid = 0;
                return true;
            };

            child.on("error", function (err) {
                self.emit("warn", err); // too opionated? maybe just forward err
                if (!clear()) return;
                if (self.status === "stopping") return self._stopped();
                self._crash();
            });

            child.on("exit", function (code, signal) {
                self.emit("exit", code, signal);
                if (!clear()) return;
                if (self.status === "stopping") return self._stopped();

                clock -= (Date.now() - (self.started ? self.started.getTime() : 0));

                if (clock <= 0) {
                    clock = 60000;
                    restarts = 0;
                }

                if (++restarts > self.maxRestarts && self.maxRestarts !== -1) return self._crash();

                self.status = "sleeping";
                self.emit("sleep");

                const restartTimeout = self.sleep(restarts);
                self.timeout = setTimeout(loop, restartTimeout);
            });
        };

        clearTimeout(this.timeout);
        loop();

        if (this.status === "running") this.emit("start");

        return this;
    }

    send(data) {
        if (!this.child) return;
        this.child.send(data);
    }

    toJSON() {
        const doc = {
            id: this.id,
            name: this.name,
            status: this.status,
            started: this.started,
            pid: this.pid,
            crashes: this.crashes,
            command: this.command,
            cwd: this.cwd,
            env: this.env,
            data: this.data
        };

        if (!doc.id) delete doc.id;
        if (!doc.pid) delete doc.pid;
        if (!doc.name) delete doc.name;
        if (!doc.data) delete doc.data;
        if (!doc.started) delete doc.started;

        return doc;
    }

    _crash() {
        if (this.status !== "running") return;
        this.status = "crashed";
        this.crashes++;
        this.emit("crash");
        if (this.status === "crashed") this._stopped();
    }

    _stopped() {
        if (this.status === "stopped") return;
        if (this.status !== "crashed") this.status = "stopped";
        this.started = null;
        this.emit("stop");
    }
}

/** @type {(command: string[], opts: {}) => Monitor} */
const respawn = function (command, opts) {
    if (typeof command !== "function" && !Array.isArray(command)) return respawn(command.command, command);
    return new Monitor(command, opts || {});
};

module.exports = respawn;