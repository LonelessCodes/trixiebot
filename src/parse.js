const fs = require("fs-extra");
const { walk } = require("./util/files");

const t = /new Translation\(\s*("[\w.]+"),\s*("[\w\s:.,!?|"\\{}`'()#<>-]+")(?!\s*\+)/g;
const tp = /new TranslationPlural\(\s*("[\w.]+"),\s*\[\s*("[\w\s:.,!?|"\\{}`'()#<>-]+"),\s*("[\w\s:.,!?|"\\{}`'()#<>-]+")\]/g;

walk("./src/").then(files => {
    const arr = [];
    for (let file of files) {
        const cont = fs.readFileSync(file, "utf8");
        let match;
        while (match = t.exec(cont)) {
            const id = JSON.parse(match[1]);
            let phrase = match[2];
            const regex = /((?<!\\)")/g;
            while (match = regex.exec(phrase.slice(1, -1))) {
                phrase = phrase.slice(0, match.index + 2);
                break;
            }
            arr.push({ id: id, phrase: JSON.parse(phrase) });
        }
        while (match = tp.exec(cont)) {
            arr.push({ id: JSON.parse(match[1]), phrase: { one: JSON.parse(match[2]), other: JSON.parse(match[3]) } });
        }
    }

    const tree = JSON.parse(fs.readFileSync("./assets/locale/en.json", "utf8"));

    let add = 0;
    for (let item of arr) {
        const val = item.id.split(".").reduce((obj, index) => {
            if (obj === null || !(index in obj)) return null;

            return obj[index];
        }, tree);

        if (val &&
            val.one && val.one === item.phrase.one &&
            val.other && val.other === item.phrase.other) continue;
        if (val && val === item.phrase) continue;

        // Split the provided term and run the callback for each subterm.
        const split = item.id.split(".");
        const path = split.slice(0, -1);
        const index = split[split.length - 1];

        const obj = path.reduce((obj, index) => {
            if (obj == null) return null;

            // If our current target object (in the locale tree) doesn't exist or
            // it doesn't have the next subterm as a member...
            if (!(index in obj)) {
                // ...check if we're allowed to create new branches.
                obj[index] = {};
            }

            // Return a reference to the next deeper level in the locale tree.
            return obj[index];
        }, tree);

        if (!obj) continue;

        obj[index] = item.phrase;

        add++;
    }

    fs.writeFileSync("./assets/locale/en.json", JSON.stringify(tree, null, 2));

    console.log(tree);
    console.log("Additions:", add);
});
