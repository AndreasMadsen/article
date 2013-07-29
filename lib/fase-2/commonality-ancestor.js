
var util = require('util');
var commonality = require('./commonality.js');
var CommonalityInterface = commonality.Interface;
var CommanalityMatrix = commonality.Matrix;

//
// Create the exposed class
//
function CommonalityAncestor(top) {
  CommonalityInterface.call(this, AncestorMatrix, top);
}
module.exports = CommonalityAncestor;
util.inherits(CommonalityAncestor, CommonalityInterface);

//
// Collects features and bind them to the node density
//
function AncestorMatrix(top) {
  CommanalityMatrix.call(this, top);

  this.classlist = top.root.classlist;
}
util.inherits(AncestorMatrix, CommanalityMatrix);

AncestorMatrix.prototype._parentPattern = function (node) {
  var parent = node.parent;

  var pattern = parent.tagname;
  if (parent.attr.hasOwnProperty('id')) {
    pattern += '#' + parent.attr.id;
  } else if (parent.classes.length > 0) {
    pattern += '.' + parent.classes.sort().join('.');
  }

  return pattern;
};

AncestorMatrix.prototype._childrenPattern = function (node) {
  if (node.type === 'text' || node.children.length === 0) return '#none';

  var children = node.children;

  var pattern = [];
  for (var i = 0, l = children.length; i < l; i++) {
    if (children[i].type === 'element') {
      if (children[i].tagname !== 'br' && children[i].tagname !== 'wbr') {
        pattern.push(children[i].tagname);
      }
    } else {
      if (pattern[pattern.length - 1] !== '#text') {
        pattern.push('#text');
      }
    }
  }

  return pattern.join(',');
};

AncestorMatrix.prototype.append = function (node) {
  var rowId = this.row(this._parentPattern(node));
  var collumId = this.collum(this._childrenPattern(node));

  // Store the node
  this.nodeMatrix[collumId][rowId].push(node);
};

AncestorMatrix.prototype.cellName = function (a, b) {
  return this.rowNames[b] + '.' + this.collumNames[a];
};
