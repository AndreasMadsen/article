
var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');

var Pair = require('./pair.js');
var Hardcode = require('./hardcode.js');
var Subtree = require('./subtree.js');
var CommonalityElement = require('./commonality-element.js');
var CommonalityAncestor = require('./commonality-ancestor.js');

var SOME_ALPHABETIC = /[A-Z]/i;

function Fase2Algortime(main) {
  this._main = main;

  this._titles = [];
  this._texts = [];
  this._images = [];

  this._pairs = [];

  this._reducedTitleObject = null;
  this._reducedTextObject = null;
  this._reducedImageObject = null;

  this._calculatedTitle = null;

  this._adjustDistance = new mathHelpers.RangeObject();
}
module.exports = Fase2Algortime;

function adjustLikelihood(list) {
  var range = new mathHelpers.RangeObject();

  if (list.length !== 0) {
    range.update(list[0].likelihood);
    range.update(list[list.length - 1].likelihood);
  }

  for (var c = 0, r = list.length; c < r; c++) {
    list[c].likelihood = range.adjust(list[c].likelihood);
  }

  return list;
}

// Update the internal titles, texts and images collections,
//  by getting the some of the best sugestions and then calculate a
//  new adjusted the likelihood properties ranging from 1 to 0
Fase2Algortime.prototype.update = function () {
  // Usually titles are perfect or wrong, so use only the very best sugestions
  this._titles = adjustLikelihood( this._main._fase1title.result() ).slice(0, 3);

  // Multiply text containers can contain the same correct text with some added
  // noice, but can also be a completly diffrent container. The amount of
  // good sugestions should allow multiply good containers, but make it difficult
  // to get a wrong container there matches the title.
  this._texts = adjustLikelihood( this._main._fase1text.result() );

  // All images can be used, they will later be reduced and adjused from the
  // (title, text) combination
  this._images = adjustLikelihood( this._main._fase1image.result() );
};

// Figure what the best combination of title and text is. Its important to
// understand that this involves looking at both title and text since there
// are features such as closeness there can only be incorporated by creating
// (title, text) pairs.
Fase2Algortime.prototype.combine = function () {
  for (var i = 0, l = this._titles.length; i < l; i++) {
    for (var n = 0, r = this._texts.length; n < r; n++) {
      if (this._texts[n].node === this._titles[i].node) continue;

      var textend = domHelpers.positionRange(this._texts[n].node)[1];
      if (this._titles[i].node.identifyer > textend) continue;

      this._pairs.push(new Pair(this, this._titles[i], this._texts[n]));
    }
  }

  // Calculate likelihood
  for (var j = 0, t = this._pairs.length; j < t; j++) {
    this._pairs[j].calculateLikelihood();
  }

  // Sort pairs
  this._pairs = this._pairs.sort(function (a, b) {
    return b.likelihood - a.likelihood;
  });
};

//
// Naive approach to remove some very wrong images
//
Fase2Algortime.prototype._reduceImage = function () {
  var bestpair = this._pairs[0];
  var parent = domHelpers.commonParent(bestpair.title.node, bestpair.text.node);

  var images = this._images.filter(function (item) {
    for (var i = 0, l = item.from.length; i < l; i++) {
      if (item.from[i].type === 'meta:og') {
        return true;
      }

      else if (item.from[i].type === 'img' || item.from[i].type === 'media') {
        if (domHelpers.containerOf(parent, item.from[i].node)) {
          return true;
        }
      }
    }

    return false;
  });

  this._reducedImageObject = images[0];
};

//
// The title can't really be reduced
//
Fase2Algortime.prototype._reduceTitle = function () {
  this._reducedTitleObject = this._pairs[0].title.node;
};

Fase2Algortime.prototype._reduceText = function () {
  this._reducedTextObject = this._pairs[0].text.node;

  var elementAnalyser = new CommonalityElement(this._reducedTextObject);
  var ancestorAnalyser = new CommonalityAncestor(this._reducedTextObject);
  var tree = new Subtree(this._reducedTextObject);
  var hardcode = new Hardcode(this._reducedTextObject);

  // Remove all not even sugested images
  var legalImages = {};
  this._images.forEach(function (node) {
    legalImages[node.href] = true;
  });
  tree.findImages().forEach(function (node) {
    if (node.tagname === 'img' && legalImages.hasOwnProperty(node.attr.src) === false) {
      node.remove();
    }
  });

  // Now cleanup the subtree
  // This will also inline some text nodes with other text nodes
  tree.reduceTree();

  // Remove all textnodes there contains only none alphabetic charecters
  tree.findTextNodes().forEach(function (node) {
    if (SOME_ALPHABETIC.test(node.getText()) === false) {
      node.remove();
    }
  });

  // Reduce the tree using hardcoded features
  hardcode.reduce();

  // Reduce the subtree again
  tree.reduceTree();

  // Reduce subtree by analysing the commonality
  // between (tagname, classnames) and the container density
  var ratio = [0.20, 0.35, 0.60];
  for (var i = 0, l = ratio.length; i < l; i++) {
    elementAnalyser.collect(tree.containerNodes());
    elementAnalyser.reduce(ratio[i]);
    tree.reduceTree();
  }

  // Reduce subtree by analysing the commonality between
  // (parent-pattern, children-pattern) and the container density
  // Compared to the element-analyser this algortime is designed to remove
  // small containers, therefor it has a lower ratio
  var ratio = [0.20, 0.35];
  for (var i = 0, l = ratio.length; i < l; i++) {
    ancestorAnalyser.collect(tree.containerNodes());
    ancestorAnalyser.reduce(ratio[i]);
    tree.reduceTree();
  }

  // Try to remove some small containers using the element-analyser
  elementAnalyser.collect(tree.containerNodes());
  elementAnalyser.reduce(0.20);
  tree.reduceTree();
};

Fase2Algortime.prototype.reduce = function () {
  this._reduceImage();
  this._reduceTitle();

  // The reduce text mutates the DOM in such a way that the title text might
  // be removed. Save it now so we don't have to care about it.
  this._calculatedTitle = this._reducedTitleObject.getText().trim();

  this._reduceText();
};

// Return the final result
Fase2Algortime.prototype.result = function () {
  return {
    title: this._calculatedTitle,
    text: this._reducedTextObject.getText().trim(),
    image: this._reducedImageObject ? this._reducedImageObject.href : null
  };
};
