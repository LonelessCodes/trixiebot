const heapdump = require("heapdump");

require("./dev.js");

heapdump.writeSnapshot((err, filename) => {
    console.log("Heap dump written to", filename);
});