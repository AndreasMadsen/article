
var fs = require('fs');
var path = require('path');
var util = require('util');

var datamap = require('./test/reallife/datamap.json');
var article = require('../lib/article.js');

if (process.argv.length < 3) {
  return console.error('node analyse.js key');
}

var key = process.argv[2];
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

function highlight(char) {
 return '\x1B[7m' + char + '\x1B[27m';
}

function spaces(n) {
  var s = '';
  for (var i = 0; i < n; i++) {
    s += ' ';
  }
  return s;
}

function alignStrings(a, b) {
  if (a.length < b.length) {
    a = spaces(b.length - a.length) + a;
  } else if (b.length < a.length) {
    b = spaces(a.length - b.length) + b;
  }

  return [a, b];
}

function stringDiff(labalA, a, labalB, b) {
  var text = alignStrings(
    labalA + ' (' + (new Buffer(a).length) + ') :',
    labalB + ' (' + (new Buffer(b).length) + ') :'
  );
  var l = Math.max(a.length, b.length);
  for (var i = 0; i < l; i++) {
    if (i >= a.length) {
      text[0] += highlight(' ');
    } else if (i >= b.length) {
      text[1] += highlight(' ');      
    } else if (a[i] === b[i]) {
      text[0] += a[i];
      text[1] += b[i];
    }  else {
      text[0] += highlight(a[i]);
      text[1] += highlight(b[i]);
    }
  }
  
  return text.join('\n');
}

fs.readFile(
  path.resolve(__dirname, '../test/reallife/expected/', key + '.json'),
  function (err, expected) {  
    if (err) throw err;
    expected = JSON.parse(expected);

    fs.createReadStream(
      path.resolve(__dirname, '../test/reallife/source/', key + '.html')
    ).pipe(article(href, function (err, result) {
      if (err) throw err;

      console.log('analysed:');
      console.log('------');
      console.log(util.inspect(result, {
        colors: true,
        depth: Infinity
      }));
      console.log('------');
      if (result.title !== expected.title) {
        console.log(stringDiff('acutal', result.title, 'expected', expected.title));
      } else {
        console.log('The actual result matched the expected result');
      }
    }));
  }
);