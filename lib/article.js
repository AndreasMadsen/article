
var util = require('util');
var TreeBuilder = require('./treebuilder.js');

var Fase1Title = require('./fase-1/title.js');
var Fase1Text = require('./fase-1/text.js');
var Fase1Image = require('./fase-1/image.js');

var Fase2 = require('./fase-2/all.js');

function Article(source, callback) {
  if (!(this instanceof Article)) return new Article(source, callback);
  TreeBuilder.call(this);

  this._source = source;
  this._callback = callback;

  // Create fase-1 algoritme objects
  this._fase1title = new Fase1Title(this);
  this._fase1text = new Fase1Text(this);
  this._fase1image = new Fase1Image(this);

  // Create fase-2 algoritme objects
  this._fase2 = new Fase2(this);
}
module.exports = Article;
util.inherits(Article, TreeBuilder);

Article.prototype._element = function (node) {
  this._fase1title.element(node);
  this._fase1text.element(node);
  this._fase1image.element(node);
};

Article.prototype._end = function () {
  try {
    // Stream ended, perform the last calculations
    this._fase1title.end();
    this._fase1text.end();
    this._fase1image.end();

    // Make the fase-2 algortime fetch title, text and images
    this._fase2.update();

    // Use the title, text and image algortimes to get the final
    // best title, image values and text container
    this._fase2.combine();

    // Remove text noice, this algortimes goes beyond just selecting a text
    // container
    this._fase2.reduce();

    // Done calculating send the final result
    this._callback(null, this._fase2.result());
  } catch (err) {
    // Sync error occurred execute callback with error
    this._callback(err, null);
  }
};
