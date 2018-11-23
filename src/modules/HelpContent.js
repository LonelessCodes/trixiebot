class HelpContent {
    constructor(description = null, parameters = new Map, usage = () => { }, related = new Array) {
        this.description = description;
        this.parameters = parameters;
        this.usage = usage;
        this.related = related;
    }
}

HelpContent.Builder = class Builder {
    constructor() {
        this.description = null;
        this.parameters = new Map;
        this.usage = () => { };
        this.related = new Array;
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

    setUsage(usage) {
        this.usage = usage;
        return this;
    }

    setRelated(related) {
        this.related = related;
        return this;
    }

    build() {
        return new HelpContent(this.description, this.parameters, this.usage, this.related);
    }
};

module.exports = HelpContent;