
var domHelpers = require('../helpers-dom.js');

function Pair(algortime, title, text) {
  this._algortime = algortime;
  this.title = title;
  this.text = text;

  this.likelihood = 0;

  this._distance = 0;
  this._position = 0;

  this._calculateDistance();
  this._calculatePosition();
}
module.exports = Pair;

Pair.prototype._calculateDistance = function () {
  var algortime = this._algortime;
  var distance = domHelpers.treeDistance(this.title.node, this.text.node);

  algortime._adjustDistance.update(distance);
  this._distance = distance;
};

// If the title is with in the first 25% of the text then thats perfect,
// otherwise do a linear scale down to zero.
function titlePositionScore(position, length) {
  if (position < length * 0.25) return 1;
  else return 1 - ((position - length * 0.25) / length * 0.75);
}

Pair.prototype._calculatePosition = function () {
  var text = this.text.text;
  var title = this.title.text;

  var titlePosition = text.indexOf(title);
  if (titlePosition === -1) {
    this._position = 1;
  } else {
    this._position = titlePositionScore(titlePosition, text.length);
  }
};

Pair.prototype.calculateLikelihood = function () {
  var algortime = this._algortime;

  var distance = 1 - algortime._adjustDistance.adjust(this._distance);
  var position = this._position;
  var title = this.title.likelihood;
  var text = this.text.likelihood;

  this.likelihood = (title + text + distance + position) / 4;
};
