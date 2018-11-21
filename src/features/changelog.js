// const path = require("path");
// const git = require("simple-git")(path.resolve(path.join(__dirname, "..", "..")));
const Command = require("../class/Command");

// git.log((err, log) => {
//     if (err) return;
//     const changelog = Array.from(log.all).filter(log => {
//         if (/^v?([0-9]+.){2}[0-9a-z]+/g.test(log.message))
//             return true;
//         else return false;
//     }).map(log => {
//         const split = log.message.split(" - ");
//         const title = split.shift();
//         const message = split.map(m => " - " + m);
//         return { title, message };
//     });
    
//     console.log(log);
//     console.log(changelog);
// });

class ChangelogCommand extends Command {
    async onmessage(message) {
        if (!message.prefixUsed) return;
        if (!/^changelog\b/i.test(message.content)) return;

        return;
    }

    usage(prefix) {
        return `\`${prefix}changelog\` to get the recent changelogs`;
    }
}

module.exports = ChangelogCommand;
