/*
 * Copyright (C) 2018-2019 Christian Schäfer / Loneless
 *
 * TrixieBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * TrixieBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
const fetch = require("node-fetch");
const readChunk = require("read-chunk");
const fileType = require("file-type");
const { isEnoughDiskSpace } = require("../../../util/files");
// eslint-disable-next-line no-unused-vars
const { User, Guild, MessageAttachment } = require("discord.js");
const Events = require("events");

const SampleID = require("./SampleID");
// eslint-disable-next-line no-unused-vars
const { Sample, UserSample, GuildSample, PredefinedSample } = require("./Sample");

const Translation = require("../../../modules/i18n/Translation");
const ListFormat = require("../../../modules/i18n/ListFormat");

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
        this.status = new Translation("sb.checking", "Checking data...");
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
        if (!await isEnoughDiskSpace()) {
            throw new Translation("sb.error.out_of_space", "Trixie cannot accept any more uploads, as I'm running out of disk space");
        }

        if (!attachment) {
            throw new Translation("sb.error.file_missing", "Attach a sound file to this command to add it.");
        }

        if (!name || name === "") {
            throw new Translation("sb.error.name_missing", "Pass the name for the soundclip as an argument to this command!");
        }

        if (name.length < 2 || name.length > 24) {
            throw new Translation("sb.error.name_out_range", "The name for the soundclip should be between (incl) 2 and 24 characters!");
        }

        // eslint-disable-next-line no-useless-escape
        if (!/^[a-zA-Z0-9 .,_\-]*$/.test(name)) {
            throw new Translation("sb.error.invalid_name", "Please only use common characters A-Z, 0-9, .,_- in sound sample names ;c;");
        }

        switch (this.scope) {
            case "user":
                if (await this.manager.getSampleUser(this.user, name)) {
                    throw new Translation("sb.error.user_clip_exists", "You already have a soundclip with that name in your soundboard");
                }
                break;
            case "guild":
                if (await this.manager.getSampleGuild(this.guild, name)) {
                    throw new Translation("sb.error.guild_clip_exists", "You already have a soundclip with that name in this server's soundboard");
                }
                break;
            case "predefined":
                if (await this.manager.getPredefinedSample(name)) {
                    throw new Translation("sb.error.pre_clip_exists", "There is already a predefined soundclip with this name");
                }
                break;
        }

        const extname = path.extname(attachment.filename);
        if (!SampleUploader.isSupportedExt(extname)) {
            throw new Translation(
                "sb.error.unsupported",
                "{{extname}} files are not supported at this time. Try uploading {{supported}} files.",
                { extname, supported: SampleUploader.getSupportedFileTypes() }
            );
        }

        if (attachment.filesize > 1000 * 1000 * 4) {
            throw new Translation("sb.error.too_big", "The file is too big! Please try to keep it below 4 MB. Even WAV can do that");
        }

        this._setStatus(new Translation("sb.downloading", "Downloading file..."));

        const tmp_file = await new Promise((res, rej) => tmp.file({
            prefix: "sample_download_", tries: 3, postfix: path.extname(attachment.filename),
        }, (err, path, fd, cleanupCallback) => {
            if (err) return rej(err);
            res({ path, fd, cleanupCallback });
        }));

        const tmp_file_stream = fs.createWriteStream(tmp_file.path);

        try {
            const req = await fetch(attachment.url);
            await new Promise((resolve, reject) => {
                if (!req.ok) return reject(new Error("Resource not accessible"));
                tmp_file_stream.on("finish", () => tmp_file_stream.close(() => resolve()));
                req.body.once("error", err => reject(err)).pipe(tmp_file_stream);
            });
        } catch (_) {
            tmp_file.cleanupCallback();
            throw new Translation("sb.error.downloading", "Error downloading the file from Discord's servers");
        }

        this._setStatus(new Translation("sb.checking", "Checking file data..."));

        try {
            const fingerprint = await readChunk(tmp_file.path, 0, fileType.minimumBytes);
            const type = fileType(fingerprint);

            if (!SampleUploader.isSupportedExt(type.ext)) {
                tmp_file.cleanupCallback();
                throw new Translation(
                    "sb.error.unsupported",
                    "{{extname}} files are not supported at this time. Try uploading {{supported}} files.",
                    { extname: type.mime, supported: SampleUploader.getSupportedFileTypes() }
                );
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
                throw new Translation("sb.error.too_long", "The soundclip cannot be longer than {{time}}", { time: toHumanTime(SampleUploader.MAX_DURATION) });
            }
        } catch (err) {
            tmp_file.cleanupCallback();
            throw err;
        }

        this._setStatus(new Translation("sb.converting", "Converting and optimizing sound file..."));

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
                    modified_at: new Date,
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
                    modified_at: new Date,
                });
            }
        } else {
            sample = new PredefinedSample(this.manager, {
                name,
                filename: attachment.filename,
                plays: 0,
                created_at: new Date,
                modified_at: new Date,
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

        this._setStatus(new Translation("sb.checking_errors", "Checking converted file for errors..."));

        // try {
        //     await ffprobe(sample.file);
        // } catch (err) {
        //     this._emitError("Trixie screwed up badly in properly converting the soundclip. Please try again ;A; So sorry :c");
        //     console.log(err);
        //     await fs.unlink(sample.file);
        //     return;
        // }

        this._setStatus(new Translation("sb.saving", "Saving to database and finishing up..."));

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
                    modified_at: sample.modified_at,
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
                    modified_at: sample.modified_at,
                }));
                break;
            case "predefined":
                await this.manager.predefined.then(db => db.insertOne({
                    name: sample.name,
                    filename: sample.filename,
                    plays: sample.plays,
                    created_at: sample.created_at,
                    modified_at: sample.modified_at,
                }));
                this.manager.predefined_samples = Promise.resolve([...(await this.manager.predefined_samples), sample]);
                break;
        }

        return sample;
    }

    static isSupportedExt(extname) {
        return SampleUploader.SUPPORTED_FILES.some(t => t.matches(extname));
    }

    static getSupportedFileTypes() {
        const arr = SampleUploader.SUPPORTED_FILES.filter(t => t.ext && t.mime).map(t => t.ext);
        return new ListFormat(arr);
    }
}
SampleUploader.MAX_DURATION = 30000;
SampleUploader.SUPPORTED_FILES = [
    new Type("mp3"), new Type("audio/x-aiff"), new Type("ogg"), new Type("audio/opus"), new Type("wav"), new Type("flac"),
];

module.exports = SampleUploader;
