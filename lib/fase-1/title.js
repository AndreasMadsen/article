
var worddiff = require('worddiff');
var levenshtein = require('levenshtein-component');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function TitleAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the amount of times it has appeared
  this._metaAppear = [];
  this._metaText = [];

  // Contains <h_> tags
  this._headers = [];
  
  // Each feature is adjusted by its [min, max] relative to the meta text
  this._adjustLevenshtein = [];
  this._adjustWorddiff = [];

  // The header level feature is adjused to the highest and lowest level in the
  // document
  this._adjustLevel = new mathHelpers.RangeObject();
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
    this._handleMeta(domHelpers.getRawText(node));
  }
  // Grap the <meta> tags, there may contain some valuable information.
  else if (node.tagname === 'meta' && metaHeadling(node.attr)) {
    this._handleMeta(domHelpers.normalizeString(node.attr.content));
  }
  // Grap actual headers, meaning <h_> tags
  else if (node.tagname === 'h1' || node.tagname === 'h2' ||
           node.tagname === 'h3' || node.tagname === 'h4' ||
           node.tagname === 'h5' || node.tagname === 'h6') {
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
    this._metaAppear.push(1);

    // prepear adjusted feature arrays to be maintaned when the <h_> tags
    // are handled
    this._adjustLevenshtein.push(new mathHelpers.RangeObject());
    this._adjustWorddiff.push(new mathHelpers.RangeObject());
  } else {
    // The text already exists, just incease the appear counter
    this._metaAppear[index] += 1;
  }
};

TitleAlgoritme.prototype._handleHeader = function (node) {
  // Get and parse the text string
  var text = domHelpers.getRawText(node).trim();

  var distance = {
    levenshtein: [],
    worddiff: []
  };

  for (var i = 0, l = this._metaText.length; i < l; i++) {
    // calculate levenshtein distance
    var levenshteinResult = levenshtein(text, this._metaText[i]);
    distance.levenshtein.push(levenshteinResult);
    this._adjustLevenshtein[i].update(levenshteinResult);

    // calculate unorder word diff
    var worddiffResult = worddiff(text, this._metaText[i]);
    distance.worddiff.push(worddiffResult);
    this._adjustWorddiff[i].update(worddiffResult);
  }

  // Find the heading level
  var level = Number(node.tagname.slice(1));
  this._adjustLevel.update(level);
  
  // Ignore this header if it is empty
  var ignore = text === '';
  if (ignore) return;

  this._headers.push({
    'distance': distance,
    'level': level,
    'likelihood': 0,
    'text': text,
    'node': node
  });
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

  var level = 1 - mathHelpers.adjusedValue(
    header.level, this._adjustLevel
  );

  // Then calculate the avg. likelihood
  header.likelihood = (levenshtein + worddiff + level) / 3;
  
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
 
// It is time to return the best result
TitleAlgoritme.prototype.result = function () {
  return this._headers.length === 0 ? null : this._headers[0].text;
};