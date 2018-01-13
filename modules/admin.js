if (!global._admin) {
    const Cron = require("cron");
    const sql = require("./database");
    const db = new sql.Database("./data/admin.sqlite");

    const timeout = {
        /**
         * @type {Map<string, { job: Cron.CronJob; timeout: Date }>}
         */
        cache: new Map,
        async set(guildId, userId, timeout) {
            const row = await db.get(`SELECT * FROM timeouts WHERE guildId = "${guildId}" AND userId = "${userId}"`);
            if (!row) {
                await db.run("INSERT INTO timeouts (guildId, userId, timeout) VALUES (?, ?, ?)", [guildId, userId, Date.now() + timeout]);
            } else {
                await db.run(`UPDATE timeouts SET timeout = ${Date.now() + timeout} WHERE guildId = "${guildId}" AND userId = "${userId}"`);
            }

            const job = new Cron.CronJob({
                cronTime: new Date(Date.now() + timeout),
                onTick() {
                    timeout.delete(guildId, userId);
                },
                start: true
            });
            timeout.cache.set(`${guildId}:${userId}`, {
                timeout: new Date(Date.now() + timeout),
                job
            });
        },
        async get(guildId, userId) {
            return timeout.cache.get(`${guildId}:${userId}`).timeout;
        },
        async has(guildId, userId) {
            return timeout.cache.has(`${guildId}:${userId}`);
        },
        async delete(guildId, userId) {
            timeout.cache.delete(`${guildId}:${userId}`);
            await db.get(`DELETE FROM timeouts WHERE guildId = "${guildId}" AND userId = "${userId}"`);
        },
        async init() {
            if (timeout.initialized) return;
            timeout.initialized = true;

            await db.run("CREATE TABLE IF NOT EXISTS timeouts (guildId TEXT, userId TEXT, timeout INTEGER)");
            const rows = await db.all("SELECT * FROM timeouts");

            for (const row of rows) {
                const timeout = new Date(row.timeout);
                const job = new Cron.CronJob({
                    cronTime: timeout,
                    onTick() {
                        timeout.delete(row.guildId, row.userId);
                    },
                    start: true
                });

                if (!job.running) {
                    timeout.delete(row.guildId, row.userId);
                }
                else {
                    // is in db, only add to cache
                    timeout.cache.set(`${row.guildId}:${row.userId}`, {
                        timeout,
                        job
                    });
                }
            }
        }
    };

    global._admin = {
        timeout,
    };
}

/**
 * @type 
 {{ timeout: { 
   set(guildId: string, memberId: string, timeout: number): Promise<void>;
   get(guildId: string, memberId: string): Promise<number>;
   has(guildId: string, memberId: string): Promise<boolean>;
   delete(guildId: string, memberId: string): Promise<void>;
   init(): Promise<void>;
 }; }}
 */
module.exports = global._admin;
