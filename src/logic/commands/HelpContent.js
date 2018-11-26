class HelpContent {
    constructor(description = null, parameters = new Map, options = null, usage = null, related = new Array) {
        this.description = description;
        this.parameters = parameters;
        this.options = options;
        this.usage = usage;
        this.related = related;
    }

    setDescription(description) {
        this.description = description;
        return this;
    }

    addParameter(parameter_name, content) {
        this.parameters.set(parameter_name, {
            content,
            optional: false
        });
        return this;
    }

    addParameterOptional(parameter_name, content) {
        this.parameters.set(parameter_name, {
            content,
            optional: true
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