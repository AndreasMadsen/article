
var url = require('url');
var test = require('tap').test;
var ImageAlgoritme = require('../../lib/fase-1/image.js');
var sizeFromUrl = ImageAlgoritme.prototype._sizeFromUrl;

function expectedSize(width, height) {
  return {
    width: width,
    height: height,
    area: width * height || null
  };
}

function actualSize(href) {
  var parsed = url.parse(href, true);
  return sizeFromUrl(href, parsed);
}

test('width times height match', function (t) {
  t.deepEqual(actualSize('http://example.test/cat/100x200.jpg'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/cat/16x9.jpg'), expectedSize(null, null));
  t.end();
});

test('short width and hight query names', function (t) {
  t.deepEqual(actualSize('http://example.test/?w=100&h=200'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/?w=100'), expectedSize(100, 62));
  t.deepEqual(actualSize('http://example.test/?h=200'), expectedSize(324, 200));
  t.end();
});

test('long width and hight query names', function (t) {
  t.deepEqual(actualSize('http://example.test/?width=100&height=200'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/?width=100'), expectedSize(100, 62));
  t.deepEqual(actualSize('http://example.test/?height=200'), expectedSize(324, 200));
  t.end();
});

test('Returns null size when there are no image', function (t) {
  t.deepEqual(actualSize('http://example.test'), expectedSize(null, null));
  t.end();
});
