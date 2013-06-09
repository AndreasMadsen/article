
var fs = require('fs');
var path = require('path');
var util = require('util');

var TreeBuilder = require('../lib/treebuilder.js');

//
// Simple Tree Constructor
//
function Tree(callback) {
  TreeBuilder.call(this);
  var meta = [];

  this._element = function (node) {
    if (node.tagname === 'meta') {
      meta.push(node);
    }
  };
  this._end = function () {
    callback(null, meta);
  };
}
util.inherits(Tree, TreeBuilder);

var stream = new Tree(function (err, meta) {
  if (err) throw err;

  meta = meta.map(function (item) {
    return item.attr;
  });

  console.log(util.inspect(meta, {
    colors: true,
    depth: Infinity
  }));
});

fs.createReadStream(
  path.resolve(__dirname, '../test/reallife/source/' + process.argv[2] + '.html')
).pipe(stream);
