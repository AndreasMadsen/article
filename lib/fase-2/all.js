
var domHelpers = require('../helpers-dom.js');
var mathHelpers = require('../helpers-math.js');
var Subtree = require('./subtree.js');
var Commonality = require('./commonality.js');

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

// If the title is with in the first 25% of the text then thats perfect,
// otherwise do a linear scale down to zero.
function titlePositionScore(position, length) {
  if (position < length * 0.25) return 1;
  else return 1 - ((position - length * 0.25) / length * 0.75);
}

function Pair(title, text) {
  this.title = title;
  this.text = text;
  this.distance = domHelpers.treeDistance(title.node, text.node);
  this._titlePosition();

  this.likelihood = 0;
}

Pair.prototype._titlePosition = function () {
  var text = this.text.text;
  var title = this.title.text;

  var titlePosition = text.indexOf(title);
  if (titlePosition === -1) {
    this.titlePosition = 1;
  } else {
    this.titlePosition = titlePositionScore(titlePosition, text.length);
  }
};

Fase2Algortime.prototype.combine = function () {
  var pair;

  for (var i = 0, l = this._titles.length; i < l; i++) {
    for (var n = 0, r = this._texts.length; n < r; n++) {
      if (this._texts[n].node === this._titles[i].node) continue;

      var textend = domHelpers.positionRange(this._texts[n].node)[1];
      if (this._titles[i].node.position > textend) continue;

      pair = new Pair(this._titles[i], this._texts[n]);
      this._pairs.push(pair);
      this._adjustDistance.update(pair.distance);
    }
  }

  for (var j = 0, t = this._pairs.length; j < t; j++) {
    var distanceScore = 1 - mathHelpers.adjusedValue(this._pairs[j].distance, this._adjustDistance);
    this._pairs[j].likelihood = (
      (this._pairs[j].title.likelihood + this._pairs[j].text.likelihood) / 2 +
      (distanceScore + this._pairs[j].titlePosition) / 2
    ) / 2;
  }

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

  var analyser = new Commonality(this._reducedTextObject);
  var tree = new Subtree(this._reducedTextObject);

  // Remove all not even sugested images
  var legalImages = {};
  this._images.forEach(function (node) {
    legalImages[node.href] = true;
  });
  tree.findImages(this._reducedTextObject).forEach(function (node) {
    if (node.tagname === 'img' && legalImages.hasOwnProperty(node.attr.src) === false) {
      node.remove();
    }
  });

  // Now cleanup the tree
  tree.reduceTree();

  // Analyse the subcontainers
  analyser.collect(tree.containerNodes());
  console.log(tree.print());
  analyser.tagnameReducer();
  tree.reduceTree();

  console.log('-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --');

  // Print out the remaining elements
  analyser.collect(tree.containerNodes());
  console.log(tree.print());
  console.log(require('util').inspect({
    node: analyser.node,
  //  parent: analyser.parent
  }, {
    colors: true,
    depth: 4
  }));
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
