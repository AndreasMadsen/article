
var worddiff = require('worddiff');
var levenshtein = require('levenshtein-component');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function TextAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaAppear = [];
  this._metaText = [];

  // Contains all body elements, when they all are collected it will be sorted
  // by its text/tag density
  this._elements = [];

  // Each feature is adjusted by its [min, max] relative to the meta text
  this._adjustLevenshtein = [];
  this._adjustWorddiff = [];

  // The header level feature is adjused to the highest and lowest level in the
  // document
  this._adjustLevel = [Infinity, -Infinity];
}
module.exports = TextAlgoritme;

var metaDescription = domHelpers.buildAttributeMatcher({
  property: ['rnews:description', 'og:description', 'twitter:description'],
  name: ['description', 'lp', 'twitter:description'],
  itemprop: ['description']
});

console.log(metaDescription.toString());

TextAlgoritme.prototype.element = function (node) {
  if (node.tagname === 'meta' && metaDescription(node.attr)) console.log(node);
  // Grap the <meta> tags, there may contain some valuable information.
  if (node.tagname === 'meta' && metaDescription(node.attr)) {
    this._handleMeta(domHelpers.normalizeString(node.attr.content));
  }
  // Grap actual text containing elements
  else if (node.tagname !== 'script' &&
          node.tagname !== 'pre' &&
          node.tagname !== 'style' &&
          node.density !== 0) {
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
    this._adjustLevenshtein.push([Infinity, -Infinity]);
    this._adjustWorddiff.push([Infinity, -Infinity]);
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
  this._elements = this._elements.sort(function (a, b) {
    return b.density - a.density;
  });
};

// It is time to return the best result
TextAlgoritme.prototype.result = function () {
  console.log(this._metaText);
  return domHelpers.getRawText(this._elements[0]);
};
