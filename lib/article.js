
var util = require('util');
var stream = require('stream');
var Parser = require('htmlparser2').Parser;
var entities = require('entities');
var levenshtein = require('levenshtein-component');
var worddiff = require('worddiff');

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
  
  // Stores a global analysis state
  this._history = {
    // each feature is adjusted by its [min, max]
    levenshtein: [],
    worddiff: [],
    level: [Infinity, -Infinity]
  };

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
    this._extendHistroy();
    this._titles.push({
      'text': helpers.getRawText(node),
      'node': node
    });
  }
  else if (node.tagname === 'meta' && (
    (attr.property && attr.property.toLowerCase() === 'rnews:headline') ||
    (attr.name && attr.name.toLowerCase() === 'title')
  )) {
    this._extendHistroy();
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

Article.prototype._extendHistroy = function () {
  this._history.levenshtein.push([Infinity, -Infinity]);
  this._history.worddiff.push([Infinity, -Infinity]);
};

Article.prototype._updateHistory = function (history, value) {
  // if value is less than min history
  if (history[0] > value) {
    history[0] = value;
  }

  // if value is higher than max histroy
  if (history[1] < value) {
    history[1] = value;
  }
};

Article.prototype._calculateHeader = function (node) {
  var text = helpers.getRawText(node);
  var distance = {
    levenshtein: [],
    worddiff: []
  };

  var result;

  for (var i = 0, l = this._titles.length; i < l; i++) {
    // calculate levenshtein distance
    result = levenshtein(text, this._titles[i].text);
    distance.levenshtein.push(result);
    this._updateHistory(this._history.levenshtein[i], result);

    // calculate unorder word diff
    result = worddiff(text, this._titles[i].text);
    distance.worddiff.push(result);
    this._updateHistory(this._history.worddiff[i], result);
  }

  // Find the heading level
  var level = Number(node.tagname.slice(1));
  this._updateHistory(this._history.level, level);
  
  return {
    'distance': distance,
    'level': level,
    'likelihood': 0,
    'text': text,
    'node': node
  };
};

function adjustedLikelihood(values, history) {
  var adjusted = 0;
  var l = history.length;
  for (var i = 0; i < l; i++) {
    adjusted += (values[i] - history[i][0]) / (history[i][1] - history[i][0]);
  }
  return adjusted / l;
}

Article.prototype._calculateHeaderLikelihood = function (header) {
  var history = this._history;
  var distance = header.distance;

  // features
  var levenshtein = 1 - adjustedLikelihood(distance.levenshtein, history.levenshtein);
  var worddiff = 1 - adjustedLikelihood(distance.worddiff, history.worddiff);
  var level = 1 - (header.level - history.level[0]) / (history.level[1] - history.level[0]);

  // The likelihood is the avg. adjusted features
  header.likelihood = (levenshtein + worddiff + level) / 3;

  if (header.text === 'ECMAScript: ES.next versus ES 6 versus ES Harmony' || header.text === 'Twitter') {
    console.log(header.likelihood, header.text, levenshtein, worddiff, level, header.level, history.level);
  }
};

Article.prototype._end = function () {
  // Set the likelihood property on each header
  this._headers.forEach(this._calculateHeaderLikelihood.bind(this));

  // Find the article header
  var articleHeader = null;
  var likelihood = 0;
  for (var i = 0, l = this._headers.length; i < l; i++) {
    // Best likelihood wins, but futher down on the page is also good
    if (this._headers[i].likelihood >= likelihood) {
      likelihood = this._headers[i].likelihood;
      articleHeader = this._headers[i];
    }
  }

  this._callback(null, {
    title: articleHeader.text
  });
};
