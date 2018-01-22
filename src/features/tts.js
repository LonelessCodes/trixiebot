const log = require("../modules/log");
const voicerss = require("../../keys/voicerss.json");
const request = require("request");
const Command = require("../modules/Command");

const command = new Command(async function onmessage(message) {
    if (!/^!tts\b/i.test(message.content)) return;

    const src = message.content.substr(5);
    if (src === "") {
        await message.channel.send("Usage: " + this.usage);
        log("Sent tts usage");
        return;
    }

    // Only try to join the sender's voice channel if they are in one themselves
    if (!message.member.voiceChannel) {
        message.react("❌");
        message.channel.send("You need to join a voice channel first!");
        log("Gracefully aborted attempt to call tts. User in no voice channel");
        return;
    }

    if (message.client.voiceConnections.get(message.channel.guild.id)) {
        message.react("❌");
        message.channel.send("I only have one muzzle, you know!");
        log("Gracefully aborted attempt to call tts. Already present in a voice chat");
        return;
    }

    if (src.length > 100) {
        message.react("❌");
        message.channel.send("I'm sorry to disappoint you, but I may only use up to 100 character :/");
        log("Gracefully aborted attempt to call tts. Text longer than 100 characters");
        return;
    }

    const url = `http://api.voicerss.org/?key=${voicerss.key}&hl=en-gb&f=44khz_16bit_mono&c=OGG&src=${src}`;

    const connection = await message.member.voiceChannel.join();
    message.react("👍");
    const stream = request(url);
    const dispatcher = connection.playStream(stream);
    dispatcher.on("end", async () => {
        await connection.disconnect();
        if (message.client.voiceConnections.get(message.channel.guild.id)) {
            await message.client.voiceConnections.get(message.channel.guild.id).disconnect();
            await message.client.voiceConnections.get(message.channel.guild.id)._destroy();
            await message.client.voiceConnections.remove(message.client.voiceConnections.get(message.guild.id));
        }
    });
    dispatcher.on("error", async error => {
        await connection.disconnect();
        log(error);
        if (message.client.voiceConnections.get(message.channel.guild.id)) {
            await message.client.voiceConnections.get(message.channel.guild.id).disconnect();
            await message.client.voiceConnections.get(message.channel.guild.id)._destroy();
            await message.client.voiceConnections.remove(message.client.voiceConnections.get(message.guild.id));
        }
    });
    log("Joined voice chat to serve tts");
    return;
}, {
    usage: "`!tts <message>` - joins the user's current voice channel and reads the message out aloud.",
    ignore: true
});

module.exports = command;
