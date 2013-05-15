
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

  return text.trim();
}
exports.getRawText = getRawText;

function buildAttributeMatcher(match) {
  var keys = Object.keys(match);

  var fn = 'return (';
  for (var i = 0, l = keys.length; i < l; i++) {
    if (i > 0) fn += '   &&   ';
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

