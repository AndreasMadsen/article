
var fs = require('fs');
var url = require('url');
var path = require('path');
var async = require('async');
var crypto = require('crypto');
var request = require('request');
var endpoint = require('endpoint');
var mappoint = require('mappoint');
var feedparser = require('feedparser');

var datamap = require('../test/reallife/datamap.json');

var key2url = {};
for (var i = 0, l = datamap.length; i < l; i++) {
  key2url[datamap[i].key] = datamap[i].href;
}

function makeKey(href) {
  return crypto.createHash('sha256').update(new Buffer(href)).digest('hex');
}

function processFeed(href, done) {
  console.log('downloading feed ...');
  console.log('from: ' + href);
  console.log('');
  request(href)
    .pipe(feedparser({addmeta: false, feedurl: href}))
    .pipe(mappoint({objectMode: true}, function (article, done) {
      // skip google redirect
      var href = url.parse(article.link, true).query.url;

      // create item
      done(null, {
        'labeled': false,
        'key': makeKey(href),
        'href': href,
        'why': 'google news scrape',
        'state': '0-0-0'
      });
    }))
    .pipe(endpoint({objectMode: true}, function (err, links) {
      if (err) return done(err);

      // Remove existing links from the list
      links = links.filter(function (item) {
        return !key2url.hasOwnProperty(item.key);
      });

      console.log('Found ' + links.length + ' new articles');
      console.log('---------');

      // Download and analyse
      async.eachLimit(links, 10, processArticle, done);
    }));
}

function processArticle(item, done) {
  console.log('downloading article ...');
  console.log('from: ' + item.href);

  request(item.href, function (err, res, body) {
    // They may simply be down, not fail anything because of that
    if (err) {
      console.error(err);
      return done(null);
    }
  
    if (res.statusCode !== 200) {
      console.error('Status code must be 200, was ' + res.statusCode);
      return done(null);
    }
  
    if (body.length === 0) {
      console.error('No body was send');
      return done(null);
    }

    // We better check again, before saving anything
    if (key2url.hasOwnProperty(item.key)) {
      return done(null); 
    }

    // Add item to datamap
    key2url[item.key] = item.href;
    datamap.push(item);

    // Since this is too much for anyone to validate, just save an empty object
    async.parallel([
      function (done) {
        fs.writeFile(
          path.resolve(__dirname, '../test/reallife/source/', item.key + '.html'),
          body,
          done
        );
      },
      function (done) {
        fs.writeFile(
          path.resolve(__dirname, '../test/reallife/expected/', item.key + '.json'),
          '{}\n',
          done
        );
      }
    ], done);
  });
}

var feeds = [
  'https://news.google.com/news/feeds?&topic=m&output=rss', // Health
  'https://news.google.com/news/feeds?&topic=s&output=rss', // Sports
  'https://news.google.com/news/feeds?&topic=w&output=rss', // World
  'https://news.google.com/news/feeds?&topic=tc&output=rss', // Technology
  'https://news.google.com/news/feeds?&topic=snc&output=rss', // Science
];

async.eachSeries(feeds, processFeed, function (err) {
  if (err) {
    console.error(err);
  }

  console.log('---------');
  console.log('');
  console.log('processed all feeds');
  console.log('writeing datamap ...');
  
  fs.writeFile(
    path.resolve(__dirname, '../test/reallife/datamap.json'),
    JSON.stringify(datamap, null, '\t') + '\n',
    function (err) {
      console.log('All done :)');
    }
  );
});
