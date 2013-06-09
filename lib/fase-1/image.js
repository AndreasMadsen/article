
var url = require('url');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function ImageAlgoritme(main) {
  this._images = {};

  this._base = main._source;
}
module.exports = ImageAlgoritme;

var metaImage = domHelpers.buildAttributeMatcher({
  property: ['og:image']
});

ImageAlgoritme.prototype.element = function (node) {
  // Support alternative relative paths
  if (node.tagname === 'base') {
    this._base = node.attr.href;
  }
  // Grap the <meta> tags, a link is a link so meta urls are good sugestions
  else if (node.tagname === 'meta' && metaImage(node.attr) && node.attr.content) {
    this._handleMeta(node);
  }
};

ImageAlgoritme.prototype._handleMeta = function (meta) {
  var href = meta.attr.content;

  if (this._images.hasOwnProperty(href) === false) {
    this._images[href] = {
      size: { width: null, height: null },
      href: href,
      from: []
    };
  }

  if (meta.attr.property === 'og:image') {
    this._images[href].from.push('og');
  }
};

// The end of the document is reached
ImageAlgoritme.prototype.end = function () {
  
};
 
// It is time to return the best result
ImageAlgoritme.prototype.result = function () {
  var keys = Object.keys(this._images);
  return keys.length !== 0 ? url.resolve(this._base, keys[0]) : null;
};
