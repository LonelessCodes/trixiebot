const { CronJob } = require("cron");

module.exports = async function install(cr, client, config, db) {
    // const database = {
    //     users: db.collecction("overview_users"),
    //     users: db.collecction("overview_users")
    //     users: db.collecction("overview_users")
    // };

    new CronJob("0 0 * * * *", () => {



    }, null, true, "Europe/Berlin");
};