const sql = require("./modules/database");

const db = new sql.Database("./data/fucks.sqlite");

const phrases = [{
    text: "hides ${name}'s sausage",
    by: "Lycan"
}, {
    text: "stuffs ${name}'s turkey",
    by: "Xormak"
}, {
    text: "she squeezes ${name}'s and squirts",
    by: "Lycan"
}, {
    text: "does the lust and le thrust on ${name}",
    by: "Lycan"
}, {
    text: "rides ${name}'s skin bus into tuna town",
    by: "Lycan"
}, {
    text: "${name} spears the bearded clam of her",
    by: "Lycan"
}, {
    text: "does the four legged frolic with ${name}",
    by: "Lycan"
}, {
    text: "${name} plows the peach",
    by: "Atreyu Night"
}, {
    text: "she buries ${name}'s hatchet",
    by: "Loneless"
}, {
    text: "heavily homos ${name}",
    by: "Atreyu Night"
}, {
    text: "${name} pickles her cucumber",
    by: "chib"
}, {
    text: "repetitive docking of ${name}'s iss moduals",
    by: "chib"
}];

db.run("CREATE TABLE IF NOT EXISTS fucks (text TEXT, lowercase TEXT, author TEXT)").then(async () => {
    for (const phrase of phrases) {
        await db.run("INSERT INTO fucks (text, lowercase, author) VALUES (?, ?, ?)", [phrase.text, phrase.text.toLowerCase(), phrase.by]);
    }
    console.log(await db.all("SELECT * FROM fucks WHERE author =\"Lycan\""));

    db.close();
});