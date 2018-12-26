const fetch = require("node-fetch");

/**
 * @param {string} url 
 * @returns {Promise<object[]>}
 */
async function getPosts(url) {
    const { response } = await fetch("https://api.tumblr.com" + url + "&api_key=xBcVPLfdDKpH0GjMCd1whW7rPoYkzLgZD3ZwpzndISFI4huSpA")
        .then(r => r.json());
    
    const p = response._links ? response._links.next ? await getPosts(response._links.next.href) : [] : [];
    
    const posts = [...response.posts, ...p];

    return posts;
}

/**
 * @param {string} blog_url
 * @returns {Promise<object[]>}
 */
module.exports = function getTumblrBlog(blog_url) {
    return getPosts(`/v2/blog/${blog_url}/posts/text?limit=20&filter=text`);
};