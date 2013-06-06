
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

  var fn = 'return !!(';
  for (var i = 0, l = keys.length; i < l; i++) {
    if (i > 0) fn += '   ||   ';
    fn += ' ( attr[\'' + keys[i] + '\']';

    if (Array.isArray(match[keys[i]])) {
      fn += ' && ( ';

      for (var j = 0, s = match[keys[i]].length; j < s; j++) {
        if (j > 0) fn += ' || ';

        fn += 'attr[\'' + keys[i] + '\'].toLowerCase() === \'' + match[keys[i]][j].toLowerCase() + '\'';
      }
      
      fn += ' )';
    }

    fn += ' ) \n';
  }
  
  fn += '       );';

  return new Function('attr', fn);
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
