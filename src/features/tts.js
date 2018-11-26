const log = require("../modules/log");
const voicerssKey = require("../../keys/voicerss.json");
const fetch = require("node-fetch");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("tts", new class extends BaseCommand {
        async call(message, content) {
            if (content === "") {
                return;
            }

            // Only try to join the sender's voice channel if they are in one themselves
            if (!message.member.voiceChannel) {
                message.react("❌");
                message.channel.sendTranslated("You need to join a voice channel first!");
                log("Gracefully aborted attempt to call tts. User in no voice channel");
                return;
            }

            if (message.client.voiceConnections.get(message.channel.guild.id)) {
                message.react("❌");
                message.channel.sendTranslated("I only have one muzzle, you know!");
                log("Gracefully aborted attempt to call tts. Already present in a voice chat");
                return;
            }

            if (content.length > 90000) {
                message.react("❌");
                message.channel.sendTranslated("I'm sorry to disappoint you, but I may only use up to 100 character :/");
                log("Gracefully aborted attempt to call tts. Text longer than 100 characters");
                return;
            }

            const url = `http://api.voicerss.org/?key=${voicerssKey.key}&hl=en-us&f=44khz_16bit_mono&c=OGG&src=${content}`;

            const connection = await message.member.voiceChannel.join();
            message.react("👍");
            const request = await fetch(url);
            const dispatcher = connection.playStream(request.body);
            dispatcher.addListener("end", async () => {
                await connection.disconnect();
                if (message.client.voiceConnections.get(message.channel.guild.id)) {
                    await message.client.voiceConnections.get(message.channel.guild.id).disconnect();
                    await message.client.voiceConnections.get(message.channel.guild.id)._destroy();
                    await message.client.voiceConnections.remove(message.client.voiceConnections.get(message.guild.id));
                }
            });
            dispatcher.addListener("error", async error => {
                await connection.disconnect();
                log(error);
                if (message.client.voiceConnections.get(message.channel.guild.id)) {
                    await message.client.voiceConnections.get(message.channel.guild.id).disconnect();
                    await message.client.voiceConnections.get(message.channel.guild.id)._destroy();
                    await message.client.voiceConnections.remove(message.client.voiceConnections.get(message.guild.id));
                }
            });
        }
    })
        .setHelp(new HelpContent()
            .setDescription("Make Trixie join the user's current voice channel and read the `message` out aloud.")
            .setUsage("<message>")
            .addParameter("message", "The message to be read out by Trixie"))
        .setCategory(Category.AUDIO);
};