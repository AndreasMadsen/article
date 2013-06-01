
var util = require('util');
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
  this._adjustWordmatch = [];
  this._adjustContainerCount = new mathHelpers.RangeObject();
  this._adjustContainerDensity = new mathHelpers.RangeObject();

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
    this._adjustWordmatch.push(new mathHelpers.RangeObject());
  } else {
    // The text already exists, just incease the appear counter
    this._metaAppear[index] += 1;
  }
};

TextAlgoritme.prototype._handleText = function (node) {
  this._elements.push(node);
};

// This function is made by the following requirements:
// : x < 0.01 , y = 0.5
// : x > 0.1 , y = 1
// : c(x), otherwise
// The f(x) polynomium is made so it follows:
// : f(0.01) = 0.5
// : f'(0.01) = 1
// : f(0.1) = 1
// : f'(0.1) = 1
function adjustLiklihood(x) {
  if (x < 0.01) return 0.5;
  else if (x > 0.1) return 1;
  else return - 1371 * Math.pow(x, 3) + 226 * Math.pow(x, 2) - 4.11 * x + 0.52;
}

// The end of the document is reached
TextAlgoritme.prototype.end = function () {
  // Take the 50 best elements mesured by the density
  var elements = this._elements = this._elements
    .sort(function (a, b) {
      return b.density - a.density;
    })
    .slice(0, 25);
  
  var commonParentNode = {};
  var commonParentCount = {};
  var keys = [];
  
  // Do a x/x table match to find the common parents
  var l =  elements.length;
  for (var i = 0; i < l; i++) {
    for (var j = 0; j < l; j++) {
      // Match every elements against evey other element and find there
      // common parent, this includes the element itself.
      var parent = domHelpers.commonParent(elements[i], elements[j]);

      // Since the elements position is uniqe it is used as an indentifier 
      if (commonParentNode.hasOwnProperty(parent.position) === false) {
        commonParentNode[parent.position] = parent;
        commonParentCount[parent.position] = 0;
        keys.push(parent.position);
        this._adjustContainerDensity.update(parent.density);
      }
      var count = commonParentCount[parent.position] += 1;
      this._adjustContainerCount.update(count);
    }
  }

  // Calculate the likelihood for each commonParent
  var commonParent = [];
  
  for (var n = 0, t = keys.length; n < t; n++) {
    var node = commonParentNode[ keys[n] ];

    var adjusedCount = mathHelpers.adjusedValue(
      commonParentCount[ keys[n] ],
      this._adjustContainerCount
    );

    var adjusedDensity = mathHelpers.adjusedValue(
      commonParentNode[ keys[n] ].density,
      this._adjustContainerDensity
    );

    var likelihood = mathHelpers.distance([adjusedCount, adjusedDensity]);
    
    // Some containers may win adjused features like (1,0) under the right
    // conditions. The goal of this transformation of likelihood is to make
    // those elements unlikly.
    // NOTE: one may think it would be simpler to  remove them, but empirical
    // studies sugest that it is not possible.
    // SEE: 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3be15fbf3161d
    likelihood = adjustLiklihood(Math.min(adjusedCount, adjusedDensity)) * likelihood;

    commonParent.push({
      'node': node,
      'minimum': Math.min(adjusedCount, adjusedDensity),
      'likelihood': likelihood
    });
  }
  
  // Now sort the remaining commonParent containers by likelihood and then
  // their position
  commonParent.sort(function (a, b) {
    var likelihood = b.likelihood - a.likelihood;
    if (likelihood !== 0) return likelihood;

    return b.node.position - a.node.position;
  });

  this._textContainer = commonParent;
};

// It is time to return the best result
TextAlgoritme.prototype.result = function () {
  
  // For now, just select the best container
  return domHelpers.getRawText(this._textContainer[0].node).trim();
};
