
var util = require('util');
var domHelpers = require('./helpers-dom.js');

var WHITE_SPACE = /\s+/g;
var NEWLINE_NORMALIZE = /([ ]*)\n([ ]*)/g;
var DOUBLE_NEWLINE_NORMALIZE = /([\n]*)\n\n([\n]*)/g;

//
// Simple DOM:
// > like object structure, this is what they have in common
//  - `.type` is a string (root, text, element)
//  - `.parent` refer to the nodes parrent
//  - `.identifyer` is a simply id used as an object property name elsewhere
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
  this.root = parent ? parent.root : this;
  this.identifyer = parent ? (++parent.root.identifyer) : 0;

  // The specific constructor will set another value if necessary
  this.textLength = 0;

  this.tags = 0;
  this.density = -1;

  this.children = [];

  this._countTagnames = {};

  this.text = '';
  this.textCompiled = false;

  this.blocky = false;
  this.blockyChildren = false;

  this.inTree = true;
}

// Calculate the internal subStringLength and subTags properties
Node.prototype._updateCounters = function () {
  if (domHelpers.NO_TEXT_ELEMENTS.hasOwnProperty(this.tagname)) return;

  for (var i = 0, l = this.children.length; i < l; i++) {
    this.textLength += this.children[i].textLength;
    this.tags += this.children[i].tags;
  }
};

// Calculate the density
Node.prototype._updateDensity = function () {
  this.density = (this.tags === 0) ?
    this.textLength : this.textLength / this.tags;
};

Node.prototype.getText = function () {
  if (this.textCompiled === true) return this.text;

  for (var i = 0, l = this.children.length; i < l; i++) {
    var subnode = this.children[i];

    if (subnode.type === 'text') {
      this.text += this.children[i].text;
    }
    else if (subnode.type === 'element' && subnode.tagname === 'br') {
      this.text += '\n';
    }
    else if (subnode.type === 'element' &&
            domHelpers.BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname) === true) {
      this.text += '\n\n' + subnode.getText() + '\n\n';
    }
    else if (domHelpers.NO_TEXT_ELEMENTS.hasOwnProperty(subnode.tagname) === false) {
      this.text += subnode.getText();
    }
  }

  this.text = this.text
    // Make sure that space don't surround newline
    .replace(NEWLINE_NORMALIZE, '\n')
    // Make sure that there is no more than two newlines after each other
    .replace(DOUBLE_NEWLINE_NORMALIZE, '\n\n');

  this.textCompiled = true;

  return this.text;
};

// Set up all the parents to recalculate the text
Node.prototype._textChanged = function () {
  if (this.textLength !== 0) {
    var parent = this;
    while (parent = parent.parent) {
      if (parent.textCompiled === false) break;
      parent.textCompiled = false;
      parent.text = '';
    }
  }
};

// Update blocky flags
Node.prototype._blockyChanged = function () {
  if (this.blocky === true) {
    var parent = this;
    while(parent = parent.parent) {
      parent._updateBlocky();
      // If parent is blocky then nothing at this level has changed
      // and so other parents also won't change.
      if (parent.blocky === true) break;
    }
  }
};

Node.prototype._inTreeFlag = function (bool) {
  this.inTree = bool;
  if (this.type === 'element') {
    for (var i = 0, l = this.children.length; i < l; i++) {
      this.children[i]._inTreeFlag(bool);
    }
  }
};

Node.prototype.remove = function () {
  if (this.parent) {
    // Remove this node
    var index = this.parent.children.indexOf(this);
    if (index !== -1) {
      this.parent.children.splice(index, 1);
    }

    // Update flags
    this._textChanged();
    this._blockyChanged();
    this._inTreeFlag(false);

    // Remove this node from the classlist
    if (this.classes) {
      this.root.classlist.removeNode(this);
    }
  }
};

Node.prototype.insert = function (node, index) {
  // Insert node
  node.parent = this;
  this.children.splice(index, 0, node);

  // Update flags
  this._textChanged();
  this._blockyChanged();

  // Insert this node intro the classlist
  if (this.classes) {
    this.root.classlist.addNode(this);
  }
};

Node.prototype.before = function () {
  var index = this.parent.children.indexOf(this);
  if (index === 0) return this.parent;
  return this.parent.children[index - 1];
};

Node.prototype.after = function () {
  var index = this.parent.children.indexOf(this);
  if (index === this.parent.children.length - 1) return this.parent;
  return this.parent.children[index + 1];
};

Node.prototype.countTagname = function (tagname) {
  if (this._countTagnames.hasOwnProperty(tagname)) return this._countTagnames[tagname];

  var total = this.tagname === tagname ? 1 : 0;
  for (var i = 0, l = this.children.length; i < l; i++) {
    total += this.children[i].countTagname(tagname);
  }

  this._countTagnames = total;
  return total;
};

//
// RootNode
//   has no parent, tagname or attribute
//
function RootNode() {
  Node.call(this, 'root', null);
  this.blocky = true;

  // Setup microdata root
  this.micro = new MicrodataRoot(this);
  this.classlist = new ClassList();
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

RootNode.prototype.print = function () {
  return '!root';
};

//
// FragmentNode
//   has parent and children, but no tagname or attribute
//
function FragmentNode(parent) {
  Node.call(this, 'fragment', parent);
}
util.inherits(FragmentNode, Node);
exports.FragmentNode = FragmentNode;

FragmentNode.prototype.append = function (child) {
  this.children.push(child);

  return child;
};

FragmentNode.prototype.close = function () {
  return this.parent;
};

FragmentNode.prototype.element = function () {
  return this;
};

FragmentNode.prototype.assign = function (node) {
  node.children = this.children;
};

FragmentNode.prototype.print = function () {
  return '!fragment';
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
  this.text = this.text.replace(WHITE_SPACE, ' ');
  this.textCompiled = true;

  this.textLength = this.text.length;
  this._updateDensity();
};

TextNode.prototype.close = function () {
  this._textClose();

  return this.parent.close();
};

TextNode.prototype.element = function () {
  return this.parent;
};

TextNode.prototype.countTagname = function () {
  return 0;
};

TextNode.prototype.print = function () {
  var text = this.text.trim();
  return '# ' + text.slice(0, 50).trim() + (text.length > 50 ? '...' : '');
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
    attributes['class'].trim().split(WHITE_SPACE) : [];

  // Add node to the classlist
  this.root.classlist.addNode(this);

  // Setup microdata scrope or item
  if (attributes.hasOwnProperty('itemscope')) {
    this.micro = new MircodataScope(this);
  } else if (attributes.hasOwnProperty('itemprop')) {
    this.micro = new MircodataItem(this);
  } else {
    this.micro = null;
  }

	this._blockyTagname = domHelpers.BLOCK_ELEMENTS.hasOwnProperty(tagname);
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

  this._updateBlocky();

  return this.parent;
};

ElementNode.prototype.element = function () {
  return this;
};

ElementNode.prototype.print = function () {
  var names = Object.keys(this.attr);
  var str = '';
  for (var i = 0, l = names.length; i < l; i++) {
    var attrStr = this.attr[names[i]];
    str += names[i] + '="' + attrStr.slice(0, 20) + (attrStr.length > 20 ? '...' : '') + '" ';
  }

  return '<' + this.tagname + ' ' + str + '>';
};

ElementNode.prototype._updateBlocky = function () {
	this.blocky = this._blockyTagname;
	this.blockyChildren = false;

  // Check if a none blocky element contains a blocky element
	for (var i = 0, l = this.children.length; i < l; i++) {
		if (this.children[i].blocky === true) {
			this.blocky = true;
			this.blockyChildren = true;
			break;
		}
	}
};

//
// Classlist collection
//
function ClassList() {
  this.classes = [];
  this.collections = Object.create(null);
}

ClassList.prototype.get = function (name) {
  return Object.prototype.hasOwnProperty.call(this.collections, name) ?
    this.collections[name] : [];
};

ClassList.prototype.set = function (name, node) {
  if (Object.prototype.hasOwnProperty.call(this.collections, name)) {
    this.collections[name].push(node);
  } else {
    this.collections[name] = [node];
    this.classes.push(name);
  }
};

ClassList.prototype.remove = function (name, node) {
  if (Object.prototype.hasOwnProperty.call(this.collections, name)) {
    var index = this.collections[name].indexOf(node);
    if (index !== -1) {
      this.collections[name].splice(index, 1);
    }

    if (this.collections[name].length === 0) {
      delete this.collections[name];
      this.classes.splice(this.classes.indexOf(name), 1);
    }
  }
};

ClassList.prototype.addNode = function (node) {
  for (var i = 0, l = node.classes.length; i < l; i++) {
    this.set(node.classes[i], node);
  }
};

ClassList.prototype.removeNode = function (node) {
  for (var i = 0, l = node.classes.length; i < l; i++) {
    this.remove(node.classes[i], node);
  }
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
  for (var i = 0, l = item.keys.length; i < l; i++) {
    if (Array.isArray(this.properties[item.keys[i]])) {
      this.properties[item.keys[i]].push(item);
    } else {
      this.properties[item.keys[i]] = [item];
    }
  }
};

Microdata.prototype._setKey = function () {
  if (this.node.attr.hasOwnProperty('itemprop')) {
    this.keys = this.node.attr.itemprop.split(WHITE_SPACE);
    this.parent._appendProperty(this);
  } else {
    this.keys = false;
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

  this.keys = null;
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
