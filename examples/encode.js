var ini = require('../') //import ini.js script

var a;
var b;
var c;
var o = { a: 1, b: 2, c: 3 }; //initialize sample object

var result = ini.encode(o, "goat") 
console.log(result)
if (typeof result === 'string') {
	console.log('everything worked')
} else {
	console.log('result is the wrong type')
}