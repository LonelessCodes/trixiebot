const fetch = require("node-fetch");
const log = require("../modules/log");
const cheerio = require("cheerio");
const CONST = require("../modules/CONST");
const Discord = require("discord.js");

const BaseCommand = require("../class/BaseCommand");
const HelpContent = require("../logic/commands/HelpContent");
const Category = require("../logic/commands/Category");

module.exports = async function install(cr) {
    cr.register("pony", new class extends BaseCommand {
        async call(message, query) {
            if (query === "") {
                return;
            }
        }
    })
        // .setHelp(new HelpContent()
        //     .setDescription("Query the MLP Wikia for fun!")
        //     .setUsage("<query>", "come look it up with me owo")
        //     .addParameter("query", "what you would like to look up"))
        .setCategory(Category.GAMES)
        .dontList();
};