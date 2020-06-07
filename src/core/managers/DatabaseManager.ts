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

import INFO from "../../info";
import { Db, Collection } from "mongodb";
import Discord from "discord.js";
import path from "path";
import { unlink } from "fs-extra";

export default class DatabaseManager {
    slots: import("./database/SlotsDatabase");

    constructor(public db: Db) {
        this.slots = new (require("./database/SlotsDatabase"))(db);
    }

    collection(name: string): Collection {
        return this.db.collection(name);
    }

    // TODO: build database manager in a way that all database interactions are handled
    //       by abstractions in the form of managers
    //       these abstractions should host a deleteUserData() and a getUserData() method
    //       that can be used by DataManager.deleteUserData() and DataManager.getUserData()

    async deleteUserData(user: Discord.User): Promise<void> {
        await this.slots.deleteUser(user);

        await this.collection("birthday").deleteOne({ userId: user.id });

        await this.collection("newsletter").deleteOne({ userId: user.id });

        await this.collection("penis").deleteOne({ userId: user.id });

        await this.collection("waifu").deleteMany({ ownerId: user.id });
        await this.collection("waifu").deleteMany({ waifuId: user.id });

        await this.collection("deleted_messages").deleteMany({ userId: user.id });

        await this.collection("fuck").deleteMany({ authorId: user.id });

        await this.collection("credits_accounts").deleteOne({ userId: user.id });
        await this.collection("credits_transactions").deleteMany({ userId: user.id });

        await this.collection("soundboard_samples").updateMany({ owners: user.id }, { $pull: { owners: user.id } });
        const samples = await this.collection("soundboard_samples").find({ $or: [{ owners: { $exists: true, $eq: [] } }, { creator: user.id }] }).toArray();
        await this.collection("soundboard_samples").deleteMany({ $or: [{ owners: { $exists: true, $eq: [] } }, { creator: user.id }] });
        try {
            for (const sample of samples) {
                await unlink(path.join(INFO.FILES_BASE, "soundboard", sample.id + ".ogg"));
            }
        } catch {
            // do nothing
        }
        await this.collection("soundboard_slots").deleteOne({ user: user.id });

        await this.collection("votes").deleteOne({ userId: user.id });

        await this.collection("guild_stats_new").updateMany({ userId: user.id }, { $unset: { userId: 1 } });
    }
}
