
var fs = require('fs');
var path = require('path');
var util = require('util');

var datamap = require('./reallife/datamap.json');
var article = require('../lib/article.js');

if (process.argv.length < 3) {
  return console.error('node analyse.js key');
}

var href = null;
for (var i = 0, l = datamap.length; i < l; i++) {
  if (datamap[i].key === key) {
    href = datamap[i].href;
    break;
  }
}

if (href === null) {
  return console.error('Cound not find test file');
}

var key = process.argv[2];
fs.createReadStream(
  path.resolve(__dirname, 'reallife', 'source', key + '.html')
).pipe(article(href, function (err, result) {
  console.log();
  console.log(util.inspect(result, {
    colors: true,
    depth: Infinity
  }));
  console.log();
}));
