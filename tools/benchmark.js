
var fs = require('fs');
var path = require('path');
var startpoint = require('startpoint');
var async = require('async');
var summary = require('summary');

var article = require('../lib/article.js');

if (!global.gc) {
  return console.error('please add the --expose-gc flag');
}

// CREATE ARTICLE FILE ARRAY
var ARTICLES = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../test/reallife/datamap.json')
  )
)
.map(function (item, index) {
  return {
    file: path.resolve(__dirname, '../test/reallife/source/' + item.key + '.html'),
    key: item.key,
    num: index + 1,
    href: item.href
  };
})
.slice(0, process.argv[2]);

console.log('Benchmarking on ' + ARTICLES.length + ' articles');
console.log();
console.log();
console.log();
console.log();
console.log();
console.log();
console.log();

// RUN GC
global.gc();

var TIMES = [];

async.eachSeries(
  ARTICLES,
  function (item, done) {
    // Preread file to prevent I/O interference
    var stream = startpoint(fs.readFileSync(item.file));
    console.log(item.num + ' / ' + ARTICLES.length + ' ' + item.key);

    // Analyse file
    var tic = process.hrtime();
    stream.pipe(article(item.href, function (err) {
      var toc = process.hrtime(tic);
      TIMES.push(toc);

      setImmediate(done.bind(null, err));
    }));
  },
  function (err) {
    if (err) throw err;

    var stat = summary(TIMES.map(function (time) {
      return (time[0] * 1e9 + time[1]) / 1e6;
    }));

    console.log(stat.mean().toPrecision(6) + ' ms ± ' + stat.sd().toPrecision(6));
  }
);
