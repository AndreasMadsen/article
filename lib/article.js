
var util = require('util');
var stream = require('stream');
var Parser = require('htmlparser2').Parser;
var entities = require('entities');
var levenshtein = require('levenshtein-component');

var nodes = require('./nodes.js');
var helpers = require('./helpers.js');

var NO_ENDING_TAG = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr',
  'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'wbr'];

function Article(source, callback) {
  if (!(this instanceof Article)) return new Article(source, callback);
  stream.Writable.call(this);
  var self = this;
  
  this._source = source;
  this._callback = callback;
  
  // Makes the elements sortable
  this._position = 0;
  
  // Easy to find elements
  this._titles = [];
  this._images = [];
  this._headers = [];
  this._description = [];

  var root = new nodes.RootNode();
  this._treelast = this._tree = root;
  this._templast = this._temp = root;

  this._parser = new Parser({
    onopentag: function (name, attr) {
      var node = new nodes.ElementNode(self._templast.last(), name, attr);
          node.position = ++self._position;

      // Append node
      self._templast = self._templast.append(node);
    },

    ontext: function (text) {
      text = entities.decodeHTML5(text).trim();
      if (text !== '') {
        var node = new nodes.TextNode(self._templast.last(), text);

        // If the text node won't just appended to another textnode
        if (self._templast.type !== 'text') {
          node.position = ++self._position;
        }

        // Append node
        self._templast = self._templast.append(node);
      }
    },

    onclosetag: function () {
      var node = self._templast.last();
      self._templast = self._templast.close();

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
  var attr = node.attr;

  // Find titles where position isn't helpfull
  if (node.tagname === 'title') {
    this._titles.push({
      'text': helpers.getRawText(node),
      'node': node
    });
  }
  else if (node.tagname === 'meta' && (
    (attr.property && attr.property.toLowerCase() === 'rnews:headline') ||
    (attr.name && attr.name.toLowerCase() === 'title')
  )) {
    this._titles.push({
      'text': entities.decodeHTML5(attr.content),
      'node': node
    });
  }

  // Find descriptions where position isn't helpfull
  else if (node.tagname === 'meta' && (
    (attr.property && attr.property.toLowerCase() === 'rnews:description') ||
    (attr.name && attr.name.toLowerCase() === 'description')
  )) {
    this._description.push({
      'text': entities.decodeHTML5(attr.content),
      'node': node
    });
  }

  // Find headings
  else if (node.tagname === 'h1' || node.tagname === 'h2' ||
           node.tagname === 'h3' || node.tagname === 'h4' ||
           node.tagname === 'h5' || node.tagname === 'h6') {
    this._headers.push(this._calculateHeader(node));
  }

  // Find images
  else if (node.tagname === 'img' && attr.src) {
    this._images.push({
      'src': entities.decodeHTML5(attr.src),
      'node': node
    });
  }
};

Article.prototype._calculateHeader = function (node) {
  var text = helpers.getRawText(node);
  var distance = 0;

  for (var i = 0, l = this._titles.length; i < l; i++) {
    distance += levenshtein(text, this._titles[i].text);
  }
  
  return {
    'levenshtein': distance,
    'level': Number(node.tagname.slice(1)),
    'text': text,
    'node': node
  };
};

Article.prototype._end = function () {
  // Find the article header
  var articleHeader = this._headers.sort(function (a, b) {
    // Sort by levenshtein
    var order = a.levenshtein - b.levenshtein;

    // If equal sort by heading level
    if (order === 0) {
      order = a.level - b.level;
    }

    return order;
  })[0];
  
  this._callback({
    title: articleHeader
  });
};
