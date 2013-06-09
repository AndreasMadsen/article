
var fs = require('fs');
var path = require('path');
var util = require('util');

var TreeBuilder = require('../lib/treebuilder.js');

//
// Simple Tree Constructor
//
function Tree(callback) {
  TreeBuilder.call(this);
  var self = this;

  this._element = function () {};
  this._end = function () {
    callback(null, self._tree);
  };
}
util.inherits(Tree, TreeBuilder);

var stream = new Tree(function (err, tree) {
  if (err) throw err;

  cleanupTree(tree.micro);

  console.log(util.inspect(tree.micro, {
    colors: true,
    depth: Infinity
  }));
});

fs.createReadStream(
  path.resolve(__dirname, '../test/reallife/source/' + process.argv[2] + '.html')
).pipe(stream);

function cleanupTree(tree) {
  // Execute the value getter and let it cache
  void tree.value;

  // Cleanup references
  delete tree._root;
  delete tree.parent;
  delete tree.node;

  if (tree.type === 'item') {
    delete tree.properties;
    delete tree.scope;
    delete tree.scopes;
  } else if (tree.type === 'scope') {
    delete tree.value;
    delete tree.scopes;
  }
  
  var i, l, p, r;

  if (tree.scopes) {
    var scopes = Object.keys(tree.scopes);
    for (i = 0, l = scopes.length; i < l; i++) {
      for (p = 0, r = tree.scopes[scopes[i]].length; p < r; p++) {
        cleanupTree(tree.scopes[scopes[i]][p]);
      }
    }
  }

  if (tree.properties) {
    var properties = Object.keys(tree.properties);
    for (i = 0, l = properties.length; i < l; i++) {
      for (p = 0, r = tree.properties[properties[i]].length; p < r; p++) {
        cleanupTree(tree.properties[properties[i]][p]);
      }
    }
  }
}
