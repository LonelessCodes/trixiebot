const getDatabase = require("./src/modules/getDatabase");

function getPrevVal(values, query) {
    let old_val = undefined;
    if (values.has(query.guildId)) {
        const map = values.get(query.guildId);
        if (map.has(query.data || "")) {
            old_val = map.get(query.data || "");
        }
    }
    return old_val;
}

function setNewVal(values, query, value) {
    let map = values.get(query.guildId);
    if (!map) {
        map = new Map;
        values.set(query.guildId, map);
    }
    map.set(query.data || "", value);
}

async function init() {
    const database = await getDatabase("trixiedev");

    const old_db = database.collection("guild_stats");
    const db = database.collection("guild_stats_new");
    await db.createIndex({ ts: 1 }, { expireAfterSeconds: 3600 * 24 * 92 }); // expire after 3 months

    const rows = await old_db.find({}).toArray();
    const docs = [];
    const values = {
        users: new Map
    };

    for (let row of rows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
        if (row.type === "value") {
            const prev_val = getPrevVal(values[row.id], row);
            const value = row.value;
            setNewVal(values[row.id], row, value);

            let added = 0;
            let removed = 0;
            if (prev_val) {
                const diff = row.value - prev_val;
                added = diff > 0 ? diff : 0;
                removed = diff < 0 ? -diff : 0;
            }

            const doc = {
                _id: row._id,
                guildId: row.guildId,
                id: row.id,
                type: "value",
                ts: row.timestamp,
                value,
                added,
                removed
            };
            if (row.data) doc.data = row.data;

            docs.push(doc);
        } else {
            const value = row.value;
            const doc = {
                _id: row._id,
                guildId: row.guildId,
                id: row.id,
                type: "counter",
                ts: row.timestamp,
                value,
            };
            if (row.data) doc.data = row.data;
            
            docs.push(doc);
        }
    }

    const results = await db.insertMany(docs, { ordered: true });

    console.log("uwu", results);

    process.exit(0);
}

init();