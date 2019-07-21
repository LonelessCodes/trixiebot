const { timeout } = require("../util/promises");
const fetch = require("node-fetch");

/**
 * @param {string} url 
 * @returns {Promise<object[]>}
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
 * @param {string} blog_url
 * @returns {Promise<object[]>}
 */
module.exports = function getTumblrBlog(key, blog_url) {
    return getPosts(key, `/v2/blog/${blog_url}/posts/text?limit=20&filter=text`);
};