
var url = require('url');
var path = require('path');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function ImageAlgoritme(main) {
  this._imageMap = {};
  this._allKeys = [];
  this._knownKeys = [];
  this._sugestionKeys = [];

  this._images = [];

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
  this.parsed = url.parse(href, true);
  this.size = new mathHelpers.ImageSize(null, null);
  this.from = [];
  this.known = known;
  this.extname = path.extname(this.parsed.pathname).toLowerCase() || null;

  this.likehood = 0;
}

ImageCollection.prototype.addFrom = function (type, node) {
  this.from.push({
    'type': type,
    'node': node
  });
};

ImageCollection.prototype.setSize = function (size) {
  if (size === null) {
    console.trace('size === null');
  }
  if (this.size.area === null || this.size.area < size.area) {
    this.size = size;
  }
};

var WIDTH_TIMES_HEIGHT = /[^0-9](0|[1-9][0-9]*)(?:x|\*)(0|[1-9][0-9]*)/;

ImageAlgoritme.prototype._sizeFromUrl = function (href, parsed) {
  // Look for urls like:
  // ACTUAL: http://example.test/cat/100x200.jpg
  // ACTUAL: http://example.test/cat/100*200.jpg
  // ESTIMATE: http://example.test/cat/100x0.jpg
  // ESTIMATE: http://example.test/cat/100*0.jpg
  // IGNORE: http://example.test/cat/16x9.jpg
  var wxh = href.match(WIDTH_TIMES_HEIGHT);
  if (wxh && !(wxh[1] === '16' && wxh[2] === '9')) {
    return new mathHelpers.ImageSize(wxh[1], wxh[2]);
  }

  // Look for urls like:
  // ACTUAL: http://example.test/?w=100&h=200
  // ESTIMATE: http://example.test/?w=100
  // ESTIMATE: http://example.test/?h=200
  var query = url.parse(href, true).query;
  if (query.w && query.h) return new mathHelpers.ImageSize(query.w, query.h);
  else if (query.w) return new mathHelpers.ImageSize(query.w, null);
  else if (query.h) return new mathHelpers.ImageSize(null, query.h);

  // Look for urls like:
  // ACTUAL: http://example.test/?width=100&height=200
  // ESTIMATE: http://example.test/?width=100
  // ESTIMATE: http://example.test/?height=200
  else if (query.width && query.height) return new mathHelpers.ImageSize(query.width, query.height);
  else if (query.width) return new mathHelpers.ImageSize(query.width, null);
  else if (query.height) return new mathHelpers.ImageSize(null, query.height);

  return new mathHelpers.ImageSize(null, null);
};

ImageAlgoritme.prototype._appendImage = function (hrefSource, size, type, node, known) {
  var collection;
  
  // decode HTML entities
  var href = domHelpers.decodeEntities(hrefSource);

  // Resolve relative hrefs
  if (href.slice(0, 7) !== 'http://' && href.slice(0, 8) !== 'https://') {
    href = url.resolve(this._base, href);
  }

  if (this._imageMap.hasOwnProperty(href) === false) {
    collection = this._imageMap[href] = new ImageCollection(href, known);
    collection.setSize(this._sizeFromUrl(collection.href, collection.parsed));

    this._knownKeys.push(href);
    this._allKeys.push(href);
  } else {
    collection = this._imageMap[href];

    // If the image has becomed known good then move the key
    if (known === true && collection.known === false) {
      var index = this._sugestionKeys.indexOf(href);
      if (index !== -1) {
        this._sugestionKeys.splice(index, 1);
        this._knownKeys.push(href);
      }
    }
  }

  if (size) collection.setSize(size);
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
    var cardSize = TWITTER_SIZE[this._twitter.card.toLowerCase()];
    if (cardSize) {
      this._appendImage(
        this._twitter.node.attr.content,
        new mathHelpers.ImageSize(cardSize.width, cardSize.height),
        'meta:twitter',
        meta,
        true
      );
    }
  }
};

ImageAlgoritme.prototype._handleImage = function (img) {
  var style = domHelpers.styleParser(img.attr.style);
  var size = new mathHelpers.ImageSize(
    img.attr.width || style.width,
    img.attr.height || style.height
  );

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
  
  // Create size object
  var size = new mathHelpers.ImageSize(params.width, params.height);

  if (params.hasOwnProperty('holdingImage')) {
    this._appendImage(params.holdingImage, size, 'object', node, false);
  }
};

// Blacklist of domains:
var BLACKLIST = {
  'ad.doubleclick.net': true,
  'b.scorecardresearch.com': true,
  'o1.qnsr.com': true,
  'adserver.adtech.de': true,
  'api.twitter.com': true,
  'graph.facebook.com': true,
  'a.collective-media.net': true,
  'ad-apac.doubleclick.net': true,
  'ad.uk.doubleclick.net': true,
  'ad-incisive.grapeshot.co.uk': true
};

// The end of the document is reached
var MIN_SIZE = 120*120;
ImageAlgoritme.prototype.end = function () {
  for (var i = 0, l = this._allKeys.length; i < l; i++) {
    var imageObject = this._imageMap[ this._allKeys[i] ];

    // Ignore .gif images and images smaller than 150*150
    if (imageObject.extname === '.gif' ||
       (imageObject.size.area !== null && imageObject.size.area < MIN_SIZE) ||
       BLACKLIST.hasOwnProperty(imageObject.parsed.hostname.toLowerCase())) {
      continue;
    }

    this._images.push(imageObject);
  }

  // Sort the images by the known size
  this._images = this._images.sort(function (a, b) {
    return b.size.area - a.size.area;
  });

  console.log(require('util').inspect(this._images, {colors: true, depth: 3}));
};
 
// It is time to return the best result
ImageAlgoritme.prototype.result = function () {
  return this._images.length > 0 ? this._images[0].href : null;
};
