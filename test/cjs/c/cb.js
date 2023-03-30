const {cc} = require("./cc");

exports.cb = function () {
  console.log('cb');
  cc();
}