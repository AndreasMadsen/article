
var mathHelpers = require('../helpers-math.js');

var WORD_SPLIT = /\s+/;
var LINE_SPLIT = /\n+/;
var CONTAIN_SENTENCE = /\.[^a-zA-Z]+(?=[A-Z]|$)/;

function TextContainerItem(algoritme, node, text) {
  this._algoritme = algoritme;

  this.node = node;

  // Diffrent text properties
  this.text = text;
  this.lines = text.split(LINE_SPLIT);
  this.words = text.split(WORD_SPLIT);

  // A linear appear value
  this._count = 0;
  this.increaseCount();

  // The scores
  this._shortline = 0;
  this._linebreaks = 0;
  this._classcount = 0;
  this._styleratio = 0;
  this._paragraphs = 0;
  this._density = 0;
  this._match = [];

  // Calculate scores
  this._calculateScores();
  for (var i = 0, l = algoritme._meta.length; i < l; i++) {
    this.appendDistance(algoritme._meta[i]);
  }
}
module.exports = TextContainerItem;

TextContainerItem.prototype.increaseCount = function () {
  var algoritme = this._algoritme;

  this._count += 1;
  algoritme._adjustContainerCount.update(this._count);
};

TextContainerItem.prototype._calculateScores = function () {
  this._calculateShortline();
  this._calculateLinebreaks();
  this._calculateClasscount();
  this._calculateStyleratio();
  this._calculateSentenses();
  this._calculateParagraphs();
  this._calculateDensity();
};

// Containers with short lines should be punished
TextContainerItem.prototype._calculateShortline = function () {
  var algoritme = this._algoritme;

  // Count the amount of short lines (40 chars)
  var shortlines = 0;
  for (var a = 0, m = this.lines.length; a < m; a++) {
    if (this.lines[a].length <= 40) shortlines += 1;
  }

  // Update property
  this._shortlines = shortlines;
  algoritme._adjustShortline.update(shortlines);
};

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

// Containers with very few lines should be punished
TextContainerItem.prototype._calculateLinebreaks = function () {
  var algoritme = this._algoritme;
  var linebreaks = linebreakScore(this.lines.length);

  // Update property
  this._linebreaks = linebreaks;
  algoritme._adjustLinebreak.update(linebreaks);
};

var CLASS_COUNT_SCORES = [1, 0.85, 0.73, 0.63, 0.54, 0.44, 0.34, 0.26, 0.22, 0.2];
function classcountScore(x) {
  if (x <= 1) return 1;
  else if (x >= 10) return 0.2;
  else return CLASS_COUNT_SCORES[x - 1];
}

// Containers classes there aren't wildly used is prefered
TextContainerItem.prototype._calculateClasscount = function () {
  var algoritme = this._algoritme;
  var classlist = this.node.root.classlist;

  // Calculcate a classcount score
  var max = 0, count = 0;
  for (var i = 0, l = this.node.classes.length; i < l; i++) {
    count = classlist.count(this.node.classes[i]);
    if (max < count) max = count;
  }
  var classcount = classcountScore(max);

  // Update property
  this._classcount = classcount;
  algoritme._adjustClasscount.update(classcount);
};

// Compare the amount of styled text with the total text length
// E.q. this will prevent long lists of links to be registred as a
// text container
TextContainerItem.prototype._calculateStyleratio = function () {
  var algoritme = this._algoritme;
  var noneStyledText = this.node.getNoneStyledText().trim();
  var styleratio = 1 - (this.text.length - noneStyledText.length) / this.text.length;

  // Update property
  this._styleratio = styleratio;
  algoritme._adjustStyleRatio.update(styleratio);
};

// Count the content of the 2 bigest groupes of paragraphs
TextContainerItem.prototype._calculateSentenses = function () {
  var algoritme = this._algoritme;

  // Count the amount of sentenses containing paragraphs in a row.
  var collection = [0];
  var paragraphSize = 0;
  for (var i = 0, l = this.lines.length; i < l; i++) {
    if (CONTAIN_SENTENCE.test(this.lines[i]) === false) {
      // found bad paragraph push and reset counter
      if (paragraphSize !== 0) {
        collection.push(paragraphSize);
        paragraphSize = 0;
      }
    } else {
      paragraphSize += this.lines[i].length;
    }
  }
  if (paragraphSize !== 0) collection.push(paragraphSize);

  // Find the two largest paragraph collections
  var maxes = [0, 0];
  for (var a = 0, r = collection.length; a < r; a++) {
    if (collection[a] >= maxes[1]) {
      maxes[0] = maxes[1];
      maxes[1] = collection[a];
    }
  }

  // Calculate the total text length
  var sentenses = maxes[0] + maxes[1];

  // Update property
  this._sentenses = sentenses;
  algoritme._adjustSentensesCount.update(sentenses);
};

// Simply count the amount of <p> tags
TextContainerItem.prototype._calculateParagraphs = function () {
  var algoritme = this._algoritme;
  var paragraphs = this.node.countTagname('p');

  // Update property
  this._paragraphs = paragraphs;
  algoritme._adjustParagraphCount.update(paragraphs);
};

// Use the parent density as a feature
TextContainerItem.prototype._calculateDensity = function () {
  var algoritme = this._algoritme;
  var density = this.node.density;

  // Update property
  this._density = density;
  algoritme._adjustContainerDensity.update(density);
};

// Calculate meta comparison scores
TextContainerItem.prototype.appendDistance = function (meta) {
  this._match.push(meta.calculateMatch(this));
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

TextContainerItem.prototype.calculateLikelihood = function () {
  var algoritme = this._algoritme;
  var meta = algoritme._meta;

  // Adjust the single value scores
  var count = algoritme._adjustContainerCount.adjust(this._count);
  var shortline = 1 - algoritme._adjustShortline.adjust(this._shortlines);
  var linebreaks = algoritme._adjustLinebreak.adjust(this._linebreaks);
  var classcount = algoritme._adjustClasscount.adjust(this._classcount);
  var styleratio = algoritme._adjustStyleRatio.adjust(this._styleratio);
  var sentenses = algoritme._adjustSentensesCount.adjust(this._sentenses);
  var paragraphs = algoritme._adjustParagraphCount.adjust(this._paragraphs);
  var density = algoritme._adjustContainerDensity.adjust(this._density);

  // Use the descriptions to calculate a match feature if possible
  var match = 1;
  if (meta.length > 0) {
    var total = 0, divider = 0;
    for (var i = 0, l = meta.length; i < l; i++) {
      total += meta[i]._match.appearAdjust(meta[i].appear, this._match[i]);
      divider += meta[i].appear;
    }
    match = total / divider;
  }

  // Calculate the likelihood
  var scores = [
    count, shortline, linebreaks, classcount, styleratio,
    sentenses, paragraphs, density, match
  ];
  var likelihood = mathHelpers.distance(scores);
  var minimum = Math.min.apply(Math, scores);

  // Some containers may win on adjused features like (1,0) under the right
  // conditions. The goal of this transformation of likelihood is to make
  // those elements unlikly, however not to the point where removing them
  // would be the same.
  // SEE: 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3be15fbf3161d
  this.likelihood = adjustLiklihood(minimum) * likelihood;
};
