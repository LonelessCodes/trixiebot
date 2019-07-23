const TreeCommand = require("../../core/commands/TreeCommand");
const ScopeCommand = require("../../core/commands/ScopedCommand");
const AliasCommand = require("../../core/commands/AliasCommand");
const CommandPermission = require("./CommandPermission");
const CommandScope = require("./CommandScope");

function format(message, format = {}) {
    for (const f in format) {
        // eslint-disable-next-line no-useless-escape
        message = message.replace(new RegExp(`{{\s*${f}\s*}}`, "g"), format[f]);
    }
    return message;
}
function createParameter(name, parameter) {
    return `\`${name}\` ${parameter.optional ? "- optional" : ""}- ${parameter.content}`;
}

function helpToJSON(config, name, command) {
    const help = command.help;

    const json = {};

    if (command.explicit) json.explicit = true;

    if (help.description) json.description = help.description;

    const prefix = config.prefix;

    if (command.permissions && command.permissions !== CommandPermission.USER)
        json.permissions = command.permissions.toString();

    if (command.rateLimiter)
        json.rateLimiter = command.rateLimiter.toString();

    let fields = [{ usage: "", title: "" }];
    let i = 0;

    const func = (name, command, parentName) => {
        if (command instanceof ScopeCommand) {
            command = command.getCmd({ type: "text" });
            if (!command) return;
        }

        const help = command.help;
        let field = fields[i];

        if (help) {
            if (help.title) {
                fields.push({
                    usage: "",
                    title: help.title.charAt(help.title.length - 1) === ":" ? help.title : help.title + ":",
                });
                i++;
                field = fields[i];
            }

            if (help.options === "" && help.usage)
                field.usage += `\`${prefix}${name}\` - ${help.usage}`;
            else if (help.options && help.usage)
                field.usage += `\`${prefix}${name}${" " + help.options}\` - ${help.usage}`;
            else if (help.options === "" && !help.usage)
                field.usage += `\`${prefix}${name}\``;
            else if (help.options && !help.usage)
                field.usage += `\`${prefix}${name}${" " + help.options}\``;
            else if (!help.options && help.usage)
                field.usage += help.usage;
            else if (!help.options && !help.usage)
                field.usage += `\`${prefix}${name}\``;

            let aliases = [...command.aliases.map(v => {
                if (v !== "*") return parentName ? parentName + " " + v : v;
                else return parentName;
            })];
            if (command instanceof TreeCommand && command.sub_commands.has("*")) {
                aliases = [...aliases, ...command.sub_commands.get("*").aliases.map(v => name + " " + v)];
            }

            if (aliases.length > 0)
                field.usage += ` *(alias ${aliases.map(a => `\`${prefix}${a}\``).join(", ")})*`;

            if (help.parameters.size > 0) {
                for (const [name, parameter] of help.parameters) {
                    field.usage += "\n" + createParameter(name, parameter);
                }
            }
        }

        if (command instanceof TreeCommand) {
            for (const [sub_cmd_name, sub_command] of command.sub_commands) {
                if (sub_command instanceof AliasCommand) continue;
                if (!sub_command.scope.has(CommandScope.FLAGS.GUILD)) continue;
                if (sub_cmd_name === "*") continue;

                const sub_name = name + " " + sub_cmd_name;

                field.usage += "\n\n";

                func(sub_name, sub_command, name);
            }
        }
    };
    func(name, command);

    let str = "";

    for (let { title, usage } of fields) {
        usage = usage.replace(/\n{2,}/g, "\n\n");

        if (usage !== "")
            str += (title ? "**" + title + "**" : "") + "\n" + format(usage, { prefix });
    }

    json.usage = str;

    if (command.category) json.category = command.category.toString();

    return json;
}

module.exports = helpToJSON;
