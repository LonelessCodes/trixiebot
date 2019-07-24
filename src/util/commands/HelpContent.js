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

class HelpContent {
    constructor(description = null, parameters = new Map, options = null, usage = null, related = []) {
        this.title = null;
        this.description = description;
        this.parameters = parameters;
        this.options = options;
        this.usage = usage;
        this.related = related;
    }

    setUsageTitle(title) {
        this.title = title;
        return this;
    }

    setDescription(description) {
        this.description = description;
        return this;
    }

    addParameter(parameter_name, content) {
        this.parameters.set(parameter_name, {
            content,
            optional: false,
        });
        return this;
    }

    addParameterOptional(parameter_name, content) {
        this.parameters.set(parameter_name, {
            content,
            optional: true,
        });
        return this;
    }

    setUsage(options, usage) {
        this.options = options;
        this.usage = usage;
        return this;
    }

    setRelated(related) {
        this.related = related;
        return this;
    }
}

module.exports = HelpContent;
