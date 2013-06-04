
var fusspos = require('fusspos');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function TextAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaAppear = [];
  this._metaText = [];
  this._metaTextArray = [];

  // Contains all body elements, when they all are collected it will be sorted
  // by its text/tag density
  this._elements = [];

  // Range objects for adjusing features intro a 0..1 range
  this._adjustDescriptionProbability = [];
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
    this._metaTextArray.push(text.split(/\s+/));
    this._metaAppear.push(1);

    // prepear adjusted feature arrays to be maintaned when the <h_> tags
    // are handled
    this._adjustDescriptionProbability.push(new mathHelpers.RangeObject());
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
  
  var commonParentMap = {};
  var keys = [];
  
  // Do a x/x table match to find the common parents
  var l = elements.length;
  var r = this._metaText.length;
  for (var i = 0; i < l; i++) {
    for (var j = 0; j < l; j++) {
      // Match every elements against evey other element and find there
      // common parent, this includes the element itself.
      var parentNode = domHelpers.commonParent(elements[i], elements[j]);

      // Since the elements position is uniqe it is used as an indentifier 
      if (commonParentMap.hasOwnProperty(parentNode.position) === false) {
        
        var parent = commonParentMap[parentNode.position] = {
          'node': parentNode,
          'count': 0,
          'text': domHelpers.getRawText(parentNode),
          'match': []
        };

        var textarray = parent.text.split(/\s+/);
        for (var c = 0; c < r; c++) {
          var search = fusspos(this._metaTextArray[c], textarray);

          // Calculate the probability for the description
          var probability = Number.isNaN(search.middle) ?
            0 :
            ((textarray.length - search.start) / textarray.length) * (1 - search.fussy);

          parent.match.push(probability);
          this._adjustDescriptionProbability[c].update(probability);
        }

        keys.push(parentNode.position);

        // Update RangeObjects
        this._adjustContainerDensity.update(parentNode.density);
      }

      // Increase the counter
      var count = commonParentMap[parentNode.position].count += 1;
      this._adjustContainerCount.update(count);
    }
  }

  // Calculate the likelihood for each commonParent
  var commonParent = [];

  for (var n = 0, t = keys.length; n < t; n++) {
    var item = commonParentMap[ keys[n] ];
    var adjusedCount = mathHelpers.adjusedValue(item.count, this._adjustContainerCount);
    var adjusedDensity = mathHelpers.adjusedValue(item.node.density, this._adjustContainerDensity);
    var adjusedMatch = mathHelpers.adjustedSum(item.match, this._adjustDescriptionProbability, this._metaAppear);

    var likelihood = mathHelpers.distance([adjusedCount, adjusedDensity, adjusedMatch]);

    // Some containers may win on adjused features like (1,0) under the right
    // conditions. The goal of this transformation of likelihood is to make
    // those elements unlikly.
    // NOTE: one may think it would be simpler to remove them, but empirical
    // studies sugest that it is not possible.
    // SEE: 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3be15fbf3161d
    likelihood = adjustLiklihood(Math.min(adjusedCount, adjusedDensity, adjusedMatch)) * likelihood;

    commonParent.push({
      'node': item.node,
      'text': item.text,
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
  return this._textContainer[0].text;
};
