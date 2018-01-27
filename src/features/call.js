const log = require("../modules/log");
const voicerssKey = require("../../keys/voicerss.json");
const { timeout } = require("../modules/util");
const request = require("request");
const EventEmitter = require("events");
const Discord = require("discord.js");
const Command = require("../class/Command");

async function disconnect(connection) {
    await connection.disconnect();
    if (connection.client.voiceConnections.get(connection.channel.guild.id)) {
        await connection.client.voiceConnections.get(connection.channel.guild.id).disconnect();
        await connection.client.voiceConnections.get(connection.channel.guild.id)._destroy();
        await connection.client.voiceConnections.remove(connection.client.voiceConnections.get(connection.channel.guild.id));
    }
}

function dialing(connection) {
    function getDialer() {
        const tmp = connection.playFile("./resources/call/dialing.ogg");
        tmp.once("end", () => {
            sound = getDialer();
        });
        return tmp;
    }

    let sound = getDialer();

    return {
        get destroyed() {
            return sound.destroyed;
        },
        end() {
            sound.removeAllListeners("end");
            sound.end();
        },
        pause() {
            sound.pause();
        },
        resume() {
            sound.resume();
        }
    };
}

class Call extends EventEmitter {
    constructor(client, message, voiceChannel) {
        super();

        this.id = Discord.SnowflakeUtil.generate();
        this.guildIdOrigin = message.guild.id;
        this.client = client;
        this.message = message;
        this.voiceChannelOrigin = voiceChannel;
        this.maxReconnectTries = 3;
        this.reconnectTimeout = 2000;

        this.voiceStateChanged = this.voiceStateChanged.bind(this);

        this.init().catch(err => {
            log.error(err);
            this.destroy();
        });
    }

    async getRandomVoiceChannel() {
        const channels = new Discord.Collection;
        this.client.guilds.forEach(guild => {
            if (guild.id === this.message.guild.id) return;
            guild.members.forEach(member => {
                if (member.voiceChannelID &&
                    member.voiceChannel.permissionsFor(member.voiceChannel.guild.me).has(Discord.Permissions.FLAGS.SPEAK) &&
                    member.voiceChannel.joinable &&
                    !member.voiceChannel.members.has(member.voiceChannel.guild.me) &&
                    !channels.has(member.voiceChannelID)) {
                    channels.set(member.voiceChannelID, member.voiceChannel);
                }
            });
        });

        return channels.random();
    }

    async init() {
        this.connOrigin = await this.voiceChannelOrigin.join();
        this.message.channel.send("Alright!");

        this.receiverOrigin = this.connOrigin.createReceiver();
        this.connOrigin.addListener("speaking", (user, speaking) => {
            if (this.connTarget && speaking && user.id !== this.client.user.id) {
                this.connTarget.playOpusStream(this.receiverOrigin.createOpusStream(user));
            }
        });

        this.connOrigin.once("disconnect", () => {
            if (!this.connTarget) {
                this.destroy();
                return;
            }

            const soundDispatcher = this.connTarget.playFile("./resources/call/origin-closed-connection.ogg");
            soundDispatcher.once("end", () => {
                this.destroy();
            });
        });

        this.call().catch(err => {
            log.error(err);
            this.destroy();
        });
    }

    async call() {
        const dialingSound = dialing(this.connOrigin);
        
        // getting random channel
        // try to join random channel. Retry if failed
        // failed too often -> cancel operation
        // resolved at some point -> continue like planned
        for (let i = 0; i < this.maxReconnectTries; i++) {
            const random = await this.getRandomVoiceChannel();
            if (!random) {
                dialingSound.end();
    
                const noServersFound = this.connOrigin.playFile("./resources/call/no-servers-found.ogg");
                noServersFound.addListener("end", () => {
                    this.destroy();
                });
                return;
            }

            try {
                this.connTarget = await random.join();
                break;
            } catch (err) {
                if (i < this.maxReconnectTries - 1) {
                    await timeout(this.reconnectTimeout);
                    continue;
                }

                dialingSound.end();
    
                const failedConnecting = this.connOrigin.playFile("./resources/call/failed-connecting.ogg");
                failedConnecting.addListener("end", () => {
                    this.destroy();
                });
                return;
            }
        }

        this.guildIdTarget = this.connTarget.voiceChannel.guild.id;
        Call.targets.set(this.guildIdTarget, this);

        const incomingTransmissionTTSStream = request(`http://api.voicerss.org/?key=${voicerssKey.key}&hl=en-us&f=44khz_16bit_mono&c=OGG&src=Hi, it's Trixie again! Incoming transmission from ${this.message.guild.name}. Have fun`);
        const incomingTransmissionTTS = this.connTarget.playStream(incomingTransmissionTTSStream);

        await new Promise(resolve => {
            incomingTransmissionTTS.addListener("end", resolve);
            incomingTransmissionTTS.addListener("error", resolve);
        });

        dialingSound.end();

        this.receiverTarget = this.connTarget.createReceiver();
        
        this.connTarget.addListener("speaking", (user, speaking) => {
            if (speaking && user.id !== this.client.user.id) {
                this.connOrigin.playOpusStream(this.receiverTarget.createOpusStream(user));
            }
        });

        this.connTarget.once("disconnect", () => {
            this.destroyTarget();

            const soundDispatcher = this.connOrigin.playFile("./resources/call/connect-new-server.ogg");
            soundDispatcher.once("end", () => {
                this.call().catch(err => {
                    log.error(err);
                    this.destroy();
                });
            });
        });

        this.client.addListener("voiceStateUpdate", this.voiceStateChanged);
    }

    endTarget() {
        if (this.connTarget) this.connTarget.disconnect(); // let's see how many errors this will throw and how giant the heap will get
    }

    end() {
        this.connOrigin.disconnect(); // let's see how many errors this will throw and how giant the heap will get
    }

    voiceStateChanged(oldMember) {
        if (oldMember.voiceChannel.id === this.connTarget.id &&
            this.connTarget.members.size <= 1) {
            this.connTarget.removeAllListeners("disconnect"); // so that normal error file doesn't play
            
            this.destroyTarget();

            const soundDispatcher = this.connOrigin.playFile("./resources/call/all-users-left.ogg");
            soundDispatcher.once("end", () => {
                this.call().catch(err => {
                    log.error(err);
                    this.destroy();
                });
            });
        }
    }

    destroyTarget() {
        this.client.removeListener("voiceStateUpdate", this.voiceStateChanged);
        if (this.receiverTarget && !this.receiverTarget.destroyed) this.receiverTarget.destroy();
        if (this.connTarget) disconnect(this.connTarget).catch(err => {
            log.error(err);
        });
        this.receiverTarget = null;
        this.connTarget = null;
        Call.targets.delete(this.guildIdTarget);
    }

    destroy() {
        this.destroyTarget();
        if (this.receiverOrigin && !this.receiverOrigin.destroyed) this.receiverOrigin.destroy();
        if (this.connOrigin) disconnect(this.connOrigin).catch(err => {
            log.error(err);
        });
        this.receiverOrigin = null;
        this.connOrigin = null;
        Call.calls.delete(this.id);
        Call.origins.delete(this.guildIdOrigin);
    }
}
Call.calls = new Discord.Collection;
Call.origins = new Discord.Collection;
Call.targets = new Discord.Collection;
Call.new = function (...args) {
    const call = new Call(...args);
    Call.calls.set(call.id, call);
    Call.origins.set(call.guildIdOrigin, call);
    return call;
};

async function onmessage(message) {
    if (/^!call hangup\b/i.test(message.content)) {
        if (Call.targets.has(message.guild.id)) {
            const call = Call.targets.get(message.guild.id);
            call.endTarget();
            await message.channel.send("Hung up on them");
            log(`Hung up on incoming call ${call.id} from ${call.message.guild.name}`);
            return;
        }

        if (Call.origins.has(message.guild.id)) {
            const call = Call.origins.get(message.guild.id);
            call.end();
            await message.channel.send("Hung up and cleared the session");
            log(`Hung up the call ${call.id}`);
            return;
        }

        await message.channel.send("No call to hang up on");

        return;
    }

    if (/^!call\b/i.test(message.content)) {
        // Only try to join the sender's voice channel if they are in one themselves
        if (!message.member.voiceChannel) {
            message.channel.send("You need to join a voice channel first!");
            log("Gracefully aborted attempt to call. User in no voice channel");
            return;
        }
    
        if (message.client.voiceConnections.get(message.channel.guild.id)) {
            message.channel.send("I only have one muzzle, you know!");
            log("Gracefully aborted attempt to call. Already present in a voice chat");
            return;
        }
    
        Call.new(message.client, message, message.member.voiceChannel);
        return;
    }
}

class CallCommand extends Command {
    constructor(client, config) {
        super(client, config);
        this.onmessage = onmessage.bind(this);
    }
    get usage() {
        return "`!call` - calls into a random server Trixie happens to be in as well.\n`!call hangup` - hang up on an incoming call or, in case your server started the call, end the session entirely";
    }
}

module.exports = CallCommand;
