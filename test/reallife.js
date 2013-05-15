
var fs = require('fs');
var path = require('path');
var util = require('util');
var crypto = require('crypto');
var request = require('request');
var startpoint = require('startpoint');

var datamap = require('./reallife/datamap.json');
var article = require('../lib/article.js');

if (process.argv.length < 4) {
  return console.error('node reallife.js url why');
}

var href = process.argv[2];
var why = process.argv[3];
var key = crypto.createHash('sha256').update(new Buffer(href)).digest('hex');

console.log('downloading ...');
request(href, function (err, res, body) {
  if (err) throw err;

  if (res.statusCode !== 200) {
    return console.error('Status code must be 200');
  }

  if (body.length === 0) {
    return console.error('No body was send');
  }

  var found = false;
  for (var i = 0, l = datamap.length; i < l; i++) {
    if (datamap[i].key === key) {
      found = true;
      datamap[i].why = why;
      break;
    }
  }
  if (found === false) {
    datamap.push({
      'key': key,
      'href': href,
      'why': why
    });
  }
  
  console.log('analysing ...');
  startpoint(body).pipe(article(href, function (err, result) {
    if (err) throw err;
    
    // Update main testfiles
    fs.writeFileSync(
      path.resolve(__dirname, 'reallife', 'source', key + '.html'),
      body
    );

    fs.writeFileSync(
      path.resolve(__dirname, 'reallife', 'expected', key + '.json'),
      JSON.stringify(result, null, '\t') + '\n'
    );
    
    // Update datamap
    fs.writeFileSync(
      path.resolve(__dirname, 'reallife', 'datamap.json'),
      JSON.stringify(datamap, null, '\t') + '\n'
    );
    
    console.log('');
    console.log('Please validate this:');
    console.log('--------------------');
    console.log(util.inspect(result, {
      colors: true,
      depth: Infinity
    }));
    console.log('--------------------');
    console.log('');
    
    if (found) {
      console.log('Test files where updated');
    } else {
      console.log('Test files where added');
    }
  }));
});