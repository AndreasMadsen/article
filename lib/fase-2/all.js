
function Fase2Algortime(main) {
  this._main = main;

  this._titles = [];
  this._texts = [];
  this._images = [];
}
module.exports = Fase2Algortime;

// Update the internal titles, texts and images collections
Fase2Algortime.prototype.update = function () {
  this._titles = this._main._fase1title.result();
  this._texts = this._main._fase1text.result();
  this._images = this._main._fase1image.result();
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
