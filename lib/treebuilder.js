
var util = require('util');
var stream = require('stream');
var Parser = require('htmlparser2').Parser;

var domHelpers = require('./helpers-dom.js');
var nodes = require('./nodes.js');

var NONE_SPACE_CHAR = /\S/;

function TreeBuilder() {
  stream.Writable.call(this);
  var self = this;

  // Create a root element that all other nodes will be assigned to
  this._tree = new nodes.RootNode();

  // Temorarry current container variable
  var lastnode = this._tree;

  this._parser = new Parser({
    onopentag: function (name, attr) {
      var node = new nodes.ElementNode(lastnode.element(), name, attr);

      // Append node
      lastnode = lastnode.append(node);
    },

    ontext: function (text) {
      // In theory this can be destructive
      //   e.q "Hallo<span> </span>World" would become HalloWorld
      // But it seams very unlikely, so until an issue appear this is not going
      // to change.
      if (NONE_SPACE_CHAR.test(text) === true) {
        var node = new nodes.TextNode(lastnode.element(), domHelpers.normalizeString(text));

        // Append node
        lastnode = lastnode.append(node);
      }
    },

    onclosetag: function (tagname) {
      var node = lastnode.element();
      lastnode = lastnode.close();

      // Element can not get more children call handler
      self._element(node);
    },

    onend: function () {
      self._tree.close();
      self._end();
    }
  }, {
    lowerCaseTags: true,

    // This is quite expensive and is done within the attribute matcher
    lowerCaseAttributeNames: false,

    xmlMode: false
  });

  this.once('finish', function () {
    this._parser.end();
  });
}
module.exports = TreeBuilder;
util.inherits(TreeBuilder, stream.Writable);

TreeBuilder.prototype._write = function (chunk, encoding, done) {
  this._parser.write(chunk);
  done(null);
};

TreeBuilder.prototype._element = function (node) {
  throw new Error('element not implemented');
};

TreeBuilder.prototype._end = function () {
  throw new Error('end not implemented');
};
