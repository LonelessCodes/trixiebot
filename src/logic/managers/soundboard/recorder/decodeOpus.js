const fs = require("fs-extra");
const path = require("path");
const opus = require("node-opus");

const RATE = 48000;
const FRAME_SIZE = 1920;
const CHANNELS = 2;
const OUTPUT_EXTENSION = ".pcm";

/**
 * @param {{ userId: string; timestamp: number; file: string; frames: [number, number][] }} recording
 */
function getDecodedFrame(buffer, encoder, recording) {
    try {
        buffer = encoder.decode(buffer, FRAME_SIZE);
    } catch (err) {
        try {
            buffer = encoder.decode(buffer.slice(8), FRAME_SIZE);
        } catch (err) {
            console.log(`${recording.file} was unable to be decoded`);
            return null;
        }
    }
    return buffer;
}

class FramesReader {
    constructor(frames) {
        this.frames = frames;
        this.tmp = new Buffer(this.bite_size);
        this.readbytes = 0;
        this.last_frame = null;
        this.frame_index = 0;
    }

    read(chunk) {
        let frame = Buffer.concat(this.last_frame, chunk);
        const frames = [];
        while (frame.byteLength > 0) {
            const [, frame_end] = this.frames[this.frame_index];
            const end = frame_end - this.readbytes;

            if (end <= frame.byteLength) {
                const tmp = frame.slice(0, end);

                if (tmp.byteLength > 0) {
                    frames.push(tmp);
                }
                frame = frame.slice(end);
                this.readbytes += tmp.byteLength;
                this.frame_index++;
            } else {
                this.last_frame = frame;
                break;
            }
        }

        return frames;
    }
}

/**
 * @param {{ userId: string; timestamp: number; file: string; frames: [number, number][] }} recording
 * @returns {{ userId: string; timestamp: number; file: string; frames: [number, number][] }}
 */
function convertOpusRecordingToRawPCM(recording) {
    return new Promise((resolve, reject) => {
        const encoder = new opus.OpusEncoder(RATE, CHANNELS);
        const reader = new FramesReader(recording.frames);

        const outputFile = path.dirname(recording.file) + OUTPUT_EXTENSION;

        const inputStream = fs.createReadStream(recording.file);
        const outputStream = fs.createWriteStream(outputFile);

        inputStream.on("data", chunk => {
            const frames = reader.read(chunk);

            for (const frame of frames) {
                const decodedBuffer = getDecodedFrame(frame, encoder, recording);
                if (!decodedBuffer) continue;
                outputStream.write(decodedBuffer);
            }
        });
        inputStream.on("end", () => {
            fs.unlink(recording.file, err => {
                if (err) console.error(err);

                outputStream.end(err => {
                    if (err) {
                        console.error(err);
                        reject(err);
                        return;
                    }

                    const raw = Object.assign({}, recording, { file: outputFile });

                    resolve(raw);
                });
            });
        });
    });
}

/**
 * @param {{ userId: string; timestamp: number; file: string; frames: [number, number][] }[]} recordings
 */
function convertAllOpusRecordingsToRawPCM(recordings) {
    return Promise.all(recordings.map(recording => convertOpusRecordingToRawPCM(recording)));
}

module.exports = convertAllOpusRecordingsToRawPCM;