
var domHelpers = require('../helpers-dom.js');

function TextAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaAppear = [];
  this._metaText = [];

  // Contains all body elements, when they all are collected it will be sorted
  // by its text/tag density
  this._elements = [];
  this._adjustWordmatch = [];
  
  // Contains some good sugestions for text containers
  this._textContainer = [];
}
module.exports = TextAlgoritme;

var metaDescription = domHelpers.buildAttributeMatcher({
  property: ['rnews:description', 'og:description', 'twitter:description'],
  name: ['description', 'lp', 'twitter:description'],
  itemprop: ['description']
});

TextAlgoritme.prototype.element = function (node) {
  // Grap the <meta> tags, there may contain some valuable information.
  if (node.tagname === 'meta' && metaDescription(node.attr)) {
    this._handleMeta(domHelpers.normalizeString(node.attr.content));
  }
  // Grap actual text containing elements
  else if (node.density !== 0) {
    this._handleText(node);
 }
};

TextAlgoritme.prototype._handleMeta = function (text) {
  // trim the text
  text = text.trim();

  // Check if this is a new string, in case of dublication there is no need
  // for calculating the distances again, just incease a counter
  var index = this._metaText.indexOf(text);
  
  // Not found add a new string
  if (index === -1) {
    // Add text to the meta collection
    this._metaText.push(text);
    this._metaAppear.push(1);

    // prepear adjusted feature arrays to be maintaned when the <h_> tags
    // are handled
    this._adjustWordmatch.push([Infinity, -Infinity]);
  } else {
    // The text already exists, just incease the appear counter
    this._metaAppear[index] += 1;
  }
};

TextAlgoritme.prototype._handleText = function (node) {
  this._elements.push(node);
};

// The end of the document is reached
TextAlgoritme.prototype.end = function () {
  // Take the 100 best elements mesured by the density
  var elements = this._elements = this._elements
    .sort(function (a, b) {
      return b.density - a.density;
    });

  // Get the 10 best container
  var best = elements[0];

  // Get the next 10 good containers there is the common parent
  // of the best node and another good node there is not contained within the
  // best node. There is also the possibility that the best node contains
  // every thing, so add that to the `commonParent` list.
  var commonParent = [best];
  for (var i = 1, l = elements.length; i < l && commonParent.length <= 10; i++) {
    if (domHelpers.containerOf(best, elements[i]) === false) {
      var container = domHelpers.commonParent(best, elements[i]);
      if (commonParent.indexOf(container) === -1) {
        commonParent.push(container);
      }
    }
  }
  
  // Save the found container sugestions and sort them by position
  this._textContainer = commonParent.sort(function (a, b) {
    return b.position - a.position;
  });
};

// It is time to return the best result
TextAlgoritme.prototype.result = function () {

  // Since it is unlikly that the best node (`this._elements[0]`) is the
  // text container, select the next most "likely" element if the most "likely"
  // element is the best node.
  return domHelpers.getRawText(this._textContainer[
    this._textContainer[0] === this._elements[0] ? 1 : 0
  ]).trim();
};
