
var url = require('url');
var path = require('path');

var mathHelpers = require('../helpers-math.js');
var domHelpers = require('../helpers-dom.js');

var GOOD_IMAGE = /jumbo|large/i;
var USELESS_IMAGE = /icon|logo|avatar|small|banner|promo|author|placeholder|button|track|null/i;
var WIDTH_TIMES_HEIGHT = /[^0-9](0|[1-9][0-9]*)(?:x|\*)(0|[1-9][0-9]*)/g;
var PREFIX_WIDTH = /w([1-9][0-9]*)/;

function ImageItem(algoritme, href) {
  this._algoritme = algoritme;

  this.from = [];
  this.href = href;
  this.likelihood = 0;

  this._count = {
    'body': 0,
    'meta': 0
  };

  this._types = {
    'meta:og' : 0,
    'meta:twitter': 0,
    'img': 0,
    'media': 0
  };

  this._parsed = url.parse(href, true);
  this._extname = path.extname(this._parsed.pathname).toLowerCase() || null;

  // Set some properies by analysing the url
  this.useless = this._uselessFromUrl();
  this._size = this._sizeFromUrl();
}
module.exports = ImageItem;

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

ImageItem.prototype._uselessFromUrl = function () {
  return USELESS_IMAGE.test(this.href) ||
         this._extname === '.gif' ||
         this._extname === '.svg' ||
         this._parsed.pathname === '/' ||
         BLACKLIST.hasOwnProperty(this._parsed.hostname.toLowerCase());
};

ImageItem.prototype._sizeFromUrl = function () {
  var match;

  var href = this.href;
  var query = this._parsed.query;

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
  else if (query.w && query.h) return new mathHelpers.ImageSize(query.w, query.h);
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
  if (match && match[1].length > 1 && match[1].length < 5) {
    return new mathHelpers.ImageSize(match[1], null);
  }

  return new mathHelpers.ImageSize(null, null);
};

function checkDisplayNone(node) {
  return domHelpers.styleParser(node.attr.style).display === 'none';
}

function createTokenString(node) {
  return node.type === 'element' ? (node.attr.id || '') + ' ' + (node.attr['class'] || '') : '';
}

ImageItem.prototype.addNode = function (type, node) {
  this._types[type] += 1;

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
      this.useless = (checkDisplayNone(node) ||
                      checkDisplayNone(parent) ||
                      checkDisplayNone(pparent));
    }
  }

  this.from.push({
    'type': type,
    'node': node
  });
};

ImageItem.prototype.setSize = function (size) {
  if (this._size.area === null || this._size.area < size.area) {
    this._size = size;
  }
};


// Likelihood scores for body count
var BODY_COUNT = [0.85, 1, 0.7, 0.6, 0.3, 0.2, 0.1];
function bodyCountScore(count) {
  if (count > 6) return 0.1;
  else return BODY_COUNT[count];
}

var MIN_SIZE = 120*120;

ImageItem.prototype.done = function () {
  var algoritme = this._algoritme;
  var size = this._size;

  // something shouldn't be punished just because it is a media with a fallback image
  this._count.body = bodyCountScore(this._types.media || this._types.img);
  algoritme._adjustBodyCount.update(this._count.body);

  // The meta count is just a sum
  this._count.meta = this._types['meta:og'] + this._types['meta:twitter'];
  algoritme._adjustMetaCount.update(this._count.meta);

  // NOTE: Some images will be later be ignored, however they still contain
  // valuables information in terms of the adjusted ranges
  if (size.area !== null) algoritme._adjustSize.update(size.area);

  // If the image wasn't already useless consider the size now
  if (this.useless === false) {
    this.useless = (size.area   !== null && size.area   < MIN_SIZE) ||
                   (size.width  !== null && size.width  < 100)      ||
                   (size.height !== null && size.height < 100);
  }
};

ImageItem.prototype.calculateLikelihood = function () {
  var algoritme = this._algoritme;
  var size = this._size;

  var areasize;
  if (size.area !== null) {
    areasize = algoritme._adjustSize.adjust(size.area);
  } else {
    areasize = (this._types['meta:og'] > 0) ? 0.75 : 0.50;
    if (GOOD_IMAGE.test(this.href)) areasize = areasize * 1.4;
  }

  var bannerratio = 1 - this._size.banner;

  var bodycount = algoritme._adjustBodyCount.adjust(this._count.body);
  var metacount = algoritme._adjustMetaCount.adjust(this._count.meta);

  this.likelihood = (areasize * 2 + bodycount + metacount + bannerratio) / 5;
};