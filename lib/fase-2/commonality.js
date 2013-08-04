
var ttest = require('ttest');
var summary = require('summary');

//
// The exposed API used in all.js
//
function CommonalityInterface(MatrixConstructor, top) {
  this.top = top;
  this.length = null;
  this.matrix = null;

  this.MatrixConstructor = MatrixConstructor;
}
exports.Interface = CommonalityInterface;

CommonalityInterface.prototype.collect = function (nodelist) {
  this.length = nodelist.length;

  this.matrix = new this.MatrixConstructor(this.top);
  for (var i = 0, l = nodelist.length; i < l; i++) {
    this.matrix.append(nodelist[i]);
  }
  this.matrix.summarise();
};

var ttest_options = {
  alpha: 0.05,
  alternative: "greater"
};

CommonalityInterface.prototype.reduce = function (maxRatio) {
  var maxRemoval = this.top.getText().length * maxRatio;

  var dim = this.matrix.dim;
  var matrix = this.matrix.summaryMatrix;
  var best = matrix[this.matrix.bestIndex[0]][this.matrix.bestIndex[1]];

  for (var a = 0; a < dim[0]; a++) {
    for (var b = 0; b < dim[1]; b++) {
      var compare = matrix[a][b];

      // Skip self and none compare summary
      if (compare === best || compare.size() === 0) {
        continue;
      }

      else if (this.matrix.cellTextLength(a, b) > maxRemoval) {
        continue;
      }

      // If the maximal value in compare is much less than the minimal value in
      // the best dataset, its pretty safe to remove the currently compared
      // nodes
      else if (compare.max() * 1.25 < best.min()) {
        this.matrix.removeCell(a, b);
      }

      // If there is only two values then there is not enogth data to perfrom
      // a statical valid analysis, but if maxmean is 25% greater than the
      // alternative it should be good enogth
      else if (compare.size() === 1 || best.size() === 1) {
        if (compare.mean() * 1.25 < best.mean()) {
          this.matrix.removeCell(a, b);
        }
      }

      // Check if the maxdataset mean is greater than the current tagname
      else if (ttest(best, compare, ttest_options).valid() === false) {
        this.matrix.removeCell(a, b);
      }
    }
  }
};

//
// Some abstact API for the commanality matrix
//
function CommanalityMatrix(classlist) {
  // space will identify a text node and/or an element node without any classnames
  this.rowKeys = {};
  this.rowNames = [];

  this.collumKeys = {};
  this.collumNames = [];

  this.nodeMatrix = [];
  this.summaryMatrix = [];

  this.dim = [0, 0];

  this.bestIndex = [-1, -1];
  this._bestNodes = {};
}
exports.Matrix = CommanalityMatrix;

//
// Extend the rows or the collums
//
function arrayVector(size) {
  var vec = new Array(size);
  for (var i = 0; i < size; i++) vec[i] = [];
  return vec;
}

function zeroVector(size) {
  var vec = new Array(size);
  for (var i = 0; i < size; i++) vec[i] = 0;
  return vec;
}

CommanalityMatrix.prototype.collum = function (name) {
  if (this.collumKeys.hasOwnProperty(name) === false) {
    this.collumKeys[name] = this.collumNames.length;
    this.collumNames.push(name);

    this.nodeMatrix.push(arrayVector(this.rowNames.length));
    this.summaryMatrix.push(zeroVector(this.rowNames.length));
  }

  return this.collumKeys[name];
};

CommanalityMatrix.prototype.row = function (name) {
  if (this.rowKeys.hasOwnProperty(name) === false) {
    this.rowKeys[name] = this.rowNames.length;
    this.rowNames.push(name);

    for (var a = 0, b = this.collumNames.length; a < b; a++) {
      this.nodeMatrix[a].push([]);
      this.summaryMatrix[a].push(0);
    }
  }

  return this.rowKeys[name];
};

//
// Summarize the matrix
//
function node2density(node) {
  return node.density;
}

// Create a summary matrix and find the highest mean
CommanalityMatrix.prototype.summarise = function () {
  var dim = this.dim = [this.summaryMatrix.length, this.summaryMatrix[0].length];
  var bestMean = -1;

  for (var a = 0; a < dim[0]; a++) {
    for (var b = 0; b < dim[1]; b++) {
      var stat = this.summaryMatrix[a][b] = summary(this.nodeMatrix[a][b].map(node2density));
      var mean = stat.mean();
      if (isNaN(mean) === false && mean > bestMean) {
        bestMean = mean;
        this.bestIndex = [a, b];
      }
    }
  }

  var nodes = this.nodeMatrix[this.bestIndex[0]][this.bestIndex[1]];
  for (var i = 0, l = nodes.length; i < l; i++) {
    this._bestNodes[ nodes[i].identifyer ] = 1;
  }
};

//
// Some basic cell operations
//
CommanalityMatrix.prototype.removeCell = function (a, b) {
  var nodelist = this.nodeMatrix[a][b];

  for (var i = 0, l = nodelist.length; i < l; i++) {
    if (this._bestNodes.hasOwnProperty(nodelist[i].identifyer) === false) {
      nodelist[i].remove();
    }
  }
};

CommanalityMatrix.prototype.cellTextLength = function (a, b) {
  var nodelist = this.nodeMatrix[a][b];
  var length = 0;
  for (var i = 0, l = nodelist.length; i < l; i++) {
    length += nodelist[i].getText().length;
  }
  return length;
};

//
// Debug methods
//
CommanalityMatrix.prototype.print = function () {
  var table = require('text-table');
  var matrix = [ [''].concat(this.collumNames) ];

  for (var b = 0; b < this.dim[1]; b++) {
    var row = [this.rowNames[b]];
    matrix.push(row);

    for (var a = 0; a < this.dim[0]; a++) {
      var str = '';
      if (a === this.bestIndex[0] && b === this.bestIndex[1]) str += '**';
      str += this.summaryMatrix[a][b].size() + ' ~ ' + this.summaryMatrix[a][b].mean().toPrecision(3);
      if (a === this.bestIndex[0] && b === this.bestIndex[1]) str += '**';

      row.push(str);
    }
  }

  return table(matrix);
};
