
var mathHelpers = require('../helpers-math.js');

function Fase2Algortime(main) {
  this._main = main;

  this._titles = [];
  this._texts = [];
  this._images = [];
}
module.exports = Fase2Algortime;

function adjustLikelihood(list) {
  var adjust = new mathHelpers.RangeObject();

  for (var i = 0, l = list.length; i < l; i++) {
    adjust.update(list[i].likelihood);
  }

  for (var c = 0, r = list.length; c < r; c++) {
    list[c].likelihood = mathHelpers.adjusedValue(list[c].likelihood, adjust);
  }

  return list;
}

// Update the internal titles, texts and images collections,
//  by getting the 10 best sugestions and then calculate a
//  new adjusted the likelihood properties ranging from 1 to 0
Fase2Algortime.prototype.update = function () {
  this._titles = adjustLikelihood( this._main._fase1title.result().slice(0, 10) );
  this._texts = adjustLikelihood( this._main._fase1text.result().slice(0, 10) );
  this._images = adjustLikelihood( this._main._fase1image.result().slice(0, 10) );
};

Fase2Algortime.prototype.combine = function () {
  
};

Fase2Algortime.prototype.clean = function () {
  
};

// Return the final result
Fase2Algortime.prototype.result = function () {
  return {
    title: this._titles[0].text,
    text: this._texts[0].text,
    image: this._images[0].href
  };
};
