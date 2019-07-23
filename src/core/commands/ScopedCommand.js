const BaseCommand = require("./BaseCommand");
const CommandScope = require("../../util/commands/CommandScope");

class ScopedCommand extends BaseCommand {
    constructor(permissions) {
        super(permissions);

        /** @type {BaseCommand[]} */
        this.scopes = [];
    }

    async run(message, command_name, content, pass_through, timer) {
        if (this.scopes.length === 0) {
            throw new Error("No Scopes registered");
        }

        const command = this.getCmd(message.channel);
        if (!command) return;

        if (!command.permissions.test(message.member || message.author)) {
            await command.noPermission(message);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(message.author.id)) {
            await command.rateLimit(message);
            return;
        }

        await command.run(message, command_name, content, pass_through, timer);
    }

    getCmd(channel) {
        for (let command of this.scopes) {
            if (command.hasScope(channel)) return command;
        }
    }

    /**
     * Data that can be resolved to give a bitfield. This can be:
     * * A string (see {@link BitField.FLAGS})
     * * A bit number
     * * An instance of BitField
     * * An Array of BitFieldResolvable
     * @typedef {string|number|CommandScope|BitFieldResolvable[]} BitFieldResolvable
     */

    /**
     * @param {BitFieldResolvable} scope
     * @param {BaseCommand} command
     * @returns {ScopedCommand}
     */
    registerScope(scope, command) {
        command = command.setScope(scope);
        const scopes = command.scope.toArray();
        for (let s of this.scopes) {
            for (let v of scopes) {
                if (s.scope.has(CommandScope.FLAGS[v])) throw new Error("Scope already registered");
            }
        }

        this.scopes.push(command);

        return this;
    }
}

module.exports = ScopedCommand;
