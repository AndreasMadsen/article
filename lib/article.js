
var util = require('util');
var stream = require('stream');
var Parser = require('htmlparser2').Parser;

var nodes = require('./nodes.js');

var Fase1Title = require('./fase-1/title.js');
//var Fase1Text = require('./fase-1/text.js');

function Article(source, callback) {
  if (!(this instanceof Article)) return new Article(source, callback);
  stream.Writable.call(this);
  var self = this;
  
  this._source = source;
  this._callback = callback;
  
  // Create fase-1 algoritme objects
  this._fase1 = {
    title: new Fase1Title(),
    //text: new Fase1Text()
  };
  
  //
  // Simple tree constructor
  //
  
  // Create a root element that all other nodes will be assigned to
  var tree = this._tree = new nodes.RootNode();
  
  // Temorarry current container variable
  var lastnode = this._tree;
  // Counts the element position
  var position = 0;

  this._parser = new Parser({
    onopentag: function (name, attr) {
      var node = new nodes.ElementNode(lastnode.element(), name, attr);
          node.position = ++position;

      // Append node
      lastnode = lastnode.append(node);
    },

    ontext: function (text) {
      // In theory this can be destructive
      //   e.q "Hallo<span> </span>World" would become HalloWorld
      // But it seams very unlikely, so until an issue appear this is not going
      // to change.
      if (text.trim() !== '') {
        var node = new nodes.TextNode(lastnode.element(), text);

        // If the text node won't just be appended to another textnode
        if (lastnode.type !== 'text') {
          node.position = ++position;
        }

        // Append node
        lastnode = lastnode.append(node);
      }
    },

    onclosetag: function () {
      var node = lastnode.element();
      lastnode = lastnode.close();

      // Element can not get more children call handler
      self._element(node);
    },

    onend: this._end.bind(this)
  });
  
  this.once('finish', function () {
    this._parser.end();
  });
}
module.exports = Article;
util.inherits(Article, stream.Writable);

Article.prototype._write = function (chunk, encoding, done) {
  this._parser.write(chunk);
  done(null);
};

Article.prototype._element = function (node) {
  this._fase1.title.element(node);
  //this._fase1.text.element(node);
};

Article.prototype._end = function () {
  this._fase1.title.end();
  //this._fase1.text.end();
  
  this._callback(null, {
    title: this._fase1.title.result()
  });
};
