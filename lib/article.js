
var util = require('util');
var TreeBuilder = require('./treebuilder.js');

var Fase1Title = require('./fase-1/title.js');
var Fase1Text = require('./fase-1/text.js');
var Fase1Image = require('./fase-1/image.js');

function Article(source, callback) {
  if (!(this instanceof Article)) return new Article(source, callback);
  TreeBuilder.call(this);

  this._source = source;
  this._callback = callback;

  // Create fase-1 algoritme objects
  this._fase1title = new Fase1Title(this);
  this._fase1text = new Fase1Text(this);
  this._fase1image = new Fase1Image(this);
}
module.exports = Article;
util.inherits(Article, TreeBuilder);

Article.prototype._element = function (node) {
  this._fase1title.element(node);
  this._fase1text.element(node);
  this._fase1image.element(node);
};

Article.prototype._end = function () {
  this._fase1title.end();
  this._fase1text.end();
  this._fase1image.end();

  this._callback(null, {
    title: this._fase1title.result(),
    text: this._fase1text.result(),
    image: this._fase1image.result()
  });
};
