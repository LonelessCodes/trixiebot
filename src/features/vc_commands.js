const log = require("../modules/log");
const AudioManager = require("../logic/managers/AudioManager");
const { ConnectError } = AudioManager;

const SimpleCommand = require("../class/SimpleCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("leavevc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.destroy();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.error(err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Make Trixie leave the voice channel!"))
        .setCategory(Category.AUDIO);
    
    cr.registerAlias("leavevc", "leave");
    cr.registerAlias("leavevc", "begone");

    cr.register("stopvc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.stop();
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            log.error(err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);
    
    cr.registerAlias("stopvc", "stop");

    cr.register("joinvc", new SimpleCommand(async message => {
        const audio = AudioManager.getGuild(message.guild);

        try {
            await audio.connect(message.member);
            await message.react("👍");
        } catch (err) {
            await message.react("❌");
            if (err instanceof ConnectError) return message.channel.sendTranslated(err.message);
            log.error(err);
            message.channel.sendTranslated("Some error happened and caused some whoopsies");
        }
    }))
        .setHelp(new HelpContent()
            .setDescription("Stop whatever Trixie is saying in VC"))
        .setCategory(Category.AUDIO);
        
    cr.registerAlias("joinvc", "join");
};