
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var request = require('request');

var datamap = require('../test/reallife/datamap.json');

if (process.argv.length < 4) {
  return console.error('node reallife.js url why');
}

var href = process.argv[2];
var why = process.argv[3];
var key = crypto.createHash('sha256').update(new Buffer(href)).digest('hex');

console.log('downloading ...');
request({url: href, jar: true}, function (err, res, body) {
  if (err) throw err;

  if (res.statusCode !== 200) {
    return console.error('Status code must be 200');
  }

  if (body.length === 0) {
    return console.error('No body was send');
  }

  for (var i = 0, l = datamap.length; i < l; i++) {
    if (datamap[i].key === key) throw new Error('this url already seams to exists');
  }

  datamap.push({
    'labeled': false,
    'key': key,
    'href': href,
    'why': why,
    'state': '0-0-0'
  });

  // Update main testfiles
  fs.writeFileSync(
    path.resolve(__dirname, '../test/reallife/source/', key + '.html'),
    body
  );
  console.log('wrote source file');

  fs.writeFileSync(
    path.resolve(__dirname, '../test/reallife/expected/', key + '.json'),
    '{}\n'
  );
  console.log('write empty expected file');

  // Update datamap
  fs.writeFileSync(
    path.resolve(__dirname, '../test/reallife/datamap.json'),
    JSON.stringify(datamap, null, '\t') + '\n'
  );
  console.log('appended to datamap');
});
