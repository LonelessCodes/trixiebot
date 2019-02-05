const path = require("path");
const tmp = require("tmp");
const fs = require("fs-extra");
const log = require("../../../modules/log");
const decodeOpus = require("./recorder/decodeOpus");
const isEnoughDiskSpace = require("../../../modules/isEnoughDiskSpace");
// eslint-disable-next-line no-unused-vars
const WriteStream = fs.WriteStream;
// eslint-disable-next-line no-unused-vars
const { User, Guild, VoiceConnection, VoiceReceiver, GuildMember, Message } = require("discord.js");
const Events = require("events");
// eslint-disable-next-line no-unused-vars
// const { Sample, UserSample, GuildSample, PredefinedSample } = require("./Sample");

tmp.setGracefulCleanup();

class SampleRecorder extends Events {
    /**
     * 
     * @param {SoundboardManager} manager 
     * @param {User|Guild} user 
     */
    constructor(manager, user) {
        super();

        this.manager = manager;
        if (user instanceof User) {
            this.user = user;
            this.scope = "user";
        } else if (user instanceof Guild) {
            this.guild = user;
            this.scope = "guild";
        }
        this.status = "Checking data...";
        
        /** @type {VoiceReceiver} */
        this.receiver = null;
        /** @type {VoiceConnection} */
        this.connection = null;
        /** @type {Map<string, WriteStream} */
        this.writeStreams = new Map;

        /** @type {{ userId: string; timestamp: number; file: string; frames: [number, number][] }[]} */
        this.recordings = [];

        this.client = user.client;

        this._guildMemberSpeaking = this._guildMemberSpeaking.bind(this);
        this.client.on("guildMemberSpeaking", this._guildMemberSpeaking);

        this.cleanupCallback = null;
    }

    /**
     * @param {GuildMember} member 
     * @param {boolean} speaking 
     */
    _guildMemberSpeaking(member, speaking) {
        // close the writestream whhen a member stops speaking
        if (speaking) return;
        if (!member.voiceChannel) return;

        const receiver = this.voiceReceivers.get(member.voiceChannelID);
        if (!receiver) return;

        const writeStream = this.writeStreams.get(member.user.id);
        if (!writeStream) return;

        writeStream.end(err => { if (err) log.error(err); });
        this.writeStreams.delete(member.user.id);
    }

    _emitError(message) {
        this.emit("error", message);
        if (this.cleanupCallback) this.cleanupCallback();
    }

    _setStatus(status) {
        this.status = status;
        this.emit("statusChange", status);
    }
    
    /**
     * @param {VoiceConnection} connection 
     * @param {Message} message 
     * @param {string} name 
     */
    async record(connection, message, name) {
        if (!(await isEnoughDiskSpace())) {
            return this._emitError("Trixie cannot accept any more uploads, as I'm running out of disk space");
        }

        let ask_for_name = false;

        if (!name || name === "") ask_for_name = true;
        else {
            const name_err = await this.manager.checkSampleName(name, this.scope, this.user || this.guild);
            if (name_err) return this._emitError(name_err);
        }

        const tmp_dir = await new Promise((res, rej) => tmp.dir({ prefix: "sample_recorder_" }, (err, path, fd, cleanupCallback) => {
            if (err) return rej(err);
            res({ path, fd, cleanupCallback });
        }));
        this.cleanupCallback = tmp_dir.cleanupCallback;

        const receiver = connection.createReceiver();
        this.receiver = receiver;
        this.connection = connection;

        const bytesMap = new Map;
        receiver.on("opus", (user, buffer) => {
            let writeStream = this.writeStreams.get(user.id);
            if (!writeStream) {
                /**
                 * If there isn't an outgoing writeStream and a frame of silence is received then it must be the left over trailing silence frames used to signal the end of a transmission.
                 * If we do not ignore this frame at this point we will create a new writestream that is labelled as starting at the current time, but there will actually be a time delay before it is further populated by data once the user has begun speaking again.
                 * This delay would not be captured however since no data is sent for it, so the result would be the audio fragment being out of the time when reassambled.
                 * For this reason a packet of silence cannot be used to create a new writestream. 
                 */
                if (buffer.toString("hex") === "f8fffe") return;

                const timestamp = Date.now();
                const file = `${user.id}-${timestamp}.opus`;
                const outputPath = path.join(tmp_dir, file);
                writeStream = fs.createWriteStream(outputPath, { encoding: "binary" });
                this.writeStreams.set(user.id, writeStream);

                this.recordings.push({
                    userId: user.id,
                    timestamp,
                    file: outputPath,
                    frames: []
                });
            }

            let bytes = bytesMap.get(user.id);
            if (bytes == null) bytes = 0;

            writeStream.write(buffer);

            const newbytes = bytes + buffer.byteLength;
            bytesMap.set(user.id, newbytes);

            for (const item of this.recordings.reverse()) {
                if (item.userId !== user.id) continue;
                item.frames.push([bytes, newbytes]);
                break;
            }
        });

        message.react("🛑").catch(() => { });
        const collected = await message.awaitReactions((reaction, user) => reaction.emoji.name === "🛑" && connection.channel.members.has(user.id), { time: 30000 }).catch(() => { });
        message.clearReactions().catch(() => { });

        this.stop();

        if (ask_for_name) {
            const messages = await message.channel.awaitMessages(m => connection.channel.members.has(m.author.id), { time: 120000 });
            if (!messages.first()) return this._emitError("Whoopsie, you didn't choose a name. Welp");

            name = messages.first().content;
            
            const name_err = await this.manager.checkSampleName(name, this.scope, this.user || this.guild);
            if (name_err) return this._emitError(name_err);
        }

        try {
            this.recordings = await decodeOpus(this.recordings); 
        } catch (err) {
            this.cleanupCallback();
            throw err;
        }
    }

    stop() {
        if (this.receiver) {
            this.receiver.destroy();
            this.receiver = null;
        }
        for (const [, writeStream] of this.writeStreams) writeStream.end(err => { if (err) log.error(err); });
        this.writeStreams.clear();
        this.client.off("guildMemberSpeaking", this._guildMemberSpeaking);
    }
}

module.exports = SampleRecorder;