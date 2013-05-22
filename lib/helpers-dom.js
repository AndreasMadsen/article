
var entities = require('entities');
var WHITE_SPACE = /\s+/g;

// Get the raw text, but do not normalize it since that can be expencive
// and is rarly necessary.
function getRawText(topnode) {
  var text = '';
  
  (function recursive(node) {
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];

      if (subnode.type === 'text') {
        text += ' ' + subnode.text;
      } else {
        recursive(subnode);
      }
    }    
  })(topnode);

  return text;
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
  if (containerOf(a, b)) {
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
