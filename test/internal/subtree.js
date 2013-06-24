
var util = require('util');
var test = require('tap').test;
var startpoint = require('startpoint');

var Subtree = require('../../lib/fase-2/subtree.js');
var TreeBuilder = require('../../lib/treebuilder.js');

function TreeParser(html, callback) {
  if (!(this instanceof TreeParser)) return new TreeParser(html, callback);
  TreeBuilder.call(this);
  var self = this;

  this._element = function () {};
  this._end = function () {
    callback(null, self._tree.children[0]);
  };

  startpoint(html).pipe(this);
}
util.inherits(TreeParser, TreeBuilder);

function treeMatch(t, actual, expected) {
  t.equal(actual.type, expected.type);

  if (actual.type === 'text') {
    t.equal(actual.text, expected.text);
  } else if (actual.type === 'element') {
    t.equal(actual.tagname, expected.tagname);
    t.equal(actual.children.length, expected.children.length);
    t.deepEqual(actual.attr, expected.attr);

    if (actual.children.length ===  expected.children.length) {
      for (var i = 0, l = expected.children.length; i < l; i++) {
        treeMatch(t, actual.children[i], expected.children[i]);
      }
    }
  }
}

function printTree(node, indent) {
  indent = (indent || '') + '  ';
  if (node.type === 'element') {
    console.log(indent + '<' + node.tagname + '>');
    for (var i = 0, l = node.children.length; i < l; i++) {
      printTree(node.children[i], indent);
    }
  }
  
  else if (node.type === 'fragment') {
    console.log(indent + '#fragment');
    for (var i = 0, l = node.children.length; i < l; i++) {
      printTree(node.children[i], indent);
    }
  }
  
  else if (node.type === 'text') {
    console.log(indent + '#' + node.text);    
  }
}

test('remove empty containers and concat text', function (t) {
  TreeParser('<div>A<span></span>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>AB</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('keep text position', function (t) {
  TreeParser('<div>A<span> space </span>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>A<span> space </span>B</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('replace unimportant block containers with br', function (t) {
  TreeParser('<div>A<div></div>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>A<br><br>B</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('images aren\'t removed', function (t) {
  TreeParser('<div>A<img><div><img></div>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>A<img><img>B</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('objects are images too', function (t) {
  TreeParser('<div>A<object></object>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>A<object></object>B</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('br tags won\'t be removed', function (t) {
  TreeParser('<div>A<br>B</div>', function (err, source) {
    t.equal(err, null);

    TreeParser('<div>A<br>B</div>', function (err, expected) {
      t.equal(err, null);

      var subtree = new Subtree(source);
          subtree.reduceTree();

      treeMatch(t, subtree.node, expected);
      t.end();
    });
  });
});

test('fragments are used if it contains more than 2 inline element', function (t) {
  TreeParser('<div><a>A</a><b>B</b><div>C</div><a>D</a></div>', function (err, source) {
  
    var subtree = new Subtree(source);

    var containers = subtree.containerNodes();

    t.equal(containers[0], source);

    t.equal(containers[1].type, 'fragment');
    t.equal(containers[1].children[0].children[0].text, 'A');
    t.equal(containers[1].children[1].children[0].text, 'B');

    t.equal(containers[2].type, 'element');
    t.equal(containers[2].tagname, 'div');
    t.equal(containers[2].children[0].text, 'C');

    t.equal(containers[3].type, 'element');
    t.equal(containers[3].tagname, 'a');
    t.equal(containers[3].children[0].text, 'D');

    t.end();
  });
});
