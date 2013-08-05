
var mathHelpers = require('../helpers-math.js');
var domHelpers = require('../helpers-dom.js');

var TitleHeaderItem = require('./title-header-item.js');
var TitleMetaItem = require('./title-meta-item.js');

function TitleAlgoritme() {
  // Contains text string there have something to do with the wanted title
  // and the object representing this meta string
  this._metaText = [];
  this._meta = [];

  // Contains <h_> and zero elemment-children tags
  this._headers = [];
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
    this._handleMeta(node.getText());
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
  text = text.trim();

  // Check if this is a new string, in case of dublication there is no need
  // for calculating the distances again, just incease a weight counter
  var index = this._metaText.indexOf(text);

  if (index === -1) {
    // Not found add a new string
    this._metaText.push(text);

    // Create and store meta object
    var meta = new TitleMetaItem(text);
    this._meta.push(meta);

    // Calculate new distances
    for (var i = 0, l = this._headers.length; i < l; i++) {
      this._headers[i].appendDistance(meta);
    }
  } else {
    // The text already exists, just incease the appear counter
    this._meta[index].increaseAppear();
  }
};

TitleAlgoritme.prototype._handleHeader = function (node) {
  var header = new TitleHeaderItem(this, node);
  if (header.ignore === false) this._headers.push(header);
};

// The end of the document is reached
TitleAlgoritme.prototype.end = function () {
  // Set the likelihood property on each header
  for (var i = 0, l = this._headers.length; i < l; i++) {
    this._headers[i].calculateLikelihood();
  }

  // Best likelihood wins, but futher down on the page is also good
  this._headers = this._headers.sort(function (a, b) {
    var likelihood = b.likelihood - a.likelihood;
    if (likelihood !== 0) return likelihood;
    return b.node.identifyer - a.node.identifyer;
  });
};

TitleAlgoritme.prototype.result = function () {
  return this._headers;
};
