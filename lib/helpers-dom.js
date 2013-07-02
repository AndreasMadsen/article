
var util = require('util');
var entities = require('entities');
var nodes = require('./nodes.js');

var WHITE_SPACE = /\s+/g;
var SPACE_NORMALIZE = /[ ]+/g;
var NEWLINE_NORMALIZE = /([ ]*)\n([ ]*)/g;
var DOUBLE_NEWLINE_NORMALIZE = /([\n]*)\n\n([\n]*)/g;

var BLOCK_ELEMENTS = {};
[
  'address', 'article', 'aside', 'blockqoute', 'canvas', 'dd', 'div',
  'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'img', 'object', 'ol',
  'output', 'p', 'pre', 'section', 'table', 'tfoot', 'ul',
  // Not real block-level elements but treating them at such makes sence
  'li', 'tr'
].forEach(function (tagname) {
  BLOCK_ELEMENTS[tagname] = 1;
});
exports.BLOCK_ELEMENTS = BLOCK_ELEMENTS;

var NO_TEXT_ELEMENTS = {};
[
  'script', 'style', 'iframe', 'object', 'embed', 'video', 'audio'
].forEach(function (tagname) {
  NO_TEXT_ELEMENTS[tagname] = 1;
});
exports.NO_TEXT_ELEMENTS = NO_TEXT_ELEMENTS;

var HEADERS = {};
[
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
].forEach(function (tagname) {
  HEADERS[tagname] = 1;
});
exports.HEADERS = HEADERS;

var INLINE_STYLE_TAGS = {};
[
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong',
  'em', 'b', 'i', 'u', 'del', 'ins', 'a', 'time',
  'sub', 'sup', 'big', 'small', 'tt', 'strike'
].forEach(function (tagname) {
  INLINE_STYLE_TAGS[tagname] = 1;
});
exports.INLINE_STYLE_TAGS = INLINE_STYLE_TAGS;

// Map the entities decodeHTML5 method
exports.decodeEntities = entities.decodeHTML5;

function getNoneStyledText(topnode) {
  var text = '';
  
  (function recursive(node) {
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];
      if (subnode.type === 'text') {
        text += subnode.text;
      } else if (subnode.type === 'element' &&
                 subnode.tagname === 'br') {
        text += '\n';
      } else if (subnode.type === 'element' &&
                 BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname) === true &&
                 INLINE_STYLE_TAGS.hasOwnProperty(subnode.tagname) === false) {
        text += '\n\n';
        recursive(subnode);
        text += '\n\n';
      } else if (NO_TEXT_ELEMENTS.hasOwnProperty(subnode.tagname) === false &&
                 INLINE_STYLE_TAGS.hasOwnProperty(subnode.tagname) === false) {
        recursive(subnode);
      }
    }
  })(topnode);

  return text
    // Make sure there is no double spaces "  "
    .replace(SPACE_NORMALIZE, ' ')
    // Make sure that space don't surround newline
    .replace(NEWLINE_NORMALIZE, '\n')
    // Make sure that there is no more than two newlines after each other
    .replace(DOUBLE_NEWLINE_NORMALIZE, '\n\n')
    // Make sure there is no traling og heading space
    .trim();
}
exports.getNoneStyledText = getNoneStyledText;

// Builds and attribute matching function, complexity is for uncomfirmed
// performace sake
function buildAttributeMatcher(match) {
  var keys = Object.keys(match);
  var jskey, i, l;

  var transform = '';
  var bool = '';

  transform = 'transform = {\n';
  for (i = 0, l = keys.length; i < l; i++) {
    jskey = JSON.stringify(keys[i]);

    transform += '  ' + jskey + ': attr.hasOwnProperty(' + jskey + ') ? attr[' + jskey + '].toLowerCase() : false';
    if (i !== l - 1) transform += ',';
    transform += '\n';
  }
  transform += '};\n';

  bool = 'return !!(';
  for (i = 0, l = keys.length; i < l; i++) {
    jskey = JSON.stringify(keys[i]);

    if (i > 0) bool += '    ||    ';
    bool += ' ( transform[' + jskey + ']';

    if (Array.isArray(match[keys[i]])) {
      bool += ' && ( ';

      for (var j = 0, s = match[keys[i]].length; j < s; j++) {
        if (j > 0) bool += ' || ';

        if (typeof match[keys[i]][j] === 'string') {
          bool += 'transform[' + jskey + '] === \'' + match[keys[i]][j].toLowerCase() + '\'';
        } else if (util.isRegExp(match[keys[i]][j])) {
          bool += 'match[' + jskey + '][' + j + '].test(transform[' + jskey + '])';
        }
      }

      bool += ' )';
    }

    bool += ' ) \n';
  }

  bool += '         );';

  var anonymous = new Function('attr', 'match', transform + '\n' + bool);
  return function (attr) {
    return anonymous(attr, match);
  };
}
exports.buildAttributeMatcher = buildAttributeMatcher;

// Handle the HTML entities and replace all collections of whitespace with
// just a single space
function normalizeString(text) {
  return entities.decodeHTML5(text).replace(WHITE_SPACE, ' ');
}
exports.normalizeString = normalizeString;

// Checks if container `a` is a container of `b`
function containerOf(a, b) {
  while (b = b.parent) {
    if (a === b) return true;
  }
  return false;
}
exports.containerOf = containerOf;

// Find the common parent of a and b 
function commonParent(a, b) {
  if (a === b) {
    return a;
  } else if (containerOf(a, b)) {
    return a;
  } else if (containerOf(b, a)) {
    return b;
  } else {
    // This will happen at some point, since the root is a container of
    // everything
    while (b = b.parent) {
      if (containerOf(b, a)) return b;
    }
  }
}
exports.commonParent = commonParent;

// Parse style attribute intro object
function styleParser(style) {
  style = style || '';  

  var tokens = style.trim().split(/\s*(?:;|:)\s*/);
  var output = {};
  for (var i = 1, l = tokens.length; i < l; i += 2) {
    output[tokens[i - 1]] = tokens[i];
  }
  return output;
}
exports.styleParser = styleParser;

// Calculate the tree distance between a and b
function treeDistance(a, b) {
  if (a === b) return 0;
  var parent = commonParent(a, b);

  var aParent = a;
  var aCount = 0;

  var bParent = b;
  var bCount = 0;

  if (parent !== a) {
    while (parent !== aParent.parent) {
      aCount += 1;
      aParent = aParent.parent;
    }
  } else {
    bCount += 1;
  }

  if (parent !== b) {
    while (parent !== bParent.parent) {
      bCount += 1;
      bParent = bParent.parent;
    }
  } else {
    aCount += 1;
  }

  var abCount = 0;
  if (parent !== a && parent !== b) {
    abCount = Math.abs(
      parent.children.indexOf(aParent) - parent.children.indexOf(bParent)
    );
  }

  return aCount + bCount + abCount;
}
exports.treeDistance = treeDistance;

function lastElementChild(node) {
  var i = node.children.length;
  while (i--) {
    if (node.children[i].type === 'element') return node.children[i];
  }
  return null;
}
function positionRange(node) {
  var curr, prev = node;
  while (curr = lastElementChild(prev)) {
    prev = curr;
  }

  return [node.position, prev.position];
}
exports.positionRange = positionRange;
