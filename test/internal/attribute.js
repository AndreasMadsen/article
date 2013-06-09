
var test = require('tap').test;
var attribute = require('../../lib/helpers-dom.js').buildAttributeMatcher;

test('simple attribute exists', function (t) {
  var fn = attribute({ exists: true });

  t.equal(fn({ exists: 'whatever' }), true);
  t.equal(fn({ }), false);
  t.end();
});

test('simple attribute match', function (t) {
  var fn = attribute({ match: ['simple'] });

  t.equal(fn({ match: 'simple' }), true);
  t.equal(fn({ match: 'another' }), false);
  t.equal(fn({ }), false);  
  t.end();
});

test('simple multiply attribute value match', function (t) {
  var fn = attribute({ multiply: ['one', 'two'] });

  t.equal(fn({ multiply: 'one' }), true);
  t.equal(fn({ multiply: 'two' }), true);
  t.equal(fn({ multiply: 'tree' }), false);
  t.equal(fn({ }), false);  
  t.end();
});

test('simple multiply attribute name match', function (t) {
  var fn = attribute({
    one: ['value'],
    two: ['value']
  });

  t.equal(fn({ one: 'value' }), true);
  t.equal(fn({ two: 'value' }), true);
  t.equal(fn({ three: 'value' }), false);
  t.equal(fn({ }), false);  
  t.end();
});

test('regexp is supported too', function (t) {
  var fn = attribute({
    one: ['value'],
    two: ['value'],
    three: [/^value-[0-9]$/]
  });

  t.equal(fn({ one: 'value' }), true);
  t.equal(fn({ two: 'value' }), true);
  t.equal(fn({ three: 'value' }), false);
  t.equal(fn({ three: 'value-0' }), true);
  t.equal(fn({ three: 'value-1' }), true);
  t.equal(fn({ }), false);
  t.end();
});

test('regexp and string can be mixed', function (t) {
  var fn = attribute({
    one: ['value'],
    two: ['value', /^value-[0-9]$/]
  });

  t.equal(fn({ one: 'value' }), true);
  t.equal(fn({ two: 'value' }), true);
  t.equal(fn({ two: 'value-0' }), true);
  t.equal(fn({ two: 'value-1' }), true);
  t.equal(fn({ two: 'value-10' }), false);
  t.equal(fn({ }), false);
  t.end();
});