const Bitfield = require("../../modules/Bitfield");

class CommandScope extends Bitfield { }

CommandScope.FLAGS = {
    GUILD: 1 << 0,
    DM: 1 << 1,
};

/**
 * Bitfield representing every scope combined
 * @type {number}
 */
CommandScope.ALL = CommandScope.FLAGS.DM | CommandScope.FLAGS.GUILD;

/**
 * Bitfield representing the default scope
 * @type {number}
 */
CommandScope.DEFAULT = CommandScope.FLAGS.GUILD;

module.exports = CommandScope;