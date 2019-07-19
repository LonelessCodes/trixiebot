const BaseCommand = require("./BaseCommand");
const AliasCommand = require("./AliasCommand");
const { splitArgs } = require("../modules/util/string");

class TreeCommand extends BaseCommand {
    constructor(permissions) {
        super(permissions);

        this.sub_commands = new Map;
    }

    async run(message, command_name, content, pass_through, timer) {
        const args = splitArgs(content, 2);

        if (this.sub_commands.size === 0) {
            throw new Error("No SubCommands registered");
        }

        let command = this.sub_commands.get(args[0]);
        let is_default = false;
        if (!command) {
            command = this.sub_commands.get("*");
            is_default = true;
        }
        if (!command)
            return; //Use SimpleTreeCommand then?
        
        if (!command.permissions.test(message.member || message.author)) {
            await command.noPermission(message);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(message.author.id)) {
            await command.rateLimit(message);
            return;
        }

        await command.run(message, command_name + (is_default ? "" : " " + args[0]), is_default ? content : args[1], pass_through, timer);
    }

    registerSubCommand(id, command) {
        if (this.sub_commands.has(id)) throw new Error("Command name already exists");

        command.setPermissions(this.permissions);
        this.sub_commands.set(id, command);
        return command;
    }

    registerSubCommandAlias(command, alias) {
        if (!this.sub_commands.has(command)) throw new Error(command + " isn't in the command map...");
        if (this.sub_commands.has(alias)) throw new Error("Alias '" + alias + "' is already registered in the command map...");

        const cmd = this.sub_commands.get(command);
        cmd.aliases.push(alias);
        this.registerSubCommand(alias, new AliasCommand(command, cmd));
    }

    registerDefaultCommand(command) {
        // not a great solution
        // but the only thing that works
        if (typeof command.linkTo === "function") command.linkTo(this);
        command.setPermissions(this.permissions);
        this.registerSubCommand("*", command);
        return command;
    }
}

module.exports = TreeCommand;