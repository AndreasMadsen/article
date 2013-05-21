
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
  this._adjustLevel = [Infinity, -Infinity];
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
    this._adjustLevenshtein.push([Infinity, -Infinity]);
    this._adjustWorddiff.push([Infinity, -Infinity]);
  } else {
    // The text already exists, just incease the appear counter
    this._metaAppear[index] += 1;
  }
};

// Mutates the history array, if the new values goes beyond the min or max
function mutateHistory(history, value) {
  // if value is less than min history
  if (history[0] > value) {
    history[0] = value;
  }

  // if value is higher than max histroy
  if (history[1] < value) {
    history[1] = value;
  }
}

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
    mutateHistory(this._adjustLevenshtein[i], levenshteinResult);

    // calculate unorder word diff
    var worddiffResult = worddiff(text, this._metaText[i]);
    distance.worddiff.push(worddiffResult);
    mutateHistory(this._adjustWorddiff[i], worddiffResult);
  }

  // Find the heading level
  var level = Number(node.tagname.slice(1));
  mutateHistory(this._adjustLevel, level);
  
  // Ignore this header if it is empty
  var ignore = text === '';

  this._headers.push({
    'distance': distance,
    'level': level,
    'likelihood': 0,
    'ignore': ignore,
    'text': text,
    'node': node
  });
};

TitleAlgoritme.prototype._calculateLikehood = function (header) {

  // Calculate the likelihood for each feature
  var levenshtein = mathHelpers.adjustedSum(
    header.distance.levenshtein, this._adjustLevenshtein, this._metaAppear
  );

  var worddiff = mathHelpers.adjustedSum(
    header.distance.worddiff, this._adjustWorddiff, this._metaAppear
  );
  
  var level = mathHelpers.adjusedValue(
    header.level, this._adjustLevel
  );
  
  // Then calculate the avg. likelihood
  header.likelihood = (levenshtein + worddiff + level) / 3;
};

// The end of the document is reached
TitleAlgoritme.prototype.end = function () {
  // Set the likelihood property on each header
  this._headers.forEach(this._calculateLikehood.bind(this));
};

// It is time to return the best result
TitleAlgoritme.prototype.result = function () {
  var header = null;
  var likelihood = 0;
  for (var i = 0, l = this._headers.length; i < l; i++) {
    // Best likelihood wins, but futher down on the page is also good
    if (this._headers[i].ignore === false && this._headers[i].likelihood >= likelihood) {
      likelihood = this._headers[i].likelihood;
      header = this._headers[i];
    }
  }

  return header === null ? null : header.text;
};
