const fs = require("fs-extra");
const path = require("path");

module.exports = async function () {
    const p = path.join(__dirname, "..", "..", "CHANGELOG.md");
    if (!(await fs.exists(p))) return [];

    const file = await fs.readFile(p, "utf8");

    const commits = file.split(/<a name="\d+.\d+.\d+\w?"><\/a>/g).slice(1);

    const clean = commits.map(commit => {
        const body = commit
            .replace(/\(\[[\w\d]{7}\]\(http.+\)\)/g, "")
            .replace(/\(http[^(]*\)/g, "");
        return {
            body: body.replace(/##? \[\d+.\d+.\d+\w?\] \(\d{4}-\d{2}-\d{2}\)/g, "").trim(),
            version: /##? \[(\d+.\d+.\d+\w?)\]/g.exec(body)[1],
            date: /##? \[\d+.\d+.\d+\w?\] \((\d{4}-\d{2}-\d{2})\)/g.exec(body)[1]
        };
    });

    return clean;
};