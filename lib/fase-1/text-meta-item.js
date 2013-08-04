
var fusspos = require('fusspos');

var mathHelpers = require('../helpers-math.js');

var WORD_SPLIT = /\s+/;

function TextMetaItem(text) {
  this.appear = 1;

  this.text = text;
  this.words = text.split(WORD_SPLIT);

  this._match = new mathHelpers.RangeObject();
}
module.exports = TextMetaItem;

TextMetaItem.prototype.increaseAppear = function () {
  this.appear += 1;
};

TextMetaItem.prototype.calculateMatch = function (item) {
  var search = fusspos(this.words, item.words);

  // Calculate the probability for the description
  var probability = 0;
  if (Number.isNaN(search.middle) === false) {
    probability = ((item.words.length - search.start) / item.words.length) * (1 - search.fussy);
  }

  // Update range object
  this._match.update(probability);
  return probability;
};
