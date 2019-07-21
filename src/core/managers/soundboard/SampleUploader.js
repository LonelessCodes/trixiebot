const { toHumanTime } = require("../../../util/time");
const { promisify } = require("util");
const path = require("path");
const tmp = require("tmp");
const fs = require("fs-extra");
// const prism = require("prism-media");
// const ogg = require("ogg");
const ffmpeg = require("fluent-ffmpeg");
const ffprobe = promisify(ffmpeg.ffprobe);
const mime = require("mime");
const request = require("request");
const readChunk = require("read-chunk");
const fileType = require("file-type");
const { isEnoughDiskSpace } = require("../../../util/files");
// eslint-disable-next-line no-unused-vars
const { User, Guild, MessageAttachment } = require("discord.js");
const Events = require("events");

const SampleID = require("./SampleID");
// eslint-disable-next-line no-unused-vars
const { Sample, UserSample, GuildSample, PredefinedSample } = require("./Sample");

tmp.setGracefulCleanup();

class Type {
    /**
     * @param {string} mime_type
     */
    constructor(mime_type) {
        if (mime_type.split("/").length === 1) {
            this.mime = mime.getType(mime_type);
            this.ext = mime_type;
        } else {
            this.mime = mime_type;
            this.ext = mime.getExtension(mime_type);
        }
    }

    matches(extname) {
        return this.mime === mime.getType(extname);
    }
}

class SampleUploader extends Events {
    /**
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
        } else if (user == null) {
            this.scope = "predefined";
        }
        this.status = "Checking data...";
    }

    _emitError(message) {
        this.emit("error", message);
    }

    _setStatus(status) {
        this.status = status;
        this.emit("statusChange", status);
    }

    /**
     * @param {MessageAttachment} attachment 
     * @param {string} name 
     */
    async upload(attachment, name) {
        if (!(await isEnoughDiskSpace())) {
            return this._emitError("Trixie cannot accept any more uploads, as I'm running out of disk space");
        }

        if (!attachment) {
            return this._emitError("Attach a sound file to this command to add it.");
        }

        if (!name || name === "") {
            return this._emitError("Pass the name for the soundclip as an argument to this command!");
        }

        if (name.length < 2 || name.length > 24) {
            return this._emitError("The name for the soundclip should be between (incl) 2 and 24 characters!");
        }

        // eslint-disable-next-line no-useless-escape
        if (!/^[a-zA-Z0-9 .,_\-]*$/.test(name)) {
            return this._emitError("Please only use common characters A-Z, 0-9, .,_- in sound sample names ;c;");
        }

        switch (this.scope) {
            case "user":
                if (await this.manager.getSampleUser(this.user, name)) {
                    return this._emitError("You already have a soundclip with that name in your soundboard");
                }
                break;
            case "guild":
                if (await this.manager.getSampleGuild(this.guild, name)) {
                    return this._emitError("You already have a soundclip with that name in this server's soundboard");
                }
                break;
            case "predefined":
                if (await this.manager.getPredefinedSample(name)) {
                    return this._emitError("There is already a predefined soundclip with this name");
                }
                break;
        }

        const extname = path.extname(attachment.filename);
        if (!SampleUploader.isSupportedExt(extname)) {
            return this._emitError(`${extname} files are not supported at this time. Try uploading ${SampleUploader.getSupportedFileTypes()} files.`);
        }

        if (attachment.filesize > 1000 * 1000 * 4) {
            return this._emitError("The file is too big! Please try to keep it below 4 MB. Even WAV can do that");
        }

        this._setStatus("Downloading file...");

        const tmp_file = await new Promise((res, rej) => tmp.file({ prefix: "sample_download_", tries: 3, postfix: path.extname(attachment.filename) }, (err, path, fd, cleanupCallback) => {
            if (err) return rej(err);
            res({ path, fd, cleanupCallback });
        }));

        const tmp_file_stream = fs.createWriteStream(tmp_file.path);

        try {
            await new Promise((resolve, reject) => {
                request(attachment.url, { encoding: null })
                    .on("error", () => reject())
                    .on("response", response => {
                        response.pipe(tmp_file_stream);
                        tmp_file_stream.on("finish", () => tmp_file_stream.close(() => resolve()));
                    });
            });
        } catch (_) {
            tmp_file.cleanupCallback();
            this._emitError("Error downloading the file from Discord's servers");
        }

        this._setStatus("Checking file data...");

        try {
            const fingerprint = await readChunk(tmp_file.path, 0, fileType.minimumBytes);
            const type = fileType(fingerprint);

            if (!SampleUploader.isSupportedExt(type.ext)) {
                tmp_file.cleanupCallback();
                return this._emitError(`${type.mime} files are not supported at this time. Try uploading ${SampleUploader.getSupportedFileTypes()} files.`);
            }
        } catch (err) {
            tmp_file.cleanupCallback();
            throw err;
        }

        try {
            const data = await ffprobe(tmp_file.path);

            const duration = parseFloat(data.format.duration);
            if (Number.isNaN(duration)) throw new Error("Couldn't parse duration of the audio input");

            if (duration * 1000 > SampleUploader.MAX_DURATION) {
                tmp_file.cleanupCallback();
                return this._emitError(`The soundclip cannot be longer than ${toHumanTime(SampleUploader.MAX_DURATION)}`);
            }                                                                   
        } catch (err) {
            tmp_file.cleanupCallback();
            throw err;
        }

        this._setStatus("Converting and optimizing sound file...");

        /** @type {Sample} */
        let sample = null;

        if (this.scope !== "predefined") {
            let id = null;
            let pending = 5;
            while (pending-- >= 0) {
                id = SampleID.generate();
                const exists = await this.manager.samples.then(db => db.findOne({ id }));
                if (exists) id = null;
                else break;
            }

            if (!id) {
                tmp_file.cleanupCallback();
                throw new Error("Unique ID couldn't be created");
            }

            if (this.scope === "user") {
                sample = new UserSample(this.manager, {
                    id,
                    name,
                    filename: attachment.filename,
                    creator: this.user.id,
                    owners: [this.user.id],
                    guilds: [],
                    plays: 0,
                    created_at: new Date,
                    modified_at: new Date
                });
            } else if (this.scope === "guild") {
                sample = new GuildSample(this.manager, {
                    id,
                    name,
                    filename: attachment.filename,
                    guild: this.guild.id,
                    owners: [],
                    guilds: [this.guild.id],
                    plays: 0,
                    created_at: new Date,
                    modified_at: new Date
                });
            }
        } else {
            sample = new PredefinedSample(this.manager, {
                name,
                filename: attachment.filename,
                plays: 0,
                created_at: new Date,
                modified_at: new Date
            });
        }

        try {
            await fs.ensureDir(path.dirname(sample.file), 0o0777);

            // const transcoder = new prism.FFmpeg({
            //     args: [
            //         "-analyzeduration", "0",
            //         "-loglevel", "0",
            //         "-f", "s16le",
            //         "-ar", "48000",
            //         "-ac", "2",
            //     ]
            // });

            // const opus_encoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 1920 });
            // opus_encoder.setBitrate(96e3);

            // const ogg_encoder = new ogg.Encoder;

            await new Promise((res, rej) => {                
                // ogg_encoder.pipe(fs.createWriteStream(sample.file))
                //     .on("error", err => rej(err))
                //     .on("close", () => res());

                // fs.createReadStream(tmp_file.path)
                //     .pipe(transcoder)
                //     .pipe(opus_encoder)
                //     .pipe(ogg_encoder.stream())
                //     .on("error", err => rej(err));
                
                ffmpeg(tmp_file.path)
                    .audioCodec("libopus")
                    .audioBitrate(96)
                    .audioChannels(2)
                    .audioFrequency(48000)
                    .saveToFile(sample.file)
                    .on("error", err => rej(err))
                    .on("end", () => res())
                    .run();
            });
            tmp_file.cleanupCallback();
        } catch (err) {
            tmp_file.cleanupCallback();
            throw err;
        }

        this._setStatus("Checking converted file for errors...");

        // try {
        //     await ffprobe(sample.file);
        // } catch (err) {
        //     this._emitError("Trixie screwed up badly in properly converting the soundclip. Please try again ;A; So sorry :c");
        //     console.log(err);
        //     await fs.unlink(sample.file);
        //     return;
        // }

        this._setStatus("Saving to database and finishing up...");

        switch (this.scope) {
            case "user":
                await this.manager.samples.then(db => db.insertOne({
                    id: sample.id,
                    name: sample.name,
                    filename: sample.filename,
                    creator: sample.creator,
                    scope: "user",
                    owners: sample.owners,
                    guilds: sample.guilds,
                    plays: sample.plays,
                    created_at: sample.created_at,
                    modified_at: sample.modified_at
                }));
                break;
            case "guild":
                await this.manager.samples.then(db => db.insertOne({
                    id: sample.id,
                    name: sample.name,
                    filename: sample.filename,
                    guild: sample.guild,
                    scope: "guild",
                    owners: sample.owners,
                    guilds: sample.guilds,
                    plays: sample.plays,
                    created_at: sample.created_at,
                    modified_at: sample.modified_at
                }));
                break;
            case "predefined":
                await this.manager.predefined.then(db => db.insertOne({
                    name: sample.name,
                    filename: sample.filename,
                    plays: sample.plays,
                    created_at: sample.created_at,
                    modified_at: sample.modified_at
                }));
                this.manager.predefined_samples = Promise.resolve([...(await this.manager.predefined_samples), sample]);
                break;
        }

        this.emit("success", sample);
    }

    static isSupportedExt(extname) {
        return SampleUploader.SUPPORTED_FILES.some(t => t.matches(extname));
    }

    static getSupportedFileTypes() {
        const arr = SampleUploader.SUPPORTED_FILES.filter(t => t.ext && t.mime).map(t => t.ext);
        return arr.slice(0, -1).join(", ") + " or " + arr[arr.length - 1];
    }
}
SampleUploader.MAX_DURATION = 30000;
SampleUploader.SUPPORTED_FILES = [new Type("mp3"), new Type("audio/x-aiff"), new Type("ogg"), new Type("audio/opus"), new Type("wav"), new Type("flac")];

module.exports = SampleUploader;