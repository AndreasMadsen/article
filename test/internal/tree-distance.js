
var util = require('util');
var test = require('tap').test;
var startpoint = require('startpoint');

var treeDistance = require('../../lib/helpers-dom.js').treeDistance;
var TreeBuilder = require('../../lib/treebuilder.js');

function Tree(handlers) {
  TreeBuilder.call(this);
  
  this._element = handlers.element;
  this._end = handlers.end;
}
util.inherits(Tree, TreeBuilder);

function fetchNodes(html, callback) {
  var target = {};

  startpoint(html).pipe(new Tree({
    element: function (node) {
      if (node.attr.hasOwnProperty('id')) {
        target[node.attr.id] = node;
      }
    },
    end: function () {
      callback(null, target);
    }
  }));
}

test('The distance between the same node is zero', function (t) {
  var html = '<div id="a"><span id="b">Hallo</span><span id="c">World</span></div>';

  fetchNodes(html, function (err, target) {
    t.equal(err, null);
    t.equal(treeDistance(target.a, target.a), 0);
    t.equal(treeDistance(target.b, target.b), 0);
    t.equal(treeDistance(target.c, target.c), 0);
    t.end();
  });
});

test('The when a node is a parent of another node', function (t) {
  var html = '<div id="a"><span id="b">Hallo</span><span id="c">World</span></div>';

  fetchNodes(html, function (err, target) {
    t.equal(err, null);

    t.equal(treeDistance(target.a, target.b), 1);
    t.equal(treeDistance(target.b, target.a), 1);

    t.equal(treeDistance(target.a, target.c), 1);
    t.equal(treeDistance(target.c, target.a), 1);

    t.end();
  });
});

test('Siblings between nodes counts', function (t) {
  var html = 
    '<div>' +
      '<span id="a">Hallo</span><span id="b">World</span><span id="c">Again</span>' +
    '</div>';

  fetchNodes(html, function (err, target) {
    t.equal(err, null);

    t.equal(treeDistance(target.a, target.b), 1);
    t.equal(treeDistance(target.b, target.a), 1);

    t.equal(treeDistance(target.b, target.c), 1);
    t.equal(treeDistance(target.c, target.b), 1);

    t.equal(treeDistance(target.a, target.c), 2);
    t.equal(treeDistance(target.c, target.a), 2);

    t.end();
  });
});

test('the ancestor level count', function (t) {
  var html = 
    '<div>' +
      '<div><span id="a">Hallo</span></div>' +
      '<div><span id="b">World</span></div>' +
      '<div><span id="c">Again</span></div>' +
    '</div>';

  fetchNodes(html, function (err, target) {
    t.equal(err, null);

    t.equal(treeDistance(target.a, target.b), 3);
    t.equal(treeDistance(target.b, target.a), 3);

    t.equal(treeDistance(target.b, target.c), 3);
    t.equal(treeDistance(target.c, target.b), 3);

    t.equal(treeDistance(target.a, target.c), 4);
    t.equal(treeDistance(target.c, target.a), 4);

    t.end();
  });
});

