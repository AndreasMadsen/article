
var url = require('url');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function ImageAlgoritme(main) {
  this._images = {};
  this._knownKeys = [];
  this._sugestionKeys = [];

  this._twitter = {
    card: null,
    node: null
  };

  this._base = main._source;
}
module.exports = ImageAlgoritme;

var metaImage = domHelpers.buildAttributeMatcher({
  property: ['og:image']
});

var metaTwitter = domHelpers.buildAttributeMatcher({
  name: ['twitter:image', 'twitter:card']
});

ImageAlgoritme.prototype.element = function (node) {
  // Grap the <meta> tags, a link is a link so meta urls are good sugestions
  if (node.tagname === 'meta' && metaImage(node.attr) && node.attr.content) {
    this._handleMetaImage(node);
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

//
// ImageCollection
//  Object container for mutiltiply nodes
//
function ImageCollection(href, known) {
  this.href = href;
  this.size = { width: null, height: null };
  this.from = [];
  this.known = known;
}

ImageCollection.prototype.addFrom = function (type, node) {
  this.from.push({
    'type': type,
    'node': node
  });
};

ImageCollection.prototype.setSize = function (size) {
  if (size && size.width && size.width > this.size.width) {
    this.size.width = size.width;
  }
  if (size && size.height && size.height > this.size.height) {
    this.size.height = size.height;
  }
};

ImageAlgoritme.prototype._appendImage = function (href, size, type, node, known) {
  var collection;

  // Resolve relative hrefs
  if (href.slice(0, 7) !== 'http://' && href.slice(0, 8) !== 'https://') {
    href = url.resolve(this._base, href);
  }

  if (this._images.hasOwnProperty(href) === false) {
    collection = this._images[href] = new ImageCollection(href, known);
    this._knownKeys.push(href);
  }

  else {
    collection = this._images[href];

    // If the image has becomed known good then move the key
    if (known === true && collection.known === false) {
      var index = this._sugestionKeys.indexOf(href);
      if (index !== -1) {
        this._sugestionKeys.splice(index, 1);
        this._knownKeys.push(href);
      }
    }
  }

  collection.setSize(size);
  collection.addFrom(type, node);
};

//
// Node handlers
//
ImageAlgoritme.prototype._handleMetaImage = function (meta) {
  var href = meta.attr.content;

  if (meta.attr.property === 'og:image') {
    this._appendImage(href, null, 'meta:og', meta, true);
  }
};

// TODO: support twitter:image:width and twitter:image:height
// NOTE: these are just realistic estimates on the size
var TWITTER_SIZE = {
  'summary': { width: 120, height: 120 },
  'summary_large_image': { width: 280, height: 150 },
  'photo': { width: 280, height: 150 },
  'player': { width: 350, height: 196 },
  'product': { width: 160, height: 160 }
};

ImageAlgoritme.prototype._handleTwitter = function (meta) {
  // map value attribute to content attribute
  if (meta.attr.value) meta.attr.content = meta.attr.value;

  if (meta.attr.name === 'twitter:image') {
    this._twitter.node = meta;
  } else if (meta.attr.name === 'twitter:card') {
    this._twitter.card = meta.attr.content;
  }

  if (this._twitter.node && this._twitter.card) {
    this._appendImage(
      this._twitter.node.attr.content,
      TWITTER_SIZE[this._twitter.card],
      'meta:twitter',
      meta,
      true
    );
  }
};

ImageAlgoritme.prototype._handleImage = function (img) {
  var style = domHelpers.styleParser(img.attr.style);
  var size = {
    width: parseInt(img.attr.width || style.width, 10) || null,
    height: parseInt(img.attr.height || style.height, 10) || null
  };
  this._appendImage(img.attr.src, size, 'img', img, false);
};

ImageAlgoritme.prototype._handleObject = function (node) {
  // Create param map
  var params = {};
  for (var i = 0, l = node.children.length; i < l; i++) {
    if (node.children[i].tagname === 'param') {
      params[node.children[i].attr.name] = node.children[i].attr.value;
    }
  }
  
  var size = {
    width: parseInt(params.width, 10) || null,
    height: parseInt(params.height, 10) || null
  };

  if (params.hasOwnProperty('holdingImage')) {
    this._appendImage(params.holdingImage, size, 'object', node, false);
  }
};

// The end of the document is reached
ImageAlgoritme.prototype.end = function () {
  
};
 
// It is time to return the best result
ImageAlgoritme.prototype.result = function () {
  console.log(require('util').inspect(this._images, {
    colors: true,
    depth: 3
  }));

  var keys = Object.keys(this._images);
  return keys.length !== 0 ? url.resolve(this._base, keys[0]) : null;
};
