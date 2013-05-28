
var fs = require('fs');
var path = require('path');
var article = require('../../lib/article.js');

var reader = fs.createReadStream(
  path.resolve(__dirname, '../../test/reallife/source/' + process.argv[2] + '.html')
);

reader.pipe(article(process.argv[3], function (err, result) {
  process.send([err ? {message: err.message, stack: err.stack} : null, result]);
  process.disconnect();
}));

