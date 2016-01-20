var ini = require('../') //import ini.js script

var words = 'testing if this string is safe or unsafe' //test string

console.log(ini.unsafe(ini.safe(words))) //works because unsafe undoes safe functionality