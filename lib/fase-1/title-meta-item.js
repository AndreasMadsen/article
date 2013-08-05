
var fusspos = require('fusspos');
var worddiff = require('worddiff');
var editdistance = require('editdistance');

var mathHelpers = require('../helpers-math.js');

var WORD_SPLIT = /\s+/;

function TitleMetaItem(text) {
  this.appear = 1;

  this.text = text;
  this.words = text.split(WORD_SPLIT);
  this._editdistance = editdistance(text);

  this._levenshtein = new mathHelpers.RangeObject();
  this._worddiff = new mathHelpers.RangeObject();
  this._fussy = new mathHelpers.RangeObject();
}
module.exports = TitleMetaItem;

TitleMetaItem.prototype.increaseAppear = function () {
  this.appear += 1;
};

TitleMetaItem.prototype.calculateLevenshtein = function (item) {
  var distance = this._editdistance.distance(item.text);
  this._levenshtein.update(distance);
  return distance;
};

TitleMetaItem.prototype.calculateWorddiff = function (item) {
  var distance = worddiff(item.words, this.words);
  this._worddiff.update(distance);
  return distance;
};

TitleMetaItem.prototype.calculateFussy = function (item) {
  var distance = fusspos(item.words, this.words).fussy;
  this._fussy.update(distance);
  return distance;
};
