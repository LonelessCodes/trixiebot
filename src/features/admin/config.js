const Command = require("../../class/Command");

class ConfigCommand extends Command {
    // constructor(client, config) {
    //     super(client, config);
    // }

    get usage() {
        return `\`!config\` view the Trixie's config in this server
\`!config <parameter>\` view only this parameter's config
\`!config <parameter> <value>\` set a parameter in Trixie's config. "default" for default config`;
    }
}

module.exports = ConfigCommand;
