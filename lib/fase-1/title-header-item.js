
var domHelpers = require('../helpers-dom.js');

var WORD_SPLIT = /\s+/;
var CONTAINS_WORDS = /(\w)(\s+)(\w)/;

function TitleHeaderItem(algoritme, node) {
  this._algoritme = algoritme;

  this.node = node;
  this._tagname = node.tagname;

  this.text = node.getText().trim();
  this.words = [];

  this._level = 0;
  this._wordscore = 0;
  this._levenshtein = [];
  this._worddiff = [];
  this._fussy = [];

  this.likelihood = 0;

  this.ignore = this.text.length >= 200 || !CONTAINS_WORDS.test(this.text);
  if (this.ignore === false) {
    this.words = this.text.split(WORD_SPLIT);
    this._calculateScores();

    for (var i = 0, l = algoritme._meta.length; i < l; i++) {
      this.appendDistance(algoritme._meta[i]);
    }
  }
}
module.exports = TitleHeaderItem;

// Linear scale function between:
// f(6) = 0.1
// f(1) = 1
function headerScore(x) {
  return -0.18 * x + 1.18;
}

// This function is made by the following requirements:
// x > 5, y = 1
// f(x) = a*sqrt(x) + b*x^2 + c
// f(2) = 0.2
// f(5) = 1
// f'(5) = 0
function wordcountScore(x) {
  if (x > 5) return 1;
  else return Math.min(1, 2.27 * Math.sqrt(x) - 0.0507 * Math.pow(x, 2) - 2.808);
}

// Calculate the none meta comparison scores
TitleHeaderItem.prototype._calculateScores = function () {
  var algoritme = this._algoritme;

  // set level property
  this._level = 0.5;
  if (domHelpers.HEADERS.hasOwnProperty(this._tagname)) {
    this._level = headerScore(Number(this._tagname.slice(1)));
  }

  // set wordscore property
  this._wordscore = wordcountScore(this.words.length);

  // update range objects
  algoritme._adjustLevel.update(this._level);
  algoritme._adjustWordscore.update(this._wordscore);
};

// Calculate meta comparison scores
TitleHeaderItem.prototype.appendDistance = function (meta) {
  this._levenshtein.push(meta.calculateLevenshtein(this));
  this._worddiff.push(meta.calculateWorddiff(this));
  this._fussy.push(meta.calculateFussy(this));
};

  // Set the .likelihood property
TitleHeaderItem.prototype.calculateLikelihood = function () {
  var algoritme = this._algoritme;
  var meta = algoritme._meta;

  var levenshteinTotal = 0,
      worddiffTotal = 0,
      fussyTotal = 0;

  var divider = 0;
  for (var i = 0, l = meta.length; i < l; i++) {
    levenshteinTotal += meta[i]._levenshtein.appearAdjust(this._levenshtein[i], meta[i].appear);
    worddiffTotal += meta[i]._worddiff.appearAdjust(this._worddiff[i], meta[i].appear);
    fussyTotal += meta[i]._fussy.appearAdjust(this._fussy[i], meta[i].appear);

    divider += meta[i].appear;
  }

  // The adjust method expect high values to be (likely) but in this
  // case lower values are actaully the best, so 1 - likelihood transforms
  // it intro 1 (likely), 0 (unlikly)
  var levenshtein = 1 - (levenshteinTotal / divider),
      worddiff = 1 - (worddiffTotal / divider),
      fussy = 1 - (fussyTotal / divider),

  // These where created using mathematical functions there followed the
  // 1 ~ likely rule.
      wordscore = algoritme._adjustWordscore.adjust(this._wordscore),
      level = algoritme._adjustLevel.adjust(this._level);

  // Then calculate the avg. likelihood
  this.likelihood = (levenshtein + worddiff + level + fussy + wordscore) / 5;
};
