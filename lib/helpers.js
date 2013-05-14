
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
