
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

var metaDescription = domHelpers.buildAttributeMatcher({
  property: ['rnews:description', 'og:description', 'twitter:description'],
  name: ['description', 'lp'],
  itemprop: ['description']
});
