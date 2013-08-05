
var util = require('util');
var entities = require('entities');

var WHITE_SPACE = /\s+/g;

var BLOCK_ELEMENTS = exports.BLOCK_ELEMENTS = {
	address: true, article: true, aside: true,
	blockqoute: true, canvas: true, dd: true,
  div: true, dl: true, fieldset: true,
  figcaption: true, figure: true, footer: true,
  form: true, h1: true, h2: true, h3: true,
  h4: true, h5: true, h6: true, header: true,
  hgroup: true, hr: true, img: true, object: true,
  ol: true, output: true, p: true, pre: true,
  section: true, table: true, tfoot: true,
  ul: true, li: true, tr: true
};

var NO_TEXT_ELEMENTS = exports.NO_TEXT_ELEMENTS = {
	script: true, noscript: true, style: true,
  iframe: true, object: true, embed: true,
  video: true, audio: true
};

var IGNORE_TEXT_ELEMENT = exports.IGNORE_TEXT_ELEMENT = {
	aside: true, caption: true, menu: true,
	details: true, fieldset: true, button: true,
	label: true, input: true, textarea: true
};

var HEADERS = exports.HEADERS = {
	h1: true, h2: true, h3: true,
	h4: true, h5: true, h6: true
};

var INLINE_TEXT_TAGS = exports.INLINE_TEXT_TAGS = {
	strong: true, span: true, em: true,
	b: true, i: true, u: true, del: true,
	ins: true, a: true, time: true, sub: true,
	sup: true, big: true, small: true, tt: true,
	strike: true
};

var INLINE_STYLE_TAGS = exports.INLINE_STYLE_TAGS = {
	h1: true, h2: true, h3: true,
	h4: true, h5: true, h6: true,
	strong: true, span: true, em: true,
	b: true, i: true, u: true, del: true,
	ins: true, a: true, time: true, sub: true,
	sup: true, big: true, small: true, tt: true,
	strike: true
};

// Map the entities decodeHTML5 method
exports.decodeEntities = entities.decodeHTML5;

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

  return [node.identifyer, prev.identifyer];
}
exports.positionRange = positionRange;
