
var fusspos = require('fusspos');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var WORD_SPLIT = /\s+/;
var LINE_SPLIT = /\n+/;

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
  this._adjustShortline = new mathHelpers.RangeObject();
  this._adjustLinebreak = new mathHelpers.RangeObject();
  this._adjustClasscount = new mathHelpers.RangeObject();
  this._adjustStyleRatio = new mathHelpers.RangeObject();

  // Count the apperence of classes, an element there share a class with many
  // other elements is unlikely to to an article (unique container).
  // This seams like good indicator for comments and "related article descriptions"
  this._classCount = {};

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
  if (node.tagname === 'meta' && metaDescription(node.attr) && node.attr.content) {
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
    this._metaTextArray.push(text.split(WORD_SPLIT));
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
  for (var i = 0, l = node.classes.length; i < l; i++) {
    if (this._classCount.hasOwnProperty(node.classes[i])) {
      this._classCount[node.classes[i]] += 1;
    } else {
      this._classCount[node.classes[i]] = 1;
    }
  }

  this._elements.push(node);
};

// This function is made by the following requirements:
// : x < 0.01 , y = 0.5
// : x > 0.1 , y = 1
// : f(x), otherwise
// The f(x) polynomium is made so it follows:
// : f(0.01) = 0.5
// : f'(0.01) = 0
// : f(0.1) = 1
// : f'(0.1) = 0
function adjustLiklihood(x) {
  if (x < 0.01) return 0.5;
  else if (x > 0.1) return 1;
  else return Math.min(1, - 1371 * Math.pow(x, 3) + 226 * Math.pow(x, 2) - 4.11 * x + 0.52);
}

// This function is made by the following requirements:
// x > 5, y = 1
// f(x) = a*sqrt(x) + b*x^2 + c
// f(0) = 0.2
// f(5) = 1
// f'(5) = 0
function linebreakScore(x) {
  if (x > 5) return 1;
  else return Math.min(1, 0.477 * Math.sqrt(x) - 0.0106 * Math.pow(x, 2) + 0.2);
}


var CLASS_COUNT_SCORES = [1, 0.85, 0.73, 0.63, 0.54, 0.44, 0.34, 0.26, 0.22, 0.2];
function classcountScore(x) {
  if (x <= 1) return 1;
  else if (x >= 10) return 0.2;
  else return CLASS_COUNT_SCORES[x - 1];
}

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
  var r = this._metaText.length;
  var count = 0;
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

      // Since the elements position is uniqe it is used as an indentifier 
      if (commonParentMap.hasOwnProperty(parentNode.position) === false) {
        var parentText = domHelpers.getRawText(parentNode);

        // If another node contains the same text, don't create a new parent
        // just increase its counter
        var identifier = textMap[parentText];
        if (identifier !== undefined) {
          count = commonParentMap[identifier].count += 1;
          this._adjustContainerCount.update(count);
          continue;
        }

        // Map the text to the commonParentMap identifier
        textMap[parentText] = parentNode.position;

        var parent = commonParentMap[parentNode.position] = {
          'node': parentNode,
          'count': 0,
          'text': parentText,
          'shortlines': 0,
          'linebreaks': 0,
          'classcount': 0,
          'styleratio': 0,
          'match': []
        };

        // Compare the amount of styled text with the total text length
        // E.q. this will prevent long lists of links to be registred as a
        // text container
        var noneStyledText = domHelpers.getNoneStyledText(parentNode);
        var styleratio = 1 - (parentText.length - noneStyledText.length) / parentText.length;
        parent.styleratio = styleratio;
        this._adjustStyleRatio.update(parent.styleratio);

        // Calculcate a classcount score
        var minclasscount = 0;
        for (var e = 0, o = parentNode.classes.length; e < o; e++) {
          if (minclasscount < this._classCount[parentNode.classes[e]]) {
            minclasscount = this._classCount[parentNode.classes[e]];
          }
        }
        parent.classcount = minclasscount === 0 ? 1 : classcountScore(minclasscount);
        this._adjustClasscount.update(parent.classcount);

        // Count the amount of short lines (40 chars)
        var linearray = parentText.split(LINE_SPLIT);
        var shortlines = 0;
        for (var a = 0, m = linearray.length; a < m; a++) {
          if (linearray[a].length <= 40) {
            shortlines += 1;
          }
        }
        parent.shortlines = shortlines;
        this._adjustShortline.update(shortlines);

        // Punish parents there has very few lines
        parent.linebreaks = linebreakScore(linearray.length);
        this._adjustLinebreak.update(parent.linebreaks);

        // Match the text agains given meta descriptions
        var textarray = parentText.split(WORD_SPLIT);
        for (var c = 0; c < r; c++) {
          var search = fusspos(this._metaTextArray[c], textarray);

          // Calculate the probability for the description
          var probability = Number.isNaN(search.middle) ?
            0 :
            ((textarray.length - search.start) / textarray.length) * (1 - search.fussy);

          parent.match.push(probability);
          this._adjustDescriptionProbability[c].update(probability);
        }

        // Add the object key so we don't have to do a Object.keys later
        keys.push(parentNode.position);

        // Update RangeObjects
        this._adjustContainerDensity.update(parentNode.density);
      }

      // Increase the counter
      count = commonParentMap[parentNode.position].count += 1;
      this._adjustContainerCount.update(count);
    }
  }
  
  // GC: textMap is expensive
  textMap = {};

  // Calculate the likelihood for each commonParent
  var commonParent = [];

  for (var n = 0, t = keys.length; n < t; n++) {
    var item = commonParentMap[ keys[n] ];
    var adjusedCount = mathHelpers.adjusedValue(item.count, this._adjustContainerCount);
    var adjusedDensity = mathHelpers.adjusedValue(item.node.density, this._adjustContainerDensity);
    var adjusedLinebreak = mathHelpers.adjusedValue(item.linebreaks, this._adjustLinebreak);
    var adjusedClassscore = mathHelpers.adjusedValue(item.classcount, this._adjustClasscount);
    var adjusedStyleRatio = mathHelpers.adjusedValue(item.styleratio, this._adjustStyleRatio);

    // Lower values are better for the shortline score
    var adjusedShortline = 1 - mathHelpers.adjusedValue(item.shortlines, this._adjustShortline);

    // Use the descriptions to calculate liklihood if possible
    var adjusedMatch, likelihood, minimum;
    if (this._metaAppear.length > 0) {
      adjusedMatch = mathHelpers.adjustedSum(item.match, this._adjustDescriptionProbability, this._metaAppear);
    } else {
      adjusedMatch = 1;
    }

    var scores = [
      adjusedCount, adjusedDensity, adjusedShortline,
      adjusedMatch, adjusedLinebreak, adjusedClassscore,
      adjusedStyleRatio
    ];
    likelihood = mathHelpers.distance(scores);
    minimum = Math.min.apply(Math, scores);

    // Some containers may win on adjused features like (1,0) under the right
    // conditions. The goal of this transformation of likelihood is to make
    // those elements unlikly.
    // NOTE: one may think it would be simpler to remove them, but empirical
    // studies sugest that it is not possible.
    // SEE: 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3be15fbf3161d
    likelihood = adjustLiklihood(minimum) * likelihood;

    commonParent.push({
      'discretCount': item.count,
      'count': adjusedCount,
      'density': adjusedDensity,
      'shortline': adjusedShortline,
      'linebreaks': adjusedLinebreak,
      'classcount': adjusedClassscore,
      'styleratio': adjusedStyleRatio,
      'match': adjusedMatch,
      'attr': item.node.attr,
      'node': item.node,
      'text': item.text,
      'likelihood': likelihood
    });
  }

  // GC: commonParentMap is expensive
  commonParentMap = {};  

  // Now sort the remaining commonParent containers by likelihood and then
  // their position
  commonParent.sort(function (a, b) {
    var likelihood = b.likelihood - a.likelihood;
    if (likelihood !== 0) return likelihood;

    return b.node.position - a.node.position;
  });

  this._textContainer = commonParent;
};

TextAlgoritme.prototype.result = function () {
  return this._textContainer;
};
