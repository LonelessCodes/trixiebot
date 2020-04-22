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

import Discord from "discord.js";
import { ResolvableObject, Resolvable } from "./Resolvable";
import { I18nLocale } from "./I18n";

interface TranslationEmbedAuthor {
    name?: Resolvable<string>;
    url?: string;
    iconURL?: string;
    proxyIconURL?: string;
}

interface TranslationEmbedFooter {
    text?: Resolvable<string>;
    iconURL?: string;
    proxyIconURL?: string;
}

interface TranslationEmbedField {
    name: Resolvable<string>;
    value: Resolvable<string>;
    inline: boolean;
}

interface TranslationEmbedFieldData {
    name: Resolvable<string>;
    value: Resolvable<string>;
    inline?: boolean;
}

interface TranslationEmbedOptions {
    title?: Resolvable<string>;
    description?: Resolvable<string>;
    url?: string;
    timestamp?: Date | number;
    color?: Discord.ColorResolvable;
    fields?: TranslationEmbedFieldData[];
    files?: (Discord.MessageAttachment | string | Discord.FileOptions)[];
    author?: MessageEmbedAuthorData;
    thumbnail?: MessageEmbedThumbnailData;
    image?: MessageEmbedImageData;
    footer?: TranslationEmbedFooter & { icon_url?: string; proxy_icon_url?: string };
}

type MessageEmbedAuthorData = TranslationEmbedAuthor & {
    icon_url?: string | undefined;
    proxy_icon_url?: string | undefined;
};
type MessageEmbedImageData = Discord.MessageEmbedImage & {
    proxy_url: string;
};
type MessageEmbedThumbnailData = Discord.MessageEmbedThumbnail & {
    proxy_url?: string | undefined;
};
type MessageEmbedFooterData = (Discord.MessageEmbedFooter | TranslationEmbedFooter) & {
    icon_url?: string | undefined;
    proxy_icon_url?: string | undefined;
};

/**
 * A rich embed to be sent with a message with a fluent interface for creation.
 */
export default class TranslationEmbed extends ResolvableObject<Discord.MessageEmbed> {
    constructor(data: Discord.MessageEmbed | TranslationEmbedOptions = {}, skipValidation = false) {
        super();

        this.title = data.title;
        this.description = data.description;
        this.url = data.url;
        this.color = (data.color && Discord.Util.resolveColor(data.color)) || undefined;
        this.timestamp = data.timestamp ? new Date(data.timestamp).getTime() : null;

        this.fields = [];
        if (data.fields) {
            this.fields = skipValidation
                ? (data.fields as TranslationEmbedFieldData[]).map(
                      (f: Discord.EmbedField | TranslationEmbedFieldData) =>
                          ({
                              name: f.name,
                              value: f.value,
                              inline: f.inline,
                          } as TranslationEmbedField)
                  )
                : TranslationEmbed.normalizeFields(data.fields);
        }

        this.thumbnail = data.thumbnail
            ? {
                  url: data.thumbnail.url,
                  proxyURL: data.thumbnail.proxyURL || (data.thumbnail as MessageEmbedThumbnailData).proxy_url,
                  height: data.thumbnail.height,
                  width: data.thumbnail.width,
              }
            : null;

        this.image = data.image
            ? {
                  url: data.image.url,
                  proxyURL: data.image.proxyURL || (data.image as MessageEmbedImageData).proxy_url,
                  height: data.image.height,
                  width: data.image.width,
              }
            : null;

        this.author = data.author
            ? {
                  name: data.author.name,
                  url: data.author.url,
                  iconURL: data.author.iconURL || (data.author as MessageEmbedAuthorData).icon_url,
                  proxyIconURL: data.author.proxyIconURL || (data.author as MessageEmbedAuthorData).proxy_icon_url,
              }
            : null;

        this.footer = data.footer
            ? {
                  text: data.footer.text,
                  iconURL: data.footer.iconURL || (data.footer as MessageEmbedFooterData).icon_url,
                  proxyIconURL: data.footer.proxyIconURL || (data.footer as MessageEmbedFooterData).proxy_icon_url,
              }
            : null;

        this.files = data.files || [];
    }

    public type: string = "rich";

    get createdAt() {
        return this.timestamp ? new Date(this.timestamp) : null;
    }

    get hexColor() {
        return this.color ? `#${this.color.toString(16).padStart(6, "0")}` : null;
    }

    get length() {
        return (
            (this.title ? this.title.length : 0) +
            (this.description ? this.description.length : 0) +
            (this.fields.length >= 1 ? this.fields.reduce((prev, curr) => prev + curr.name.length + curr.value.length, 0) : 0) +
            (this.footer?.text?.length || 0)
        );
    }

    public author: TranslationEmbedAuthor | null;
    public color?: number;
    public description?: Resolvable<string>;
    public fields: TranslationEmbedField[];
    public files: (Discord.MessageAttachment | string | Discord.FileOptions)[];
    public footer: TranslationEmbedFooter | null;
    public image: Discord.MessageEmbedImage | null;
    public thumbnail: Discord.MessageEmbedThumbnail | null;
    public timestamp: number | null;
    public title?: Resolvable<string>;
    public url?: string;
    public provider: Discord.MessageEmbedProvider | null = null;
    public readonly video: Discord.MessageEmbedVideo | null = null;

    public addField(name: Resolvable<string>, value: Resolvable<string>, inline?: boolean): this {
        if (this.fields.length >= 25) throw new RangeError("TranslationEmbeds may not exceed 25 fields.");
        return this.addFields({ name, value, inline });
    }
    public addBlankField(inline = false) {
        return this.addField("\u200B", "\u200B", inline);
    }
    public addFields(...fields: TranslationEmbedFieldData[] | TranslationEmbedFieldData[][]): this {
        this.fields.push(...TranslationEmbed.normalizeFields(...fields));
        return this;
    }
    public spliceFields(
        index: number,
        deleteCount: number,
        ...fields: TranslationEmbedFieldData[] | TranslationEmbedFieldData[][]
    ): this {
        this.fields.splice(index, deleteCount, ...TranslationEmbed.normalizeFields(...fields));
        return this;
    }
    public attachFiles(files: (Discord.MessageAttachment | Discord.FileOptions | string)[]): this {
        this.files = this.files.concat(files);
        return this;
    }
    public setAuthor(name: Resolvable<string>, iconURL?: string, url?: string): this {
        this.author = { name, iconURL, url };
        return this;
    }
    public setColor(color: Discord.ColorResolvable): this {
        this.color = Discord.Util.resolveColor(color);
        return this;
    }
    public setDescription(description: Resolvable<string>): this {
        this.description = description;
        return this;
    }
    public setFooter(text: Resolvable<string>, iconURL?: string): this {
        this.footer = { text, iconURL };
        return this;
    }
    public setImage(url: string): this {
        this.image = { url };
        return this;
    }
    public setThumbnail(url: string): this {
        this.thumbnail = { url };
        return this;
    }
    public setTimestamp(timestamp: Date | number = Date.now()): this {
        if (timestamp instanceof Date) timestamp = timestamp.getTime();
        this.timestamp = timestamp;
        return this;
    }
    public setTitle(title: Resolvable<string>): this {
        this.title = title;
        return this;
    }
    public setURL(url: string): this {
        this.url = url;
        return this;
    }
    public toJSON(): object {
        return {
            title: this.title,
            type: "rich",
            description: this.description,
            url: this.url,
            timestamp: this.timestamp ? new Date(this.timestamp) : null,
            color: this.color,
            fields: this.fields,
            thumbnail: this.thumbnail,
            image: this.image,
            author: this.author
                ? {
                      name: this.author.name,
                      url: this.author.url,
                      icon_url: this.author.iconURL,
                  }
                : null,
            footer: this.footer
                ? {
                      text: this.footer.text,
                      icon_url: this.footer.iconURL,
                  }
                : null,
        };
    }

    public resolve(i18n: I18nLocale) {
        return new Discord.MessageEmbed({
            title: this.title && ResolvableObject.resolve(this.title, i18n),
            description: this.description && ResolvableObject.resolve(this.description, i18n),
            url: this.url,
            color: this.color,
            author: this.author
                ? {
                      name: ResolvableObject.resolve(this.author.name, i18n),
                      url: this.author.url,
                      icon_url: this.author.iconURL,
                  }
                : undefined,
            timestamp: this.timestamp || undefined,
            fields: this.fields
                ? this.fields.map(field => ({
                      name: ResolvableObject.resolve(field.name, i18n),
                      value: ResolvableObject.resolve(field.value, i18n),
                      inline: field.inline,
                  }))
                : undefined,
            thumbnail: this.thumbnail || undefined,
            image: this.image || undefined,
            footer: this.footer
                ? {
                      text: ResolvableObject.resolve(this.footer.text, i18n),
                      icon_url: this.footer.iconURL,
                  }
                : undefined,
            files: this.files,
        });
    }

    public static normalizeField(
        name: Resolvable<string>,
        value: Resolvable<string>,
        inline: boolean = false
    ): Required<TranslationEmbedFieldData> {
        if (!name) throw new RangeError("EMBED_FIELD_NAME");
        if (!value) throw new RangeError("EMBED_FIELD_VALUE");
        return { name, value, inline };
    }
    public static normalizeFields(
        ...fields: TranslationEmbedFieldData[] | TranslationEmbedFieldData[][]
    ): Required<TranslationEmbedFieldData>[] {
        return fields
            .flat(2)
            .map(field =>
                this.normalizeField(
                    field && field.name,
                    field && field.value,
                    field && typeof field.inline === "boolean" ? field.inline : false
                )
            );
    }
}
