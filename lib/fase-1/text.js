
var fusspos = require('fusspos');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var TextContainerItem = require('./text-container-item.js');
var TextMetaItem = require('./text-meta-item.js');

var WORD_SPLIT = /\s+/;
var LINE_SPLIT = /\n+/;

function TextAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaText = [];
  this._meta = [];

  // Contains all body elements, when they all are collected it will be sorted
  // by its text/tag density
  this._elements = [];

  // Range objects for adjusing features intro a 0..1 range
  this._adjustContainerCount = new mathHelpers.RangeObject();
  this._adjustContainerDensity = new mathHelpers.RangeObject();
  this._adjustShortline = new mathHelpers.RangeObject();
  this._adjustLinebreak = new mathHelpers.RangeObject();
  this._adjustClasscount = new mathHelpers.RangeObject();
  this._adjustStyleRatio = new mathHelpers.RangeObject();
  this._adjustSentensesCount = new mathHelpers.RangeObject();
  this._adjustParagraphCount = new mathHelpers.RangeObject();

  // Contains some good sugestions for text containers
  this._containers = [];
}
module.exports = TextAlgoritme;

var metaDescription = domHelpers.buildAttributeMatcher({
  property: ['rnews:description', 'og:description', 'twitter:description'],
  name: ['description', 'lp', 'twitter:description'],
  itemprop: ['description']
});

TextAlgoritme.prototype.element = function (node) {
  // Grap the <meta> tags, there may contain some valuable information.
  if (node.tagname === 'meta' && metaDescription(node.attr) && node.attr.content) {
    this._handleMeta(domHelpers.normalizeString(node.attr.content));
  }
  // Grap actual text containing elements
  else if (node.density !== 0) {
    this._handleText(node);
  }
};

TextAlgoritme.prototype._handleMeta = function (text) {
  text = text.trim();

  // Check if this is a new string, in case of dublication there is no need
  // for calculating the distances again, just incease a counter
  var index = this._metaText.indexOf(text);

  if (index === -1) {
    // Not found add a new string
    this._metaText.push(text);

    // Create and store meta object
    this._meta.push(new TextMetaItem(text));

    // TODO: use the same pattern as in title.js
  } else {
    // The text already exists, just incease the appear counter
    this._meta[index].increaseAppear();
  }
};

TextAlgoritme.prototype._handleText = function (node) {
  this._elements.push(node);
};

// The end of the document is reached
TextAlgoritme.prototype.end = function () {
  // Take the 40 best elements mesured by the density
  var elements = this._elements
    .sort(function (a, b) {
      return b.density - a.density;
    })
    .slice(0, 40);

  var commonParentMap = {};
  var keys = [];

  var textMap = Object.create(null);

  // Do a x/x table match to find the common parents
  var l = elements.length;
  for (var i = 0; i < l; i++) {
    for (var j = i; j < l; j++) {
      // Match every elements against evey other element and find there
      // common parent, this includes the element itself.
      var parentNode = domHelpers.commonParent(elements[i], elements[j]);

      // The root, html and body are not valid parents, since they will always
      // contain too much data
      if (parentNode.type === 'root' ||
          parentNode.tagname === 'html' ||
          parentNode.tagname === 'body') {
        continue;
      }

      // Increase the counter if the parentNode has already been analysed
      if (commonParentMap.hasOwnProperty(parentNode.identifyer) === true) {
        commonParentMap[parentNode.identifyer].increaseCount();
        continue;
      }

      // The size is text crazy big, even if it is correct it will take a long
      // time to process
      var rawText = parentNode.getText().trim();
      if (rawText.length > 20000) continue;

      // If another node contains the same text, don't create a new parent
      // just increase its counter
      var identifyer = textMap[rawText];
      if (identifyer !== undefined) {
        commonParentMap[identifyer].increaseCount();
        continue;
      }

      // Map the text to the commonParentMap identifyer
      textMap[rawText] = parentNode.identifyer;

      // Create the container object and maintain the keys array
      var objectKey = parentNode.identifyer.toString();
      commonParentMap[objectKey] = new TextContainerItem(this, parentNode, rawText);
      keys.push(objectKey);
    }
  }

  // Calculate the likelihood for each commonParent
  var commonParent = [];
  for (var n = 0, t = keys.length; n < t; n++) {
    var item = commonParentMap[ keys[n] ];
        item.calculateLikelihood();
    commonParent.push(item);
  }

  // Now sort the remaining commonParent containers by likelihood and then
  // their position
  commonParent.sort(function (a, b) {
    var likelihood = b.likelihood - a.likelihood;
    if (likelihood !== 0) return likelihood;
    return b.node.identifyer - a.node.identifyer;
  });

  this._containers = commonParent;
};

TextAlgoritme.prototype.result = function () {
  return this._containers;
};
