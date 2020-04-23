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

export interface HelpParameter {
    content: string;
    optional?: boolean;
}

export interface HelpUsage {
    options: string | null;
    usage: string | null;
}

export interface HelpContentOptions {
    title?: string | null;
    description?: string | null;
    parameters?: Map<string, HelpParameter>;
    usage?: HelpUsage[];
    related?: string[];
}

export default class HelpContent {
    title: string | null;
    description: string | null;
    parameters: Map<string, HelpParameter>;
    usage: HelpUsage[];
    related: string[];

    constructor(opts: HelpContentOptions = {}) {
        this.title = opts.title || null;
        this.description = opts.description || null;
        this.parameters = opts.parameters || new Map();
        this.usage = opts.usage || [];
        this.related = opts.related || [];
    }

    setUsageTitle(title: string): HelpContent {
        this.title = title;
        return this;
    }

    /**
     * Sets the description field in a help embed.
     *
     * **Only allowed in top level commands!!!**
     * @param {string} description
     * @returns {HelpContent}
     */
    setDescription(description: string): HelpContent {
        this.description = description;
        return this;
    }

    addParameter(parameter_name: string, content: string): HelpContent {
        this.parameters.set(parameter_name, {
            content,
            optional: false,
        });
        return this;
    }

    addParameterOptional(parameter_name: string, content: string): HelpContent {
        this.parameters.set(parameter_name, {
            content,
            optional: true,
        });
        return this;
    }

    setUsage(options: HelpUsage[] | string | null, usage: string | null = null): HelpContent {
        this.usage = Array.isArray(options) ? options : [{ options, usage }];
        return this;
    }

    addUsage(options: string | null, usage: string | null = null): HelpContent {
        this.usage.push({ options, usage });
        return this;
    }

    setRelated(related: string[]): HelpContent {
        this.related = related;
        return this;
    }
}
