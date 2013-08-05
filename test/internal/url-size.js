
var test = require('tap').test;
var ImageItem = require('../../lib/fase-1/image-item.js');

function expectedSize(width, height) {
  return {
    width: width,
    height: height,
    area: width * height || null,
    banner: 0
  };
}

function actualSize(href) {
  return new ImageItem({}, href)._size;
}

test('width times height match', function (t) {
  t.deepEqual(actualSize('http://example.test/cat/100x200.jpg'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/cat/100*200.jpg'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/cat/16x9.jpg'), expectedSize(null, null));
  t.deepEqual(actualSize('http://example.test/cat/16*9.jpg'), expectedSize(null, null));
  t.deepEqual(actualSize('http://example.test/cat/100x0.jpg'), expectedSize(100, 62));
  t.deepEqual(actualSize('http://example.test/cat/100*0.jpg'), expectedSize(100, 62));
  t.deepEqual(actualSize('http://example.test/cat/0x200.jpg'), expectedSize(324, 200));
  t.deepEqual(actualSize('http://example.test/cat/0*200.jpg'), expectedSize(324, 200));
  t.deepEqual(actualSize('http://example.test/cat/100x200_1000x2000.jpg'), expectedSize(100, 200));
  t.deepEqual(actualSize('http://example.test/cat/100x0_1000x0.jpg'), expectedSize(100, 62));
  t.deepEqual(actualSize('http://example.test/cat/0x0_1000x0.jpg'), expectedSize(1000, 619));

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

test('w as a width prefix', function (t) {
  t.deepEqual(actualSize('http://example.test/picture_w100.jpg'), expectedSize(100, 62));
  t.end();
});

test('Returns null size when there are no image', function (t) {
  t.deepEqual(actualSize('http://example.test'), expectedSize(null, null));
  t.end();
});
