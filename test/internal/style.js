
var test = require('tap').test;
var styleParser = require('../../lib/helpers-dom.js').styleParser;

test('test style parser with space everywhere', function (t) {
  t.deepEqual(styleParser(' a : v1 ; b : v2 '), {
    a: 'v1',
    b: 'v2'
  });
  t.end();
});

test('test style parser with malformated attribute', function (t) {
  t.deepEqual(styleParser(' a : v1 ; b : '), {
    a: 'v1',
    b: ''
  });
  t.deepEqual(styleParser(' a : v1 ; b '), {
    a: 'v1'
  });
  t.end();
});

test('no style attribute', function (t) {
  t.deepEqual(styleParser(undefined), { });
  t.end();
});
