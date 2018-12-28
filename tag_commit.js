const packageFile = require("./package.json");
const { exec } = require("child_process");

exec("git tag v" + packageFile.version, (err, stdout, stderr) => {
    if (err) {
        process.stderr.write("Error trying to tag commit\n");
        process.stderr.write(stderr);
        process.exit();
        return;
    }

    process.stdout.write("Tagged commit with v" + packageFile.version);
    process.stdout.write(stdout);
    process.exit();
});