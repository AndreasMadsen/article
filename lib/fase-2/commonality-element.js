
var util = require('util');
var commonality = require('./commonality.js');
var CommonalityInterface = commonality.Interface;
var CommanalityMatrix = commonality.Matrix;

//
// Create the exposed class
//
function CommonalityElement(top) {
  CommonalityInterface.call(this, ElementMatrix, top);
}
module.exports = CommonalityElement;
util.inherits(CommonalityElement, CommonalityInterface);

//
// Collects features and bind them to the node density
//
function ElementMatrix(top) {
  CommanalityMatrix.call(this, top);

  this.row(' ');
  this.collum(' ');
  this.classlist = top.root.classlist;
}
util.inherits(ElementMatrix, CommanalityMatrix);

// Create a list of classnames there contains more than one node in the tree
ElementMatrix.prototype._classNames = function (node) {
  var reducedClassnames = [];
  if (node.type === 'element') {
    for (var n = 0, r = node.classes.length; n < r; n++) {
      if (this.classlist.get(node.classes[n]).length > 1) {
        reducedClassnames.push(node.classes[n]);
      }
    }
  }

  return reducedClassnames.length === 0 ? [' '] : reducedClassnames;
};

ElementMatrix.prototype.append = function (node) {
  var tagname = node.type === 'text' ? ' ' : node.tagname;

  // Create a list of classnames there contains more than one node in the tree
  var classnames = this._classNames(node);

  // prepear all classname collums for a new tagname
  var rowId = this.row(tagname);

  for (var i = 0, l = classnames.length; i < l; i++) {
    // Create a new collum in case this is a new tagname
    var collumId = this.collum(classnames[i]);

    // Store the node
    this.nodeMatrix[collumId][rowId].push(node);
  }
};

ElementMatrix.prototype.cellName = function (a, b) {
  return (this.rowNames[b] === ' ' ? 'null' : this.rowNames[b]) +
         ('.') +
         (this.collumNames[a] === ' ' ? 'null' : this.collumNames[b]);
};
