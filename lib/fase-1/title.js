
var fusspos = require('fusspos');
var worddiff = require('worddiff');
var editdistance = require('editdistance');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var WORD_SPLIT = /\s+/;
var CONTAINS_WORDS = /(\w)(\s+)(\w)/;

function TitleAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaAppear = [];
  this._metaText = [];
  this._metaTextArray = [];
  this._metaLevenshtein = [];

  // Contains <h_> and zero children tags
  this._headers = [];

  // Each feature is adjusted by its [min, max] relative to the meta text
  this._adjustLevenshtein = [];
  this._adjustWorddiff = [];
  this._adjustFussy = [];

  // The header level feature is adjused to the highest and lowest level in the
  // document
  this._adjustLevel = new mathHelpers.RangeObject();
  this._adjustWordscore = new mathHelpers.RangeObject();
}
module.exports = TitleAlgoritme;

var metaHeadling = domHelpers.buildAttributeMatcher({
  property: ['rnews:headline', 'og:title', 'twitter:title'],
  name: ['title', 'hdl', 'hdl_p', 'twitter:title'],
  itemprop: ['alternativeHeadline', 'headline']
});

TitleAlgoritme.prototype.element = function (node) {
  // Grap the <title> tag, it might usually contains some valuable information.
  if (node.tagname === 'title') {
    this._handleMeta(node.getText().trim());
  }
  // Grap the <meta> tags, there may contain some valuable information.
  else if (node.tagname === 'meta' && metaHeadling(node.attr) && node.attr.content) {
    this._handleMeta(domHelpers.normalizeString(node.attr.content));
  }
  // Grap actual headers, meaning <h_> tags
  else if ((domHelpers.HEADERS.hasOwnProperty(node.tagname) || node.tags === 1) &&
            node.density !== 0) {
    this._handleHeader(node);
 }
};

TitleAlgoritme.prototype._handleMeta = function (text) {
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
    this._metaLevenshtein.push(editdistance(text));
    this._metaAppear.push(1);

    // prepear adjusted feature arrays to be maintaned when the <h_> tags
    // are handled
    this._adjustLevenshtein.push(new mathHelpers.RangeObject());
    this._adjustWorddiff.push(new mathHelpers.RangeObject());
    this._adjustFussy.push(new mathHelpers.RangeObject());

    // Calculate the extra distance values on all currently known headers
    var metaIndex = this._metaText.length - 1;
    for (var i = 0, l = this._headers.length; i < l; i++) {
      this._appendDistance(this._headers[i], metaIndex);
    }
  } else {
    // The text already exists, just incease the appear counter
    this._metaAppear[index] += 1;
  }
};

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

TitleAlgoritme.prototype._handleHeader = function (node) {
  // Get and parse the text string
  var text = node.getText().trim();

  // Ignore this header if it contains no real words or is very long
  var ignore = !CONTAINS_WORDS.test(text) || text.length >= 200;
  if (ignore) return;

  // Create a word array
  var words = text.split(WORD_SPLIT);

  // Find the heading level
  var level = 0.5;
  if (domHelpers.HEADERS.hasOwnProperty(node.tagname)) {
    level = headerScore(Number(node.tagname.slice(1)));
  }
  this._adjustLevel.update(level);

  // Punish headers there has very few words
  var wordscore = wordcountScore(words.length);
  this._adjustWordscore.update(wordscore);

  var header = {
    'distance': {
      'levenshtein': [],
      'worddiff': [],
      'fussy': []
    },
    'level': level,
    'wordscore': wordscore,
    'likelihood': 0,
    'text': text,
    'words': text.split(WORD_SPLIT),
    'node': node
  };

  this._headers.push(header);

  // Append to the distance object
  for (var i = 0, l = this._metaText.length; i < l; i++) {
    this._appendDistance(header, i);
  }
};

// Calculate a new distance set, from a meta value
TitleAlgoritme.prototype._appendDistance = function (header, metaIndex) {
  var distance = header.distance;
  var text = header.text;
  var words = header.words;

  // calculate levenshtein distance
  var levenshteinResult = this._metaLevenshtein[metaIndex].distance(text);
  distance.levenshtein.push(levenshteinResult);
  this._adjustLevenshtein[metaIndex].update(levenshteinResult);

  // calculate unorder word diff
  var worddiffResult = worddiff(words, this._metaTextArray[metaIndex]);
  distance.worddiff.push(worddiffResult);
  this._adjustWorddiff[metaIndex].update(worddiffResult);

  // calculate fuzziness score
  var fussyResult = fusspos(words, this._metaTextArray[metaIndex]).fussy;
  distance.fussy.push(fussyResult);
  this._adjustFussy[metaIndex].update(fussyResult);
};


TitleAlgoritme.prototype._calculateLikehood = function (header) {
  // The math helpers expects high values to be (likely) but in this
  // case lower values are actaully the best, so 1 - likelihood transforms
  // it intro 1 (likely), 0 (unlikly)

  // Calculate the likelihood for each feature
  var levenshtein = 1 - mathHelpers.adjustedSum(
    header.distance.levenshtein, this._adjustLevenshtein, this._metaAppear
  );

  var worddiff = 1 - mathHelpers.adjustedSum(
    header.distance.worddiff, this._adjustWorddiff, this._metaAppear
  );

  var fussy = 1 - mathHelpers.adjustedSum(
    header.distance.fussy, this._adjustFussy, this._metaAppear
  );

  var wordscore = mathHelpers.adjusedValue(
    header.wordscore, this._adjustWordscore
  );

  var level = mathHelpers.adjusedValue(
    header.level, this._adjustLevel
  );

  header.level = level;
  header.levenshtein = levenshtein;
  header.worddiff = worddiff;
  header.fussy = fussy;
  header.wordscore = wordscore;

  // Then calculate the avg. likelihood
  header.likelihood = (levenshtein + worddiff + level + fussy + wordscore) / 5;

  return header;
};

// The end of the document is reached
TitleAlgoritme.prototype.end = function () {
  this._headers = this._headers
    // Set the likelihood property on each header
    .map(this._calculateLikehood.bind(this))

    // Best likelihood wins, but futher down on the page is also good
    .sort(function (a, b) {
      var likelihood = b.likelihood - a.likelihood;
      if (likelihood !== 0) return likelihood;
      return b.node.position - a.node.position;
    });
};

TitleAlgoritme.prototype.result = function () {
  return this._headers;
};
