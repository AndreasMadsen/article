
var util = require('util');
var domHelpers = require('./helpers-dom.js');

var WORD_SPLIT = /\s+/;

//
// Simple DOM:
// > like object structure, this is what they have in common
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
  
  this.depth = parent ? (parent.depth + 1) : 0;

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

  // Setup microdata root
  this.micro = new MicrodataRoot(this);
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
  this.classes = attributes.hasOwnProperty('class') ?
    attributes['class'].split(WORD_SPLIT) : [];

  // Setup microdata scrope or item
  if (attributes.hasOwnProperty('itemscope')) {
    this.micro = new MircodataScope(this);
  } else if (attributes.hasOwnProperty('itemprop')) {
    this.micro = new MircodataItem(this);
  } else {
    this.micro = null;
  }
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

//
// Microdata DOM
// > A sort of subspace/sub-DOM for microdata
//  - `.type` is a string (root, scope, item)
//  - `.scope` itemtype value
//  - `.parent` refer to microdata container of this dataobject
//  - `.properties` an object of arrays, the `name` is the key and dataobjects are items
//  - `.key` itemprop value
//  - `.value` the assotiated value
//  - `.node` an reference to the node which the microdata is attached to
//
// NOTE: itemrefs and itemid are at this point not supported
//
// Information source:
// * http://diveintohtml5.info/extensibility.html
// * http://html5doctor.com/microdata/
//

// 
// Mircodata
//  shared logic between all dataobjects
//
function Microdata(node, type) {
  this.node = node;
  this.type = type;

  // Find the parent
  var parentNode = this.node;
  while(parentNode = parentNode.parent) {
    if (parentNode.micro &&
       (parentNode.micro.type === 'root' || parentNode.micro.type === 'scope')) {
      break;
    }
  }
  this.parent = parentNode ? parentNode.micro : null;

  // Set the root reference
  this._root = parentNode ? parentNode.micro._root : this;
}

Microdata.prototype._appendProperty = function (item) {
  if (Array.isArray(this.properties[item.key])) {
    this.properties[item.key].push(item);
  } else {
    this.properties[item.key] = [item];
  }
};

Microdata.prototype._setKey = function () {
  if (this.node.attr.hasOwnProperty('itemprop')) {
    this.key = this.node.attr.itemprop;
    this.parent._appendProperty(this);
  } else {
    this.key = false;
  }
};

// 
// MicrodataRoot
//  has only properties if that even exists
// 
function MicrodataRoot(node) {
  Microdata.call(this, node, 'root');

  this.properties = {};
  this.scopes = {};
  this.value = null;
  this.scope = null;

  this.key = null;
}
util.inherits(MicrodataRoot, Microdata);

MicrodataRoot.prototype._appendScope = function (item) {
  if (Array.isArray(this.scopes[item.scope])) {
    this.scopes[item.scope].push(item);
  } else {
    this.scopes[item.scope] = [item];
  }
};

//
// MircodataScope
//  has a parent, properties and a key, but no value
//
function MircodataScope(node) {
  Microdata.call(this, node, 'scope');
  
  this.properties = {};
  this.scopes = null;
  this.value = null;
  this.scope = null;

  this._setKey();

  if (node.attr.hasOwnProperty('itemtype')) {
    this.scope = node.attr.itemtype;
    this._root._appendScope(this);
  }
}
util.inherits(MircodataScope, Microdata);

//
// MircodataItem
//  has a parent and a (key, value), but no properties
//
function MircodataItem(node) {
  Microdata.call(this, node, 'item');

  this.properties = null;
  this.scopes = null;
  this.value = null;
  this.scope = null;

  this._setKey();

  // Find the value
  switch (node.tagname) {
    case 'meta':
      this.value = node.attr.content || null;
      break;

    case 'audio':
    case 'embed':
    case 'iframe':
    case 'img':
    case 'source':
    case 'video':
      this.value = node.attr.src || null;
      break;

    case 'a':
    case 'href':
    case 'link':
      this.value = node.attr.href || null;
      break;

    case 'object':
      this.value = node.attr.data || null;
      break;

    case 'time':
      this.value = node.attr.datetime || null;
      break;

    default:
      this._setupTextValue();
      break;
  }  
}
util.inherits(MircodataItem, Microdata);

// Setup a cached text getter for the value property
MircodataItem.prototype._setupTextValue = function () {
  var self = this;

  Object.defineProperty(this, 'value', {
    configurable: true,
    enumerable: true,
    get: function () {
      return self.value = domHelpers.getRawText(self.node);
    },

    set: function (text) {
      Object.defineProperty(this, 'value', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: text
      });
    }
  });
};
