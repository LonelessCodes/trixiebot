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

import fs from "fs-extra";
import path from "path";

export default function bannerPrinter(dev: boolean, trixie_v: string, discord_v: string) {
    const txt = fs.readFileSync(path.join(__dirname, "..", "..", "..", "assets", "text", "banner.txt"), "utf8");
    console.log(txt, trixie_v, dev ? " dev" : "", discord_v);
}
