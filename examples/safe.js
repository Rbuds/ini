var ini = require('../') //import ini.js script

var words = 'testing/////***:;;;"{{{}}]]"""""" if this string is safe or unsafe' //create test string

console.log(words) //print baseline
console.log(ini.safe(words)) //make example safe
console.log('you can see the semi-colons have been escaped')