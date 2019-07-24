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

const { timeout } = require("../util/promises");
const fetch = require("node-fetch");

/**
 * @param {string} key
 * @param {string} url
 * @returns {Promise<Object[]>}
 */
async function getPosts(key, url) {
    const { response } = await fetch("https://api.tumblr.com" + url + "&api_key=" + key)
        .then(r => r.json());

    await timeout(100);

    const p = response._links ? response._links.next ? await getPosts(key, response._links.next.href) : [] : [];

    const posts = [...response.posts, ...p];

    return posts;
}

/**
 * @param {string} key The API key
 * @param {string} blog_url The URL of the blog
 * @returns {Promise<Object[]>}
 */
module.exports = function getTumblrBlog(key, blog_url) {
    return getPosts(key, `/v2/blog/${blog_url}/posts/text?limit=20&filter=text`);
};
