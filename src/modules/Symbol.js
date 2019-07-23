/**
 * The reason why I'm not using the built-in Symbol types is for better debuggibility.
 * Printing the normal Symbol to the console just shows "Symbol()" and doesn't give any
 * reference to which Symbol it is. Everything looks the same. Printing numbers is just
 * way easier to debug
 */

let incr = 0;

function Symbol() {
    return incr++;
}

module.exports = Symbol;
