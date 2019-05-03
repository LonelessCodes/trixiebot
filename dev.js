#!/usr/bin/env node

process.env.NODE_ENV = "development";
console.log(process.env.NODE_ENV);

require("./index.js");
