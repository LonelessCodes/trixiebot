const log = require("../modules/log");
const voicerss = require("../keys/voicerss.json");
const request = require("request");
const Command = require("../modules/Command");

const usage = `Usage:
\`!tts <message>\` - joins the user's current voice channel and reads the message out aloud.`;

const command = new Command(async function onmessage(message) {
    let msg = message.content;
    while (/ \ /g.test(msg))
        msg = msg.replace(/ \ /g, " ");

    if (/^\!tts/i.test(message.content)) {
        const src = msg.substring(5);
        if (src === "") {
            message.channel.send(usage);
            return;
        }

        // Only try to join the sender's voice channel if they are in one themselves
        if (!message.member.voiceChannel) {
            message.react("❌");
            message.channel.send('You need to join a voice channel first!');
            return;
        }

        if (message.client.voiceConnections.get(message.channel.guild.id)) {
            message.react("❌");
            message.channel.send('I only have one muzzle, you know!');
            return;
        }

        if (src.length > 100) {
            message.react("❌");
            message.channel.send("I'm sorry to disappoint you, but I may only use 100 character :/");
            return;
        }

        const url = `http://api.voicerss.org/?key=${voicerss.key}&hl=en-gb&f=8khz_8bit_mono&src=${src}`;

        const connection = await message.member.voiceChannel.join();
        message.react("👍");
        const dispatcher = connection.playStream(request(url));
        dispatcher.on('end', async () => {
            await connection.disconnect();
            if (message.client.voiceConnections.get(message.channel.guild.id)) {
                await message.client.voiceConnections.get(message.channel.guild.id).disconnect()
                await message.client.voiceConnections.get(message.channel.guild.id)._destroy()
                await message.client.voiceConnections.remove(client.voiceConnections.get(message.guild.id))
            }
        });
        dispatcher.on('error', async error => {
            await connection.disconnect();
            log(error);
            if (message.client.voiceConnections.get(message.channel.guild.id)) {
                await message.client.voiceConnections.get(message.channel.guild.id).disconnect()
                await message.client.voiceConnections.get(message.channel.guild.id)._destroy()
                await message.client.voiceConnections.remove(client.voiceConnections.get(message.guild.id))
            }
        });
        return;
    }
});

module.exports = command;
