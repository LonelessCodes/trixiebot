if (!global._admin) {
    const Cron = require("cron");
    const sql = require("./database");
    const db = new sql.Database("./data/admin.sqlite");

    const timeout = {
        /**
         * @type {Map<string, { job: Cron.CronJob; timeout: Date }>}
         */
        cache: new Map,
        async set(guildId, memberId, ms) {
            const row = await db.get(`SELECT * FROM timeouts WHERE guildId = "${guildId}" AND memberId = "${memberId}"`);
            if (!row) {
                await db.run("INSERT INTO timeouts (guildId, memberId, expiresAt) VALUES (?, ?, ?)", [guildId, memberId, Date.now() + ms]);
            } else {
                await db.run(`UPDATE timeouts SET timeout = ${Date.now() + ms} WHERE guildId = "${guildId}" AND memberId = "${memberId}"`);
            }

            const job = new Cron.CronJob({
                cronTime: new Date(Date.now() + ms),
                onTick() {
                    timeout.delete(guildId, memberId);
                },
                start: true
            });
            timeout.cache.set(`${guildId}:${memberId}`, {
                expiresAt: new Date(Date.now() + ms),
                job
            });
        },
        async get(guildId, memberId) {
            return timeout.cache.get(`${guildId}:${memberId}`);
        },
        async has(guildId, memberId) {
            return timeout.cache.has(`${guildId}:${memberId}`);
        },
        async delete(guildId, memberId) {
            if (typeof memberId === "string") {
                timeout.cache.delete(`${guildId}:${memberId}`);
                await db.get(`DELETE FROM timeouts WHERE guildId = "${guildId}" AND memberId = "${memberId}"`);
            } else {
                for (let key of timeout.cache.keys()) {
                    if (key.split(":")[0] !== guildId) continue;
                    timeout.cache.delete(key);
                }
                await db.get(`DELETE FROM timeouts WHERE guildId = "${guildId}"`);
            }
        },
        async entries(guildId) {
            const keys = Array.from(timeout.cache.keys());
            return keys.filter(key => {
                return key.split(":")[0] === guildId;
            }).map(key => {
                const split = key.split(":");
                const result = timeout.cache.get(`${guildId}:${split[1]}`);
                return {
                    guildId,
                    memberId: split[1],
                    expiresAt: result.expiresAt,
                    job: result.job
                };
            });
        },
        async init() {
            if (timeout.initialized) return;
            timeout.initialized = true;

            await db.run("CREATE TABLE IF NOT EXISTS timeouts (guildId TEXT, memberId TEXT, expiresAt INTEGER)");
            const rows = await db.all("SELECT * FROM timeouts");

            for (const row of rows) {
                const expiresAt = new Date(row.timeout);
                const job = new Cron.CronJob({
                    cronTime: expiresAt,
                    onTick() {
                        timeout.delete(row.guildId, row.memberId);
                    },
                    start: true
                });

                if (!job.running) {
                    timeout.delete(row.guildId, row.memberId);
                }
                else {
                    // is in db, only add to cache
                    timeout.cache.set(`${row.guildId}:${row.memberId}`, {
                        expiresAt,
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
   set(guildId: string, memberId: string, ms: number): Promise<void>;
   get(guildId: string, memberId: string): Promise<Date>;
   has(guildId: string, memberId: string): Promise<boolean>;
   delete(guildId: string, memberId?: string): Promise<void>;
   entries(guildId: string): Promise<Array<{ guildId: string; memberId: string; expiresAt: Date; job: Cron.CronJob }>>;
   init(): Promise<void>;
 }; }}
 */
module.exports = global._admin;
