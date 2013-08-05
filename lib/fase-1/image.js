
var url = require('url');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var ImageItem = require('./image-item.js');

function ImageAlgoritme(main) {
  this._imageMap = {};

  this._images = [];

  this._twitter = {
    card: null,
    node: null,
    href: null
  };

  this._base = main._source;

  this._adjustSize = new mathHelpers.RangeObject();
  this._adjustMetaCount = new mathHelpers.RangeObject();
  this._adjustBodyCount = new mathHelpers.RangeObject();
}
module.exports = ImageAlgoritme;

var metaOpenGraph = domHelpers.buildAttributeMatcher({
  property: ['og:image']
});

var metaTwitter = domHelpers.buildAttributeMatcher({
  name: ['twitter:image', 'twitter:card']
});

ImageAlgoritme.prototype.element = function (node) {
  // Grap the <meta> tags, a link is a link so meta urls are good sugestions
  if (node.tagname === 'meta' && metaOpenGraph(node.attr) && node.attr.content) {
    this._handleOpenGraph(node);
  }
  else if (node.tagname === 'meta' && metaTwitter(node.attr)) {
    this._handleTwitter(node);
  }
  // Grap <img> tags
  else if (node.tagname === 'img' && node.attr.src) {
    this._handleImage(node);
  }
  // Grap <object> tags
  else if (node.tagname === 'object') {
    this._handleObject(node);
  }
};

ImageAlgoritme.prototype._appendImage = function (hrefSource, size, type, node) {
  var collection;

  // decode HTML entities
  var href = domHelpers.decodeEntities(domHelpers.decodeEntities(hrefSource));

  // Resolve relative hrefs
  if (href.slice(0, 7) !== 'http://' && href.slice(0, 8) !== 'https://') {
    href = url.resolve(this._base, href);
  }

  if (this._imageMap.hasOwnProperty(href) === false) {
    collection = this._imageMap[href] = new ImageItem(this, href);
  } else {
    collection = this._imageMap[href];
  }

  if (size) collection.setSize(size);
  collection.addNode(type, node);
};

//
// Node handlers
//
ImageAlgoritme.prototype._handleOpenGraph = function (meta) {
  this._appendImage(meta.attr.content, null, 'meta:og', meta, true);
};

// These are estimates on the twitter image size depending on the card type
var TWITTER_SIZE = {
  'summary': { width: 120, height: 120 },
  'summary_large_image': { width: 280, height: 150 },
  'photo': { width: 280, height: 150 },
  'player': { width: 350, height: 196 },
  'product': { width: 160, height: 160 }
};

ImageAlgoritme.prototype._handleTwitter = function (meta) {
  var content = meta.attr.hasOwnProperty('value') ?
        meta.attr.value : meta.attr.content;

  // Store meta information
  if (meta.attr.name === 'twitter:image') {
    this._twitter.node = meta;
    this._twitter.href = content;
  } else if (meta.attr.name === 'twitter:card') {
    this._twitter.card = content.toLowerCase();
  }

  // When enogth information is gained append the image
  if (this._twitter.href !== null &&
      this._twitter.card !== null &&
      TWITTER_SIZE.hasOwnProperty(this._twitter.card)) {

    var cardSize = TWITTER_SIZE[this._twitter.card];
    this._appendImage(
      this._twitter.href,
      new mathHelpers.ImageSize(cardSize.width, cardSize.height),
      'meta:twitter',
      this._twitter.node
    );
  }
};

ImageAlgoritme.prototype._handleImage = function (img) {
  var style = domHelpers.styleParser(img.attr.style);
  var size = new mathHelpers.ImageSize(
    img.attr.width || style.width,
    img.attr.height || style.height
  );

  this._appendImage(img.attr.src, size, 'img', img);
};

ImageAlgoritme.prototype._handleObject = function (node) {
  // Create param map
  var params = {};
  for (var i = 0, l = node.children.length; i < l; i++) {
    if (node.children[i].tagname === 'param') {
      params[node.children[i].attr.name] = node.children[i].attr.value;
    }
  }

  // if a holdingImage property exists then append the image
  if (params.hasOwnProperty('holdingImage')) {
    var size = new mathHelpers.ImageSize(params.width, params.height);

    this._appendImage(params.holdingImage, size, 'media', node);
  }
};

// The end of the document is reached
ImageAlgoritme.prototype.end = function () {
  var keys = Object.keys(this._imageMap);

  // Inform the image object that no more nodes can be added
  // and skip the image if it turned out to be useless
  for (var i = 0, l = keys.length; i < l; i++) {
    var imageObject = this._imageMap[keys[i]];
        imageObject.done();

    // Skip useless images
    if (imageObject.useless === false) {
      this._images.push(imageObject);
    }
  }

  // Calculcate the likelihood for each remainging image
  for (var c = 0, t = this._images.length; c < t; c++) {
    var imageObject = this._images[c];
        imageObject.calculateLikelihood();
  }

  // Sort the images by the calculated likelihood
  this._images = this._images.sort(function (a, b) {
    return b.likelihood - a.likelihood;
  });
};

ImageAlgoritme.prototype.result = function () {
  return this._images;
};
