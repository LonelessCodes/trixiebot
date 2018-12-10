async function statsDatabaseWrapper(stats, database) {
    stats.bot.on("change", ({name, value}) => 
        database.updateOne({ name }, { $set: { value } }, { upsert: true }));
    
    const saved = await database.find({}).toArray();
    for (const { name, value } of saved) {
        if (!stats.bot.has(name)) continue;
        stats.bot.get(name).set(value + stats.bot.get(name).get());
    }
}

module.exports = statsDatabaseWrapper;