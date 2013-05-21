
var util = require('util');
var TreeBuilder = require('./treebuilder.js');

var Fase1Title = require('./fase-1/title.js');
//var Fase1Text = require('./fase-1/text.js');

function Article(source, callback) {
  if (!(this instanceof Article)) return new Article(source, callback);
  TreeBuilder.call(this);

  this._source = source;
  this._callback = callback;

  // Create fase-1 algoritme objects
  this._fase1 = {
    title: new Fase1Title(),
    //text: new Fase1Text()
  };
}
module.exports = Article;
util.inherits(Article, TreeBuilder);

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
