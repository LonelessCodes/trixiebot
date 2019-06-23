const BaseCommand = require("./BaseCommand");
const { findArgs } = require("../modules/util/string");
const HelpBuilder = require("../../logic/commands/HelpBuilder");

class OverloadCommand extends BaseCommand {
    constructor(permissions) {
        super(permissions);

        /** @type {Map<string, BaseCommand>} */
        this.overloads = new Map;
    }

    async run(message, command_name, content, pass_through) {
        const args = findArgs(content);

        if (this.overloads.size < 1) {
            throw new Error("No Overloads registered");
        }

        const command = this.getCmd(args);
        if (!command) {
            await HelpBuilder.sendHelp(message, command_name, this);
            return;
        }

        if (!command.permissions.test(message.member)) {
            await command.noPermission(message);
            return;
        }
        if (command.rateLimiter && !command.rateLimiter.testAndAdd(message.author.id)) {
            await command.rateLimit(message);
            return;
        }

        await command.run(message, command_name, content, pass_through);
    }

    /**
     * @param {string[]} args 
     */
    getCmd(args) {
        const size = args.length;
        for (let [num, cmd] of this.overloads) {
            for (let option of num.split(/, */).map(s => s.trim())) {
                if (/^[0-9]+\+$/.test(option)) {
                    const num = parseInt(option.slice(0, -1));
                    if (!Number.isNaN(num) && size >= num) return cmd;
                }
                const RANGE = option.split(/-/);
                if (RANGE.length === 1) if (RANGE[0] === size) return cmd;
                else if (RANGE.length === 2) if (size >= RANGE[0] && RANGE[1] >= size) return cmd;
            }
        }
    }

    /**
     * Formatted as: 1,2,3 or 2-3, or 2+ or 1,3,5-6
     * @param {string} args 
     * @param {BaseCommand} command 
     */
    registerOverload(args, command) {
        if (this.overloads.has(args)) throw new Error("Overload already exists");

        command.setPermissions(this.permissions);
        this.overloads.set(args, command);
        return this;
    }
}

module.exports = OverloadCommand;