const BaseCommand = require("./BaseCommand");

class AliasCommand extends BaseCommand {
    constructor(originalName, command) {
        super();

        this.originalName = originalName;
        this.command = command;
    }

    get parentCategory() {
        return this.command.category;
    }

    get parentName() {
        return this.originalName;
    }

    get category() {
        return null;
    }

    async beforeProcessCall(message, content) {
        return await this.command.beforeProcessCall(message, content);
    }

    async run(message, command_name, content, pass_through) {
        await this.command.run(message, command_name, content, pass_through);
    }
}

module.exports = AliasCommand;