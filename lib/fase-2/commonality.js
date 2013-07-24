
var ttest = require('ttest');
var summary = require('summary');

function Commonality(top) {
  this.top = top;
  this.length = null;
  this.matrix = null;
}
module.exports = Commonality;

Commonality.prototype.collect = function (nodelist) {
  this.length = nodelist.length;

  this.matrix = new SummaryMatrix(this.top.root.classlist);
  for (var i = 0, l = nodelist.length; i < l; i++) {
    this.matrix.append(nodelist[i]);
  }
  this.matrix.summarise();
};

Commonality.prototype.reduce = function () {
  var maxRemoval = this.top.getText().length * 0.35;

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
        console.log('skip: ' + this.matrix.cellName(a, b));
        console.log('cause: ' + this.matrix.cellTextLength(a, b) + ' < ' + maxRemoval);
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
      else if (ttest(best, compare, {
        alpha: 0.05,
        alternative: "greater"
      }).valid() === false) {
        this.matrix.removeCell(a, b);
      }
    }
  }
};

//
// Collects features and bind them to the node density
//
function SummaryMatrix(classlist) {
  this.classlist = classlist;

  // space will identify a text node and/or an element node without any classnames
  this.tagnames = { ' ': 0 };
  this.rowName = ['null'];
  this.classnames = { ' ': 0 };
  this.collumName = ['null'];

  this.nodeMatrix = [[ [] ]];
  this.summaryMatrix = [[ 0 ]];

  this.dim = [0, 0];

  this.bestIndex = [-1, -1];
  this._bestNodes = {};
}

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

SummaryMatrix.prototype.append = function (node) {
  var tagname = node.type === 'text' ? ' ' : node.tagname;

  // Create a list of classnames there contains more than one node in the tree
  var reducedClassnames = [];
  if (node.type === 'element') {
    for (var n = 0, r = node.classes.length; n < r; n++) {
      if (this.classlist.get(node.classes[n]).length > 1) {
        reducedClassnames.push(node.classes[n]);
      }
    }
  }
  var classnames = reducedClassnames.length === 0 ? [' '] : reducedClassnames;

  // prepear all classname collums for a new tagname
  if (this.tagnames.hasOwnProperty(tagname) === false) {
    this.tagnames[tagname] = this.nodeMatrix[0].length;
    this.rowName.push(tagname);

    for (var a = 0, b = this.nodeMatrix.length; a < b; a++) {
      this.nodeMatrix[a].push([]);
      this.summaryMatrix[a].push(0);
    }
  }

  for (var i = 0, l = classnames.length; i < l; i++) {
    // Create a new collum in case this is a new tagname
    if (this.classnames.hasOwnProperty(classnames[i]) === false) {
      this.classnames[classnames[i]] = this.nodeMatrix.length;
      this.collumName.push(classnames[i]);

      this.nodeMatrix.push(arrayVector(this.nodeMatrix[0].length));
      this.summaryMatrix.push(zeroVector(this.nodeMatrix[0].length));
    }

    // Append the node density
    this.nodeMatrix[ this.classnames[classnames[i]] ][ this.tagnames[tagname] ].push(node);
  }
};

function node2density(node) {
  return node.density;
}

// Create a summary matrix and find the highest mean
SummaryMatrix.prototype.summarise = function () {
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
    this._bestNodes[ nodes[i].position ] = 1;
  }
};

SummaryMatrix.prototype.removeCell = function (a, b) {
  var nodelist = this.nodeMatrix[a][b];

  for (var i = 0, l = nodelist.length; i < l; i++) {
    if (this._bestNodes.hasOwnProperty(nodelist[i].position) === false) {
      nodelist[i].remove();
    }
  }
};

SummaryMatrix.prototype.cellTextLength = function (a, b) {
  var nodelist = this.nodeMatrix[a][b];
  var length = 0;
  for (var i = 0, l = nodelist.length; i < l; i++) {
    length += nodelist[i].getText().length;
  }
  return length;
};

SummaryMatrix.prototype.cellName = function (a, b) {
  return this.rowName[b] + '.' + this.collumName[a];
};

SummaryMatrix.prototype.print = function () {
  var table = require('text-table');
  var matrix = [ [''].concat(this.collumName) ];

  for (var b = 0; b < this.dim[1]; b++) {
    var row = [this.rowName[b]];
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
