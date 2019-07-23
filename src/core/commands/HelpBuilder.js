const TreeCommand = require("../../modules/class/TreeCommand");
const ScopeCommand = require("../../modules/class/ScopedCommand");
const AliasCommand = require("../../modules/class/AliasCommand");
const CommandPermission = require("./CommandPermission");
const Category = require("../../util/commands/Category");
const { RichEmbed } = require("discord.js");
const CONST = require("../../const");

function ucFirst(string) {
    return string.split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

function format(message, format = {}) {
    for (const f in format) {
        // eslint-disable-next-line no-useless-escape
        message = message.replace(new RegExp(`{{\s*${f}\s*}}`, "g"), format[f]);
    }
    return message;
}

class HelpBuilder extends RichEmbed {
    constructor(message, name, command) {
        super();

        const help = command.help;

        this.setColor(CONST.COLOR.PRIMARY);
        this.setAuthor(`${ucFirst(name)} command`, message.client.user.avatarURL);
        if (help.description) this.setDescription(help.description);

        const prefix = message.channel.type === "text" ? message.prefix : "";

        if (command.permissions && command.permissions !== CommandPermission.USER)
            this.addField("Permissions required:", command.permissions.toString());

        if (command.rateLimiter)
            this.addField("Rate Limiting:", command.rateLimiter.toString());

        let fields = [{ usage: "", title: "" }];
        let i = 0;

        const func = (name, command, parentName) => {
            if (command instanceof ScopeCommand) {
                command = command.getCmd(message.channel);
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
                        field.usage += "\n" + this.createParameter(name, parameter);
                    }
                }
            }

            if (command instanceof TreeCommand) {
                for (const [sub_cmd_name, sub_command] of command.sub_commands) {
                    if (sub_command instanceof AliasCommand) continue;
                    if (!sub_command.hasScope(message.channel)) continue;
                    if (sub_cmd_name === "*") continue;
                    if (!message.channel.nsfw && sub_command.explicit) continue;
                    if (!sub_command.list) continue;
                    if (sub_command.category === Category.OWNER) continue;

                    const sub_name = name + " " + sub_cmd_name;

                    field.usage += "\n\n";

                    func(sub_name, sub_command, name);
                }
            }
        };
        func(name, command);

        for (let { title, usage } of fields) {
            usage = usage.replace(/\n{2,}/g, "\n\n");

            if (usage !== "") this.addField(title || "Usage:", format(usage, { prefix }));
        }

        if (command.category) this.setFooter(`Category: ${command.category.toString()}`);
    }

    createParameter(name, parameter) {
        return `\`${name}\` ${parameter.optional ? "- optional" : ""}- ${parameter.content}`;
    }
}

HelpBuilder.sendHelp = async function sendHelp(message, name, command) {
    if (command instanceof AliasCommand) {
        command = command.command;
    }

    if (!command.help) return;

    const embed = new HelpBuilder(message, name, command);
    return await message.channel.send({ embed });
};

module.exports = HelpBuilder;
