/*
 * Copyright (C) 2020 Christian Schäfer / Loneless
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

const log = require("../../../log").default.namespace("watch cmd");
import config from "../../../config";

import Derpibooru, { Image } from "../../Derpibooru";
import Discord from "discord.js";
import mongo from "mongodb";
import { doNothing } from "../../../util/util";

import getNextSequence from "../../db/getNextSequence";

//                                                                                               no real gore, but candy gore is allowed
// const filter_tags = ["underage", "foalcon", "bulimia", "self harm", "suicide", "animal cruelty", "(gore AND -candy gore)", "foal abuse"];

function markdown(desc: string): string {
    return desc
        .replace(/"([^"]+)":(http[^\s]+)/g, (s: string, text: string, link: string) => {
            return `[${text}](${link})`;
        })
        .replace(/"([^"]+)":(\/[^\s]+)/g, (s: string, text: string, link: string) => {
            return `[${text}](https://derpibooru.org${link})`;
        })
        .replace(/>>(\d+)/g, (s: string, id: string) => {
            return `[>>${id}](https://derpibooru.org/images/${id})`;
        });
}

export interface DerpiDocument {
    _id: mongo.ObjectId;
    id: number;
    service: string;
    guildId: string;
    channelId: string;
    tags: string[];
    last_id: string;
}

export default class DerpiWatch {
    client: Discord.Client;
    db_client: mongo.Db;
    db: mongo.Collection<DerpiDocument>;
    derpi: Derpibooru;

    constructor(client: Discord.Client, db: mongo.Db) {
        this.client = client;
        this.db_client = db;
        this.db = db.collection("watches");
        this.derpi = new Derpibooru(config.get("derpibooru.key"));

        this.fetchUpdates().catch(doNothing);
    }

    async getConfigs() {
        return await this.db.find({ service: "derpibooru" }).sort("channelId", 1).toArray();
    }

    async fetchUpdates() {
        try {
            const raw_watched = await this.getConfigs();

            const watched_grouped: DerpiDocument[][] = [];
            if (raw_watched.length) {
                watched_grouped.unshift([raw_watched[0]]);
                for (const watch of raw_watched.slice(1)) {
                    if (watched_grouped[0][0].channelId === watch.channelId && watched_grouped[0].length <= 10) {
                        watched_grouped[0].unshift(watch);
                    } else {
                        watched_grouped.unshift([watch]);
                    }
                }
            }

            for (const watches of watched_grouped) {
                const guild = this.client.guilds.cache.get(watches[0].guildId);
                if (!guild) continue;
                if (!guild.available) continue;

                const channel = guild.channels.cache.get(watches[0].channelId) as Discord.TextChannel;
                if (!channel) {
                    for (const watch of watches)
                        await this.removeConfig(guild, watch.id).catch(doNothing);
                    continue;
                }

                const ids = watches.map(watch => parseInt(watch.last_id));
                const min_id = Math.min(...ids);
                const max_id = Math.min(...ids);

                let tags: string;
                // all have same id
                if (max_id === min_id) {
                    tags = watches.map(watch => "(" + Derpibooru.encodeTags(watch.tags) + ")").join(" OR ");
                } else {
                    tags = watches.map(watch => "((" + Derpibooru.encodeTags(watch.tags) + "),id.gt:" + watch.last_id + ")").join(" OR ");
                }

                const results_raw = await this.derpi.searchAll(tags, {
                    start_at: String(min_id), sf: "id", sd: "asc",
                });

                // retry images without thumbnails later
                const results: Image[] = [];
                for (const result of results_raw) {
                    // break once the first image without thumbnails is reached
                    if (!result.thumbnails_generated) break;
                    results.push(result);
                }

                if (results.length === 0) continue;

                const last_id = results[results.length - 1].id;
                // await this.db.updateOne({ _id: { $in: watches.map(watch => watch._id) } }, { $set: { last_id: String(last_id) } });
                for (const watch of watches) await this.db.updateOne({ _id: watch._id }, { $set: { last_id: String(last_id) } });

                for (const result of results) {
                    const embed = new Discord.MessageEmbed()
                        .setColor(DerpiWatch.COLOR)
                        .setAuthor(`New Upload #${result.id}`, "https://derpicdn.net/img/view/2020/2/29/2286475.png", `https://derpibooru.org/images/${result.id}`)
                        .setImage(result.representations.full)
                        .setTimestamp(new Date(result.created_at));
                    if (result.description && result.description !== "") {
                        let desc = result.description;
                        if (desc.length > 300) {
                            desc = desc.substr(0, 297) + "...";
                        }
                        embed.setDescription(markdown(desc));
                    }

                    // TODO figure out a way to figure out which image is triggered by which watch trigger
                    // if (result.uploader) {
                    //     embed.setFooter(`Uploader: ${result.uploader} | Triggered by watch #${watches.id}`);
                    // } else {
                    //     embed.setFooter(`Triggered by watch #${watches.id}`);
                    // }
                    if (result.uploader) {
                        embed.setFooter(`Uploader: ${result.uploader}`);
                    }

                    const artists = Derpibooru.getArtists(result.tags).slice(0, 5);
                    if (!artists.length && result.uploader) artists.push(result.uploader);

                    // stitch together list of artists with i18n
                    if (artists.length) await channel.send(`${artists.map(a => `**${a}**`).join(", ")} just posted something on Derpibooru`, embed).catch(console.error);
                    else await channel.send("Someone just posted something on Derpibooru", embed).catch(console.error);
                }
            }
        } catch (err) {
            log.error(err);
        }

        setTimeout(this.fetchUpdates.bind(this), 1000 * 60);
    }

    async addConfig(channel: Discord.TextChannel, tags: string | string[]): Promise<void> {
        tags = Derpibooru.resolveTags(tags);

        // when a watch is added, last image id must be looked up, so that it will
        // search only from there!!!!
        const result = await this.derpi.fetch("search/images", { per_page: 1, q: "*" });
        if (!result.images.length) throw new Error("Something went wrong...");

        const last_id = String(result.images[0].id);

        const watch_id = await getNextSequence(this.db_client, { context: "watches", guildId: channel.guild.id });

        await this.db.insertOne({ service: "derpibooru", id: watch_id, guildId: channel.guild.id, channelId: channel.id, tags, last_id });
    }

    async removeConfig(guild: Discord.Guild, id: number): Promise<boolean> {
        const res = await this.db.deleteOne({ guildId: guild.id, id });
        return !!res.deletedCount;
    }

    static COLOR = 0x3d92d0;
}
