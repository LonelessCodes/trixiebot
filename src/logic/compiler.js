function parse(str) {
    let lines = [];

    let line = "";
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
        let char = str.charAt(i);
        if (char === "\n" && !inQuote && line !== "") {
            lines.push(line);
            continue;
        }

        if (char === "\"") inQuote = !inQuote;
    }


}

parse(`

if guild.users.size >= 1000
    channel.send "omg so many users"

channel.send "ily u guys owo \${guild.users.size}"
`);