const BaseCommand = require("./BaseCommand");

class AliasCommand extends BaseCommand {
    constructor(aliasName, originalName, command) {
        super();

        this.aliasName = aliasName;
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

    async run(message, command_name, content) {
        await this.command.run(message, command_name, content);
    }
}

module.exports = AliasCommand;