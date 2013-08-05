
var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var TextContainerItem = require('./text-container-item.js');
var TextMetaItem = require('./text-meta-item.js');

function TextAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaText = [];
  this._meta = [];

  // Contains all body elements, when they all are collected it will be sorted
  // by its text/tag density
  this._elements = [];

  // Temporary object used in creating the resulting container objects
  this._containerMap = {};
  this._containerText = Object.create(null);

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
  // NOTE: out if 258 html files the lowerst density in the 40 most dense
  // elements was 12, so for optimization don't add elements with a density
  // lower than 10. Something lower than 10 would mostlikely also be useless.
  else if (node.density > 10) {
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

TextAlgoritme.prototype._analysePair = function (elemA, elemB) {
  // Match every elements against evey other element and find there
  // common parent, this includes the element itself.
  var parentNode = domHelpers.commonParent(elemA, elemB);

  // The root, html and body are not valid parents, since they will always
  // contain too much data
  if (parentNode.type === 'root' || parentNode.tagname === 'html' || parentNode.tagname === 'body') {
    return;
  }

  // Increase the counter if the parentNode has already been analysed
  if (this._containerMap.hasOwnProperty(parentNode.identifyer) === true) {
    this._containerMap[parentNode.identifyer].increaseCount();
    return;
  }

  // The size is text crazy big, even if it is correct it will take a long
  // time to process
  var rawText = parentNode.getText().trim();
  if (rawText.length > 20000) return;

  // If another node contains the same text, don't create a new parent
  // just increase its counter
  var identifyer = this._containerText[rawText];
  if (identifyer !== undefined) {
    this._containerMap[identifyer].increaseCount();
    return;
  }

  // Create the container object and maintain the keys array
  this._containerText[rawText] = parentNode.identifyer;
  this._containerMap[parentNode.identifyer] = new TextContainerItem(this, parentNode, rawText);
};

// The end of the document is reached
TextAlgoritme.prototype.end = function () {
  // Take the 40 best elements mesured by the density
  var elements = this._elements
    .sort(function (a, b) {
      return b.density - a.density;
    })
    .slice(0, 40);

  // Do a x/x table match to find the common parents
  var l = elements.length;
  for (var i = 0; i < l; i++) {
    for (var j = i; j < l; j++) {
      this._analysePair(elements[i], elements[j]);
    }
  }

  // Calculate the likelihood for each commonParent
  var commonParent = [];
  var keys = Object.keys(this._containerMap);
  for (var n = 0, t = keys.length; n < t; n++) {
    var item = this._containerMap[ keys[n] ];
        item.calculateLikelihood();
    commonParent.push(item);
  }

  // Now sort the remaining commonParent containers by likelihood and then
  // their position
  this._containers = commonParent.sort(function (a, b) {
    var likelihood = b.likelihood - a.likelihood;
    if (likelihood !== 0) return likelihood;
    return b.node.identifyer - a.node.identifyer;
  });
};

TextAlgoritme.prototype.result = function () {
  return this._containers;
};
