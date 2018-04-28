const Command = require("../../class/Command");

class ConfigCommand extends Command {
    // constructor(client, config) {
    //     super(client, config);
    // }

    usage(prefix) {
        return `\`${prefix}config\` view the Trixie's config in this server
\`${prefix}config <parameter>\` view only this parameter's config
\`${prefix}config <parameter> <value>\` set a parameter in Trixie's config. "default" for default config`;
    }
}

module.exports = ConfigCommand;
