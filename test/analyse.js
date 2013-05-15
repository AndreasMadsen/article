
var fs = require('fs');
var path = require('path');
var util = require('util');

var datamap = require('./reallife/datamap.json');
var article = require('../lib/article.js');

if (process.argv.length < 3) {
  return console.error('node analyse.js key');
}

var key = process.argv[2];
fs.createReadStream(
  path.resolve(__dirname, 'reallife', 'source', key + '.html')
).pipe(article('', function (err, result) {
  console.log();
  console.log(util.inspect(result, {
    colors: true,
    depth: Infinity
  }));
  console.log();
}));
