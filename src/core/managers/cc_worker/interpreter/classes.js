const cpc = require("../../../../modules/concurrency/cpc")(process);
const { Permissions: DiscordPermissions } = require("discord.js");
const c = require("./types");

async function Emoji(context, id) {
    if (id instanceof c.StringLiteral) {
        id = id.content;

        const emoji = await cpc.awaitAnswer("emoji.get", {
            emojiId: id,
            guildId: context.guildId,
        }, { timeout: 5000 })
            .catch(err => { throw context.error(err.name + ": " + err.message); });

        if (emoji) return await Emoji(context, emoji);
        return new c.NullLiteral;
    }
    const opts = id;

    const emoji = new c.ObjectLiteral({
        animated: new c.BooleanLiteral(opts.animated),
        name: new c.StringLiteral(opts.name),
        id: opts.id ? new c.StringLiteral(opts.id) : new c.NullLiteral,
        identifier: opts.id ? new c.StringLiteral(`${opts.name}:${opts.id}`) : new c.NullLiteral,
        createdAt: opts.createdAt ? new c.TimeLiteral(opts.createdAt) : new c.NullLiteral,
        url: opts.url ? new c.StringLiteral(opts.url) : new c.NullLiteral,
        roles: opts.roles ? new c.ArrayLiteral(await Promise.all(opts.roles.map(role => Role(context, role)))) : new c.ArrayLiteral([]),

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            if (!opts.id || !opts.requiresColons) {
                return new c.StringLiteral(opts.name);
            }
            return new c.StringLiteral(`<${opts.animated ? "a" : ""}:${opts.name}:${opts.id}>`);
        }),
    });
    return emoji;
}

async function Reaction(context, opts) {
    return new c.ObjectLiteral({
        count: new c.NumberLiteral(opts.count),
        emoji: await Emoji(context, opts.emoji),
        id: new c.StringLiteral(opts.id),

        // methods
        getMembers: new c.NativeFunc("getMembers", async function getMembers(context) {
            const members = await cpc.awaitAnswer("reaction.getMembers", {
                guildId: context.guildId, messageId: opts.messageId, reactionId: opts.id,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < members.length; i++) {
                members[i] = await GuildMember(context, members[i]);
            }
            return new c.ArrayLiteral(members);
        }),
    });
}

async function Mentions(context, opts) {
    return new c.ObjectLiteral({
        members: new c.ArrayLiteral(await Promise.all(opts.members.map(member => GuildMember(context, member)))),
        channels: new c.ArrayLiteral(await Promise.all(opts.channels.map(channel => Channel(context, channel)))),
        roles: new c.ArrayLiteral(await Promise.all(opts.roles.map(role => Role(context, role)))),
        everyone: new c.BooleanLiteral(opts.everyone),
    });
}

function Attachment(context, opts) {
    return new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        filename: new c.StringLiteral(opts.filename),
        filesize: new c.NumberLiteral(opts.filesize),
        height: opts.height ? new c.NumberLiteral(opts.height) : new c.NullLiteral,
        width: opts.width ? new c.NumberLiteral(opts.width) : new c.NullLiteral,
        url: new c.StringLiteral(opts.url),
    });
}

async function Message(context, id) {
    if (id instanceof c.StringLiteral) {
        id = id.content;

        const message = await cpc.awaitAnswer("message.get", {
            messageId: id,
            guildId: context.guildId,
        }, { timeout: 5000 })
            .catch(err => { throw context.error(err.name + ": " + err.message); });

        if (message) return await Message(context, message);
        return new c.NullLiteral;
    }
    const opts = id;

    return new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        member: await GuildMember(context, opts.member),
        channel: await Channel(context, opts.channel),
        text: new c.StringLiteral(opts.text),
        createdAt: new c.TimeLiteral(opts.createdAt),
        editedAt: opts.editedAt ? new c.TimeLiteral(opts.editedAt) : new c.NullLiteral,
        mentions: await Mentions(context, opts.mentions),
        pinned: new c.BooleanLiteral(opts.pinned),
        reactions: new c.ArrayLiteral(await Promise.all(opts.reactions.map(reaction =>
            Reaction(context, { ...reaction, messageId: opts.id })
        ))),
        attachments: new c.ArrayLiteral(opts.attachments.map(a => Attachment(context, a))),

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            return new c.StringLiteral(opts.text);
        }),
        delete: new c.NativeFunc("delete", async function del(context) {
            await cpc.awaitAnswer("message.delete", {
                guildId: context.guildId, messageId: opts.id,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            return new c.NullLiteral;
        }),
        edit: new c.NativeFunc("edit", async function edit(context, content, embed) {
            let message;
            if (content instanceof c.StringLiteral) {
                message = await cpc.awaitAnswer("message.edit", {
                    messageId: opts.id, guildId: context.guildId,
                    content: content.content, embed: embed ? embed.isEmbed ? embed.getEmbed() : null : null,
                }, { timeout: 5000 })
                    .catch(err => { throw context.error(err.name + ": " + err.message); });
            } else if (content ? content.isEmbed : false) {
                message = await cpc.awaitAnswer("message.edit", {
                    messageId: opts.id, guildId: context.guildId, embed: embed.getEmbed(),
                }, { timeout: 5000 })
                    .catch(err => { throw context.error(err.name + ": " + err.message); });
            }
            if (message) return await Message(context, message);
        }),
        react: new c.NativeFunc("react", async function react(context, ...emojis) {
            const e = [];
            for (let emoji of emojis) {
                if (emoji instanceof c.ObjectLiteral) {
                    e.push(emoji.content.identifier.content || emoji.content.name.content);
                } else if (emoji instanceof c.StringLiteral) {
                    e.push(emoji.content);
                }
            }
            await cpc.awaitAnswer("message.react", {
                guildId: context.guildId, messageId: opts.id, emojis: e,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            return new c.NullLiteral;
        }),
    });
}

async function Role(context, id) {
    if (id instanceof c.StringLiteral) {
        id = id.content;

        const member = await cpc.awaitAnswer("role.get", {
            roleId: id,
            guildId: context.guildId,
        }, { timeout: 5000 })
            .catch(err => { throw context.error(err.name + ": " + err.message); });

        if (member) return await Role(context, member);
        return new c.NullLiteral;
    }
    const opts = id;

    const perm = new DiscordPermissions(opts.permissions);

    return new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        position: new c.NumberLiteral(opts.position),
        color: new c.NumberLiteral(opts.color),
        hexColor: new c.StringLiteral(opts.color.toString(16)),
        createdAt: new c.TimeLiteral(opts.createdAt),
        mentionable: new c.BooleanLiteral(opts.mentionable),
        name: new c.StringLiteral(opts.name),

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            return new c.StringLiteral(`<@&${opts.id}>`);
        }),
        getMembers: new c.NativeFunc("getMembers", async function getMembers(context) {
            const members = await cpc.awaitAnswer("role.getMembers", {
                guildId: context.guildId, roleId: opts.id,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < members.length; i++) {
                members[i] = await GuildMember(context, members[i]);
            }
            return new c.ArrayLiteral(members);
        }),
        hasPermission: new c.NativeFunc("hasPermission", function hasPermission(_, permission) {
            return new c.BooleanLiteral(perm.has(permission.content, true));
        }),
    });
}

async function GuildMember(context, id) {
    if (id instanceof c.StringLiteral) {
        id = id.content;
        const match = /<@!?([0-9]+)>/.exec(id);
        if (match) id = match[1];

        const member = await cpc.awaitAnswer("member.get", {
            memberId: id,
            guildId: context.guildId,
        }, { timeout: 5000 })
            .catch(err => { throw context.error(err.name + ": " + err.message); });

        if (member) return await GuildMember(context, member);
        return new c.NullLiteral;
    }
    const opts = id;

    let perm = new DiscordPermissions(opts.permissions);

    const member = new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        nickname: new c.StringLiteral(opts.nickname || opts.username),
        highestRole: await Role(context, opts.highestRole),
        joinedAt: new c.TimeLiteral(opts.joinedAt),
        avatar: new c.StringLiteral(opts.avatar),
        bot: new c.BooleanLiteral(opts.bot),
        createdAt: new c.TimeLiteral(opts.createdAt),
        discriminator: new c.StringLiteral(opts.discriminator),
        username: new c.StringLiteral(opts.username),
        tag: new c.StringLiteral(opts.username + "#" + opts.discriminator),

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            return new c.StringLiteral(`<@${opts.id}>`);
        }),
        getRoles: new c.NativeFunc("getRoles", async function getRoles(context) {
            const roles = await cpc.awaitAnswer("member.getRoles", {
                guildId: context.guildId, memberId: opts.id,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < roles.length; i++) {
                roles[i] = await Role(context, roles[i]);
            }
            return new c.ArrayLiteral(roles);
        }),

        addRole: new c.NativeFunc("addRole", async function addRole(context, ...ids) {
            ids = ids.map(id => id.content).map(r => typeof r === "object" ? r.id : r).filter(r => typeof r === "string");

            for (let id of ids) {
                if (!context.settings.allowed_roles.includes(id)) throw context.error(`Role "${id}" is not allowed to be added or removed from users.`);
            }

            const m = await cpc.awaitAnswer("member.addRole", {
                guildId: context.guildId, memberId: opts.id, roles: ids,
            }, { timeout: 5000 })
                .catch(err => {
                    // ignore error for when member already has role
                    if (err.message.includes("The set already contains this value")) return { permissions: perm.bitfield };
                    throw context.error(err.name + ": " + err.message);
                });

            perm = new DiscordPermissions(m.permissions);
            return member;
        }),
        removeRole: new c.NativeFunc("removeRole", async function removeRole(context, ...ids) {
            ids = ids.map(id => id.content).map(r => typeof r === "object" ? r.id : r).filter(r => typeof r === "string");

            for (let id of ids) {
                if (!context.settings.allowed_roles.includes(id)) throw context.error(`Role "${id}" is not allowed to be added or removed from users.`);
            }

            const m = await cpc.awaitAnswer("member.removeRole", {
                guildId: context.guildId, memberId: opts.id, roles: ids,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            perm = new DiscordPermissions(m.permissions);
            return member;
        }),

        hasPermission: new c.NativeFunc("hasPermission", function hasPermission(_, permission) {
            return new c.BooleanLiteral(perm.has(permission.content, true));
        }),
    });
    return member;
}

async function Channel(context, id) {
    if (id instanceof c.StringLiteral) {
        id = id.content;
        if (/<#[0-9]+>/.test(id)) id = id.substr(2, id.length - 3);

        const channel = await cpc.awaitAnswer("channel.get", {
            channelId: id,
            guildId: context.guildId,
        }, { timeout: 5000 })
            .catch(err => { throw context.error(err.name + ": " + err.message); });

        if (channel) return await Channel(context, channel);
        return new c.NullLiteral;
    }
    const opts = id;

    return new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        name: new c.StringLiteral(opts.name),
        createdAt: new c.TimeLiteral(opts.createdAt),
        position: new c.NumberLiteral(opts.position),
        nsfw: new c.BooleanLiteral(opts.nsfw),
        topic: opts.topic ? new c.StringLiteral(opts.topic) : new c.NullLiteral,

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            return new c.StringLiteral(`<#${opts.id}>`);
        }),
        // awaitMessage: new c.NativeFunc("awaitMessage", async function (interpreter, filter, time) {

        // }),
        createInvite: new c.NativeFunc("createInvite", async function createInvite(context, opts = new c.ObjectLiteral({})) {
            const options = {
                temporary: false,
                maxAge: 86400,
                maxUses: 0,
                unique: false,
            };
            if (opts.temporary) options.temporary = opts.temporary.content;
            if (opts.maxAge) options.maxAge = opts.maxAge.content;
            if (opts.maxUses) options.maxUses = opts.maxUses.content;
            if (opts.unique) options.unique = opts.unique.content;

            const invite = await cpc.awaitAnswer("channel.createInvite", {
                channelId: opts.id, guildId: context.guildId, options,
            }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            if (invite) return new c.StringLiteral(invite);
            return new c.NullLiteral;
        }),
        // fetchMessages: new c.NativeFunc("fetchMessages", async function (_) {

        // }),
        send: new c.NativeFunc("send", async function send(context, content, embed) {
            let message;
            if (content instanceof c.StringLiteral) {
                message = await cpc.awaitAnswer("channel.send", {
                    channelId: opts.id, guildId: context.guildId,
                    content: content.content, embed: embed ? embed.isEmbed ? embed.getEmbed() : null : null,
                }, { timeout: 5000 })
                    .catch(err => { throw context.error(err.name + ": " + err.message); });
            } else if (content ? content.isEmbed : false) {
                message = await cpc.awaitAnswer("channel.send", {
                    channelId: opts.id, guildId: context.guildId, embed: content.getEmbed(),
                }, { timeout: 5000 })
                    .catch(err => { throw context.error(err.name + ": " + err.message); });
            }
            if (message) return await Message(context, message);
            else return new c.NullLiteral;
        }),
    });
}

// this one should not have a constructor implementation in the runtime
// cause we want everything to be kept internally, inside the guild

function Guild(context, opts) {
    return new c.ObjectLiteral({
        id: new c.StringLiteral(opts.id),
        name: new c.StringLiteral(opts.name),
        createdAt: new c.TimeLiteral(opts.createdAt),
        icon: new c.StringLiteral(opts.icon),
        memberCount: new c.NumberLiteral(opts.memberCount),

        // methods
        toString: new c.NativeFunc("toString", function toString() {
            return new c.StringLiteral(opts.name);
        }),
        getMembers: new c.NativeFunc("getMembers", async function getMembers(context) {
            const members = await cpc.awaitAnswer("guild.getMembers", { guildId: opts.id }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < members.length; i++) {
                members[i] = await GuildMember(context, members[i]);
            }
            return new c.ArrayLiteral(members);
        }),
        getOwner: new c.NativeFunc("getOwner", async function getOwner(context) {
            return await GuildMember(context, opts.ownerId);
        }),
        getRoles: new c.NativeFunc("getRoles", async function getRoles(context) {
            const roles = await cpc.awaitAnswer("guild.getRoles", { guildId: opts.id }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < roles.length; i++) {
                roles[i] = await Role(context, roles[i]);
            }
            return new c.ArrayLiteral(roles);
        }),
        getChannels: new c.NativeFunc("getChannels", async function getChannels(context) {
            const channels = await cpc.awaitAnswer("guild.getChannels", { guildId: opts.id }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < channels.length; i++) {
                channels[i] = await Channel(context, channels[i]);
            }
            return new c.ArrayLiteral(channels);
        }),
        getEmojis: new c.NativeFunc("getEmojis", async function getEmojis(context) {
            const emojis = await cpc.awaitAnswer("guild.getEmojis", { guildId: opts.id }, { timeout: 5000 })
                .catch(err => { throw context.error(err.name + ": " + err.message); });

            for (let i = 0; i < emojis.length; i++) {
                emojis[i] = await Emoji(context, emojis[i]);
            }
            return new c.ArrayLiteral(emojis);
        }),
    });
}

function RichEmbed(opts = {}) {
    const embed = {
        author: null,
        color: null,
        description: null,
        fields: [],
        footer: null,
        image: null,
        thumbnail: null,
        timestamp: null,
        title: null,
        url: null,
        ...opts,
    };
    function addField(name, value, inline) {
        if (embed.fields.length >= 25) throw new RangeError("RichEmbeds may not exceed 25 fields.");
        if (name.length > 256) throw new RangeError("RichEmbed field names may not exceed 256 characters.");
        if (!/\S/.test(name)) throw new RangeError("RichEmbed field names may not be empty.");
        if (value.length > 1024) throw new RangeError("RichEmbed field values may not exceed 1024 characters.");
        if (!/\S/.test(value)) throw new RangeError("RichEmbed field values may not be empty.");
        embed.fields.push({ name, value, inline });
    }

    const obj = new c.ObjectLiteral({
        addBlankField: new c.NativeFunc(function addBlankField(_, inline = new c.BooleanLiteral(false)) {
            addField("\u200B", "\u200B", inline.content);
            return obj;
        }),
        addField: new c.NativeFunc(function addField(_, name, value, inline = new c.BooleanLiteral(false)) {
            addField(name ? name.content : undefined, value ? value.content : undefined, inline);
            return obj;
        }),

        setAuthor: new c.NativeFunc(function setAuthor(_, name = new c.StringLiteral(""), icon, url) {
            embed.author = {
                name: name.content, icon_url: icon ? icon.content : undefined, url: url ? url.content : undefined,
            };
            return obj;
        }),

        setColor: new c.NativeFunc(function setColor(_, color = new c.NumberLiteral(0)) {
            if (color instanceof c.StringLiteral) {
                color = color.content;
                if (color === "RANDOM") return Math.floor(Math.random() * (0xFFFFFF + 1));
                if (color === "DEFAULT") return 0;
                color = parseInt(color.replace("#", ""), 16);
            } else {
                color = color.content;
            }

            if (color < 0 || color > 0xFFFFFF) {
                throw new RangeError("Color must be within the range 0 - 16777215 (0xFFFFFF).");
            } else if (color && global.isNaN(color)) {
                throw new TypeError("Unable to convert color to a number.");
            }

            embed.color = color;
            return obj;
        }),
        setDescription: new c.NativeFunc(function setDescription(_, description = new c.StringLiteral("")) {
            description = description.content;
            if (description.length > 2048) throw new RangeError("RichEmbed descriptions may not exceed 2048 characters.");
            embed.description = description;
            return obj;
        }),
        setFooter: new c.NativeFunc(function setFooter(_, text = new c.StringLiteral(""), icon = new c.NullLiteral) {
            text = text.content;
            if (text.length > 2048) throw new RangeError("RichEmbed footer text may not exceed 2048 characters.");
            embed.footer = { text, icon_url: icon.content };
            return obj;
        }),
        setImage: new c.NativeFunc(function setImage(_, url = new c.NullLiteral) {
            embed.image = { url: url.content };
            return obj;
        }),
        setThumbnail: new c.NativeFunc(function setThumbnail(_, url = new c.NullLiteral) {
            embed.thumbnail = { url: url.content };
            return obj;
        }),
        setTimestamp: new c.NativeFunc(function setTimestamp(_, timestamp = new c.TimeLiteral()) {
            if (timestamp instanceof c.NumberLiteral) timestamp = new c.TimeLiteral(timestamp);
            embed.timestamp = timestamp.time.toDate().toISOString();
            return obj;
        }),
        setTitle: new c.NativeFunc(function setTitle(_, title = new c.StringLiteral("")) {
            title = title.content;
            if (title.length > 2048) throw new RangeError("RichEmbed title text may not exceed 2048 characters.");
            embed.title = title;
            return obj;
        }),
        setURL: new c.NativeFunc(function setURL(_, url = new c.NullLiteral) {
            embed.url = url.content;
            return obj;
        }),
    });
    obj.isEmbed = true;
    obj.getEmbed = () => embed;
    return obj;
}

module.exports = {
    ...c,
    RichEmbed,
    Emoji,
    Reaction,
    Mentions,
    Message,
    Role,
    GuildMember,
    Channel,
    Guild,
};
