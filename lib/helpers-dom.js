
var util = require('util');
var entities = require('entities');
var WHITE_SPACE = /\s+/g;

var SPACE_NORMALIZE = /[ ]+/g;
var NEWLINE_NORMALIZE = /([ ]*)\n([ ]*)/g;
var DOUBLE_NEWLINE_NORMALIZE = /([\n]*)\n\n([\n]*)/g;

var BLOCK_ELEMENTS = {};
[
  'address', 'article', 'aside', 'blockqoute', 'canvas', 'dd', 'div',
  'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'ol', 'output', 'p',
  'pre', 'section', 'table', 'tfoot', 'ul',
  // Not real block-level elements but treating them at such makes sence
  'li'
].forEach(function (tagname) {
  BLOCK_ELEMENTS[tagname] = 1;
});
exports.BLOCK_ELEMENTS = BLOCK_ELEMENTS;

var NO_TEXT_ELEMENTS = {};
[
  'script', 'style', 'iframe', 'noscript', 'object', 'embed', 'video', 'audio'
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


// Get the raw text
function getRawText(topnode) {
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
                 BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname) === true) {
        text += '\n\n';
        recursive(subnode);
        text += '\n\n';
      } else if (NO_TEXT_ELEMENTS.hasOwnProperty(subnode.tagname) === false) {
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
exports.getRawText = getRawText;

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
