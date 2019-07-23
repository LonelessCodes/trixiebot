const Calendar = require("./Calendar");

module.exports = {
    HALLOWEEN: new Calendar(Calendar.MONTH.OCTOBER, 30),
    CHRISTMAS: new Calendar(Calendar.MONTH.DECEMBER, 25),
    NEW_YEARS: new Calendar(Calendar.MONTH.JANUARY, 1),
};
