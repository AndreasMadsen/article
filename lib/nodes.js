
var util = require('util');
var domHelpers = require('./helpers-dom.js');

//
// Simple DOM like object structure, this is what they have in common
//  - `.type` is a string (root, text, element)
//  - `.parent` refer to the nodes parrent
//  - `.position` is the tag number from top to down
//  - `.children` is an array of the elements children
//  - `.append` adds a node to this node
//  - `.element` return the actual element
//

//
// Node
//  General abstaction between all node types
//  The rule is that this should contain the most obviouse implementation
//
function Node(type, parent) {
  this.type = type;
  this.parent = parent;
  
  // The specific constructor will set another value if necessary
  this._stringLength = 0;
  this.tags = 0;
  
  this.position = -1;
  this.density = -1;
  
  this.children = [];
}

// Calculate the internal subStringLength and subTags properties
Node.prototype._updateCounters = function () {
  if (domHelpers.NO_TEXT_ELEMENTS.hasOwnProperty(this.tagname)) return;
  
  for (var i = 0, l = this.children.length; i < l; i++) {
    this._stringLength += this.children[i]._stringLength;
    this.tags += this.children[i].tags;
  }
};

// Calculate the density
Node.prototype._updateDensity = function () {
  this.density = (this.tags === 0) ?
    this._stringLength : this._stringLength / this.tags;
};

//
// RootNode
//   has no parent, tagname or attribute
//
function RootNode() {
  Node.call(this, 'root', null);
  this.position = 0;
}
util.inherits(RootNode, Node);
exports.RootNode = RootNode;

RootNode.prototype.append = function (child) {
  this.children.push(child);

  return child;
};

RootNode.prototype.close = function () {
  this._updateCounters();
  this._updateDensity();

  return null;
};

RootNode.prototype.element = function () {
  return this;
};

//
// TextNode
//   has a parent and a text containter
//
function TextNode(parent, text) {
  Node.call(this, 'text', parent);

  // A text node has no children instead it has a text container
  this.children = null;
  this.text = text;
}
util.inherits(TextNode, Node);
exports.TextNode = TextNode;

TextNode.prototype.append = function (node) {
  if (node.type === 'text') {
    this.text += node.text;
    return this;
  } else {
    // Since the text there are to follow no will not be appended to this text
    // node close it
    this._textClose();

    // the parrent will assign a position
    this.parent.append(node);
    return node;
  }
};

TextNode.prototype._textClose = function () {
  this._stringLength = this.text.length;
  this._updateDensity();
};

TextNode.prototype.close = function () {
  this._textClose();

  return this.parent.close();
};

TextNode.prototype.element = function () {
  return this.parent;
};

//
// ElementNode
//   has a parent, tagname and attributes
//
function ElementNode(parent, tagname, attributes) {
  Node.call(this, 'element', parent);

  // Since this is an element there will minimum one tag
  this.tags = (tagname === 'br' || tagname === 'wbr') ? 0 : 1;
  
  // Element nodes also has a tagname and an attribute collection
  this.tagname = tagname;
  this.attr = attributes;
}
util.inherits(ElementNode, Node);
exports.ElementNode = ElementNode;

ElementNode.prototype.append = function (child) {
  this.children.push(child);

  return child;
};

ElementNode.prototype.close = function () {
  this._updateCounters();
  this._updateDensity();

  return this.parent;
};

ElementNode.prototype.element = function () {
  return this;
};
