
//
// RootNode
//   has no parent, tagname or attribute
//
function RootNode() {
  this.type = 'root';
  this.parent = null;
  this.position = 0;

  this.children = [];
}
exports.RootNode = RootNode;

RootNode.prototype.append = function (child) {
  this.children.push(child);

  return child;
};

RootNode.prototype.close = function () {
  return null;
};

RootNode.prototype.last = function () {
  return this;
};

//
// TextNode
//   has a parent and a text containter
//
function TextNode(parent, text) {
  this.type = 'text';
  this.parent = parent;
  this.position = -1;

  this.text = text;
}
exports.TextNode = TextNode;

TextNode.prototype.append = function (node) {
  if (node.type === 'text') {
    this.text += ' ' + node.text;
    return this;
  } else {
    // the parrent will assign a position
    this.parent.append(node);
    return node;
  }
};

TextNode.prototype.close = function () {
  return this.parent.close();
};

TextNode.prototype.last = function () {
  return this.parent;
};

//
// ElementNode
//   has a parent, tagname and attributes
//
function ElementNode(parent, tagname, attributes) {
  this.type = 'element';
  this.parent = parent;
  this.position = -1;

  this.tagname = tagname;
  this.attr = attributes;
  this.children = [];
}
exports.ElementNode = ElementNode;

ElementNode.prototype.append = function (child) {
  this.children.push(child);

  return child;
};

ElementNode.prototype.close = function () {
  return this.parent;
};

ElementNode.prototype.last = function () {
  return this;
};
