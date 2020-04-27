/*
 * Copyright (C) 2018-2020 Christian Schäfer / Loneless
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

import { toHumanTime } from "../../../util/time";
import { promisify } from "util";
import path from "path";
import tmp from "tmp";
import fs from "fs-extra";
import ffmpeg from "fluent-ffmpeg";
const ffprobe = promisify(ffmpeg.ffprobe);
import mime from "mime";
import fetch from "node-fetch";
import readChunk from "read-chunk";
import fileType from "file-type";
import { isEnoughDiskSpace } from "../../../util/files";
import Discord from "discord.js";
import { EventEmitter } from "events";

import SampleID from "./SampleID";
import { UserSample, GuildSample, PredefinedSample } from "./Sample";

import Translation from "../../../modules/i18n/Translation";
import ListFormat from "../../../modules/i18n/ListFormat";

class Type {
    mime: string | null;
    ext: string | null;

    constructor(mime_type: string) {
        if (mime_type.split("/").length === 1) {
            this.mime = mime.getType(mime_type);
            this.ext = mime_type;
        } else {
            this.mime = mime_type;
            this.ext = mime.getExtension(mime_type);
        }
    }

    matches(extname: string) {
        return this.mime === mime.getType(extname);
    }
}

export default class SampleUploader extends EventEmitter {
    user: Discord.User | undefined;
    guild: Discord.Guild | undefined;
    status: Translation;

    constructor(public manager: import("../SoundboardManager"), user?: Discord.User | Discord.Guild | null) {
        super();

        if (user instanceof Discord.User) {
            this.user = user;
        } else if (user instanceof Discord.Guild) {
            this.guild = user;
        }
        this.status = new Translation("sb.checking", "Checking data...");
    }

    get scope(): "user" | "guild" | "predefined" {
        if (this.user) return "user";
        if (this.guild) return "guild";
        return "predefined";
    }

    private _setStatus(status: Translation) {
        this.status = status;
        this.emit("statusChange", status);
    }

    async upload(attachment: Discord.MessageAttachment, name: string) {
        if (!(await isEnoughDiskSpace())) {
            throw new Translation(
                "sb.error.out_of_space",
                "Trixie cannot accept any more uploads, as I'm running out of disk space"
            );
        }

        if (!attachment) {
            throw new Translation("sb.error.file_missing", "Attach a sound file to this command to add it.");
        }

        if (!name || name === "") {
            throw new Translation("sb.error.name_missing", "Pass the name for the soundclip as an argument to this command!");
        }

        if (name.length < 2 || name.length > 24) {
            throw new Translation(
                "sb.error.name_out_range",
                "The name for the soundclip should be between (incl) 2 and 24 characters!"
            );
        }

        if (!/^[a-zA-Z0-9 .,_-]*$/.test(name)) {
            throw new Translation(
                "sb.error.invalid_name",
                "Please only use common characters A-Z, 0-9, .,_- in sound sample names ;c;"
            );
        }

        switch (this.scope) {
            case "user":
                if (await this.manager.getSampleUser(this.user!, name)) {
                    throw new Translation(
                        "sb.error.user_clip_exists",
                        "You already have a soundclip with that name in your soundboard"
                    );
                }
                break;
            case "guild":
                if (await this.manager.getSampleGuild(this.guild!, name)) {
                    throw new Translation(
                        "sb.error.guild_clip_exists",
                        "You already have a soundclip with that name in this server's soundboard"
                    );
                }
                break;
            case "predefined":
                if (await this.manager.getPredefinedSample(name)) {
                    throw new Translation("sb.error.pre_clip_exists", "There is already a predefined soundclip with this name");
                }
                break;
        }

        const extname = attachment.name ? path.extname(attachment.name) : undefined;
        if (extname && !SampleUploader.isSupportedExt(extname)) {
            throw new Translation(
                "sb.error.unsupported",
                "{{extname}} files are not supported at this time. Try uploading {{supported}} files.",
                { extname, supported: SampleUploader.getSupportedFileTypes() }
            );
        }

        if (attachment.size > 1000 * 1000 * 4) {
            throw new Translation(
                "sb.error.too_big",
                "The file is too big! Please try to keep it below 4 MB. Even WAV can do that"
            );
        }

        this._setStatus(new Translation("sb.downloading", "Downloading file..."));

        const tmp_file: { path: string; fd: number; cleanupCallback(): void } = await new Promise((res, rej) => {
            tmp.file(
                {
                    prefix: "sample_download_",
                    tries: 3,
                    postfix: attachment.name ? path.extname(attachment.name) : "",
                },
                (err, path, fd, cleanupCallback) => {
                    if (err) return rej(err);
                    res({ path, fd, cleanupCallback });
                }
            );
        });

        const tmp_file_stream = fs.createWriteStream(tmp_file.path);

        try {
            const req = await fetch(attachment.url);
            await new Promise((resolve, reject) => {
                if (!req.ok) return reject(new Error("Resource not accessible"));
                tmp_file_stream.on("finish", () => {
                    tmp_file_stream.close();
                    resolve();
                });
                req.body.once("error", err => reject(err)).pipe(tmp_file_stream);
            });
        } catch {
            tmp_file.cleanupCallback();
            throw new Translation("sb.error.downloading", "Error downloading the file from Discord's servers");
        }

        this._setStatus(new Translation("sb.checking", "Checking file data..."));

        try {
            const minimumBytes = 4100;
            const fingerprint = await readChunk(tmp_file.path, 0, minimumBytes);
            const type = await fileType.fromBuffer(fingerprint);

            if (!type) {
                tmp_file.cleanupCallback();
                throw new Translation("sb.error.unsupported_unknown", "File type unknown. Try uploading {{supported}} files.", {
                    supported: SampleUploader.getSupportedFileTypes(),
                });
            }
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
            const data: any = await ffprobe(tmp_file.path);

            const duration = parseFloat(data.format.duration);
            if (Number.isNaN(duration)) throw new Error("Couldn't parse duration of the audio input");

            if (duration * 1000 > SampleUploader.MAX_DURATION) {
                tmp_file.cleanupCallback();
                throw new Translation("sb.error.too_long", "The soundclip cannot be longer than {{time}}", {
                    time: toHumanTime(SampleUploader.MAX_DURATION),
                });
            }
        } catch (err) {
            tmp_file.cleanupCallback();
            throw err;
        }

        this._setStatus(new Translation("sb.converting", "Converting and optimizing sound file..."));

        let sample: UserSample | GuildSample | PredefinedSample;

        if (this.scope !== "predefined") {
            let id: string | undefined;
            let pending = 5;
            while (pending-- >= 0) {
                id = SampleID.generate();
                const exists = await this.manager.samples.findOne({ id });
                if (exists) id = undefined;
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
                    filename: attachment.name,
                    creator: this.user!.id,
                    owners: [this.user!.id],
                    guilds: [],
                    plays: 0,
                    created_at: new Date(),
                    modified_at: new Date(),
                });
            } else {
                sample = new GuildSample(this.manager, {
                    id,
                    name,
                    filename: attachment.name,
                    guild: this.guild!.id,
                    owners: [],
                    guilds: [this.guild!.id],
                    plays: 0,
                    created_at: new Date(),
                    modified_at: new Date(),
                });
            }
        } else {
            sample = new PredefinedSample(this.manager, {
                name,
                filename: attachment.name,
                plays: 0,
                created_at: new Date(),
                modified_at: new Date(),
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

        // this._setStatus(new Translation("sb.checking_errors", "Checking converted file for errors..."));

        // try {
        //     await ffprobe(sample.file);
        // } catch (err) {
        //     this._emitError("Trixie screwed up badly in properly converting the soundclip. Please try again ;A; So sorry :c");
        //     console.log(err);
        //     await fs.unlink(sample.file);
        //     return;
        // }

        this._setStatus(new Translation("sb.saving", "Saving to database and finishing up..."));

        if (sample instanceof UserSample) {
            await this.manager.samples.insertOne({
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
            });
        } else if (sample instanceof GuildSample) {
            await this.manager.samples.insertOne({
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
            });
        } else {
            await this.manager.predefined.insertOne({
                name: sample.name,
                filename: sample.filename,
                plays: sample.plays,
                created_at: sample.created_at,
                modified_at: sample.modified_at,
            });
            this.manager.predefined_samples = Promise.resolve([...(await this.manager.predefined_samples), sample]);
        }

        return sample;
    }

    static isSupportedExt(extname: string) {
        return SampleUploader.SUPPORTED_FILES.some(t => t.matches(extname));
    }

    static getSupportedFileTypes() {
        const arr = SampleUploader.SUPPORTED_FILES.filter(t => t.ext && t.mime).map(t => t.ext as string);
        return new ListFormat(arr);
    }

    static MAX_DURATION = 30000;
    static SUPPORTED_FILES = [
        new Type("mp3"),
        new Type("audio/x-aiff"),
        new Type("ogg"),
        new Type("audio/opus"),
        new Type("wav"),
        new Type("flac"),
    ];
}
