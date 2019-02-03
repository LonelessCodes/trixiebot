const log = require("../modules/log");
const voicerssKey = require("../../keys/voicerss.json");
const fetch = require("node-fetch");
const AudioManager = require("../logic/managers/AudioManager");
const { ConnectError } = AudioManager;

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("tts", new class extends BaseCommand {
        async call(message, content) {
            if (content === "") return;

            if (!/[a-z0-9]/.test(content)) {
                message.react("❌");
                message.channel.sendTranslated("Ehhh rather send a normal message. This kind of message is know to kinda break me");
                return;
            }

            const audio = AudioManager.getGuild(message.guild);

            if (audio.playing) {
                message.react("❌");
                message.channel.sendTranslated("Something is already playing, don't wanna interrupt!");
                log("Gracefully aborted attempt to call tts. Already playing audio");
                return;
            }

            if (content.length > 90000) {
                message.react("❌");
                message.channel.sendTranslated("I'm sorry to disappoint you, but I may only use up to 100 character :/");
                log("Gracefully aborted attempt to call tts. Text longer than 100 characters");
                return;
            }

            try {
                const url = `http://api.voicerss.org/?key=${voicerssKey.key}&hl=en-us&f=44khz_16bit_mono&c=OGG&src=${encodeURIComponent(content)}`;

                const connection = await audio.connect(message.member);
                const request = await fetch(url);

                const dispatcher = connection.playStream(request.body);
                dispatcher.once("start", () => {
                    connection.player.streamingData.pausedTime = 0;
                });

                await message.react("👍");
            } catch (err) {
                await message.react("❌");
                if (err instanceof ConnectError) return message.channel.sendTranslated(err.message);
                log.error(err);
                message.channel.sendTranslated("Some error happened and caused some whoopsies");
            }
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Make Trixie join the user's current voice channel and read the `message` out aloud.")
            .setUsage("<message>")
            .addParameter("message", "The message to be read out by Trixie"))
        .setCategory(Category.AUDIO);
};