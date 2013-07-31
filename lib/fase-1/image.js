
var url = require('url');
var path = require('path');

var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

function ImageAlgoritme(main) {
  this._imageMap = {};
  this._allKeys = [];

  this._images = [];

  this._twitter = {
    card: null,
    node: null
  };

  this._base = main._source;

  this._adjustSize = new mathHelpers.RangeObject();
  this._adjustMetaCount = new mathHelpers.RangeObject();
  this._adjustBodyCount = new mathHelpers.RangeObject();
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

// Keywords indicating that this image is completly useless
var USELESS_IMAGE = /icon|logo|avatar|small|banner|promo|author|placeholder|button|track|null/i;

function ImageCollection(href) {
  this.href = href;
  this.parsed = url.parse(href, true);
  this.size = new mathHelpers.ImageSize(null, null);
  this.from = [];
  this.extname = path.extname(this.parsed.pathname).toLowerCase() || null;
  this.useless = USELESS_IMAGE.test(href);

  this.scores = {
    'bodycount': 0,
    'metacount': 0
  };

  this.likelihood = 0;

  this.types = {
    'meta:og' : 0,
    'meta:twitter': 0,
    'img': 0,
    'media': 0
  };
}

// Likelihood scores for body count
var BODY_COUNT = [0.85, 1, 0.7, 0.6, 0.3, 0.2, 0.1];
function bodyCountScore(count) {
  if (count > 6) return 0.1;
  else return BODY_COUNT[count];
}

ImageCollection.prototype.calculateScore = function () {
  // NOTE: something shouldn't be punished just because it is a media with a
  // fallback image
  this.scores.bodycount = bodyCountScore(
    this.types.media || this.types.img
  );

  this.scores.metacount = this.types['meta:og'] + this.types['meta:twitter'];
};

function checkDisplayNone(node) {
  return (node.type === 'element' && node.attr.hasOwnProperty('style')) ?
    domHelpers.styleParser(node.attr.style).display === 'none' : false;
}

function createTokenString(node) {
  return node.type === 'element' ? (node.attr.id || '') + ' ' + (node.attr['class'] || '') : '';
}

ImageCollection.prototype.addNode = function (type, node) {
  this.types[type] += 1;

  // Check the id and class attributes for bad tokens
  if (type === 'img' || type === 'media') {
    var parent = node.parent;
    var pparent = node.parent.parent;
    if (this.useless === false) {
      var tokens = '';
      tokens += createTokenString(node);
      tokens += createTokenString(parent);
      tokens += createTokenString(pparent);

      this.useless = USELESS_IMAGE.test(tokens);
    }

    // Check the style for display:none
    if (this.useless === false) {
      this.useless = checkDisplayNone(node) || checkDisplayNone(parent) || checkDisplayNone(pparent);
    }
  }

  this.from.push({
    'type': type,
    'node': node
  });
};

ImageCollection.prototype.setSize = function (size) {
  if (this.size.area === null || this.size.area < size.area) {
    this.size = size;
  }
};

var WIDTH_TIMES_HEIGHT = /[^0-9](0|[1-9][0-9]*)(?:x|\*)(0|[1-9][0-9]*)/g;
var PREFIX_WIDTH = /w([1-9][0-9]*)/;
ImageAlgoritme.prototype._sizeFromUrl = function (href, parsed) {
  var match;

  // Look for urls like:
  // ACTUAL: http://example.test/cat/100x200.jpg
  // ACTUAL: http://example.test/cat/100*200.jpg
  // ESTIMATE: http://example.test/cat/100x0.jpg
  // ESTIMATE: http://example.test/cat/100*0.jpg
  // IGNORE: http://example.test/cat/16x9.jpg
  // If more than one [w]x[w] exists use the one with the smallest area
  var wxh = null, area = Infinity, temp = null;
  while (match = WIDTH_TIMES_HEIGHT.exec(href)) {
    if (match[1] === '16' && match[2] === '9') continue;

    temp = new mathHelpers.ImageSize(match[1], match[2]);
    if (temp.area !== null && temp.area < area &&
        temp.width <= 2024 && temp.height < 2024) {
      area = temp.area;
      wxh = temp;
    }
  }
  if (Number.isFinite(area)) return wxh;

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

  // Look for urls like:
  // ESTIMATE: http://example.test/picture_w100.jpg
  match = href.match(PREFIX_WIDTH);
  if (match && match[1].length > 1) return new mathHelpers.ImageSize(match[1], null);

  return new mathHelpers.ImageSize(null, null);
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
    collection = this._imageMap[href] = new ImageCollection(href);
    collection.setSize(this._sizeFromUrl(collection.href, collection.parsed));

    this._allKeys.push(href);
  } else {
    collection = this._imageMap[href];
  }

  if (size) collection.setSize(size);
  collection.addNode(type, node);
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
    this._appendImage(params.holdingImage, size, 'media', node, false);
  }
};

// Blacklist of domains:
//   Please ad new domains in alphabetical order.
//
// NOTE: I known there are good lists with ads domains but
// a lot of them only supports flash or woundn't appear on
// article sites. So for performance reasons this is a self
// maintained list.
//
var BLACKLIST =  {
  'a.collective-media.net': true,
  'ad-apac.doubleclick.net': true,
  'ad-incisive.grapeshot.co.uk': true,
  'ad.doubleclick.net': true,
  'ad.uk.doubleclick.net': true,
  'adserver.adtech.de': true,
  'api.twitter.com': true,
  'b.scorecardresearch.com': true,
  'graph.facebook.com': true,
  'o1.qnsr.com': true,
  'lorempixel.com': true,
  'pubads.g.doubleclick.net': true
};

// The end of the document is reached
var MIN_SIZE = 120*120;
ImageAlgoritme.prototype.end = function () {
  var imageObject;

  for (var i = 0, l = this._allKeys.length; i < l; i++) {
    imageObject = this._imageMap[ this._allKeys[i] ];

    // Update the score object
    imageObject.calculateScore();

    // Calculate the range objects there an only be determined at the end state
    // NOTE: some images will be later be ignored, however they still contain
    // valuables information in terms of the adjusted ranges
    if (imageObject.size.area !== null) this._adjustSize.update(imageObject.size.area);
    this._adjustBodyCount.update(imageObject.scores.bodycount);
    this._adjustMetaCount.update(imageObject.scores.metacount);

    // When dealing with images quite a lot can be ignored
    // * .gif .svg extname
    // * area less than 120*120 (useless anyway)
    // * a blacklisted image
    // * something matching USELESS_IMAGE
    if (imageObject.extname === '.gif' ||
        imageObject.extname === '.svg' ||
       (imageObject.size.area !== null && imageObject.size.area < MIN_SIZE) ||
       (imageObject.size.width !== null && imageObject.size.width < 100) ||
       (imageObject.size.height !== null && imageObject.size.height < 100) ||
       BLACKLIST.hasOwnProperty(imageObject.parsed.hostname.toLowerCase()) ||
       imageObject.parsed.pathname === '/' ||
       imageObject.useless === true) {
      continue;
    }

    this._images.push(imageObject);
  }

  for (var c = 0, t = this._images.length; c < t; c++) {
    imageObject = this._images[c];

    var areasize;
    if (imageObject.size.area !== null) {
      areasize = mathHelpers.adjusedValue(
        imageObject.size.area, this._adjustSize
      );
    } else {
      areasize = (imageObject.types['meta:og'] > 0) ? 0.75 : 0.50;
    }

    var bannerratio = 1 - imageObject.size.banner;

    var bodycount = mathHelpers.adjusedValue(
      imageObject.scores.bodycount, this._adjustBodyCount
    );

    var metacount = mathHelpers.adjusedValue(
        imageObject.scores.metacount, this._adjustMetaCount
    );

    imageObject.likelihood = (areasize * 2 + bodycount + metacount + bannerratio) / 5;

    //delete imageObject.parsed;
    delete imageObject.types;
    imageObject.adjusted = {
      'areasize': areasize,
      'bannerratio': bannerratio,
      'bodycount': bodycount,
      'metacount': metacount
    };
  }

  // Sort the images by the calculated likelihood
  this._images = this._images.sort(function (a, b) {
    return b.likelihood - a.likelihood;
  });
};

ImageAlgoritme.prototype.result = function () {
  return this._images;
};
