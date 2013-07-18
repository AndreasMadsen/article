
//
// HELLO FELLOW PROGRAMMER:
// This is the easiest way to add an crazy amount of complexity.

// Please make sure that there is no other alternative and that what you try
// to change will have suffeciently impact in standard text analysis methods
// to be jusfied.
//
// Also document the reason and reference to reallife tests by its ID.
//

function Hardcode(top) {
  this.top = top;
}
module.exports = Hardcode;

Hardcode.prototype.reduce = function () {
  var self = this;

  (function recursive(node) {
    if (node.type === 'element') {
      if (self._removeNode(node)) {
        node.remove();
      }

      var children = node.children.slice(0);
      for (var i = 0, l = children.length; i < l; i++) {
        recursive(children[i]);
      }
    }
  })(this.top);
};

//
// RegExp: author|meta
//  Remove author information
// RegExp: comment
//  Remove comments
// RegExp: related|next|prev
//  Remove links there don't have something to do with this articlæe
// RegExp: share|social
//  Remove social network buttons
// RegExp: photo|caption
//  Remove photo descriptions
// SEE:
// * 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3b21e15fbf3161d
// * 5a012f66c2bf0c70a0744c7483478aaa0c1a2b5b5920a72223f3a090e39df8be
// * 488a0b7fa8bc2e0d799ac1dcb22620654777c66a9260983f369d842210f5d3d4
// * fe32bd9876a32fd93d180c282959cc80bc5349f8b5eeae759eb5f5c801536847
// * 44f750fab67bb9f54f5b5cc90bc34d55cff06260a3e63245856a6e57fcda5906
// * 6b095375a53dfc7994a032e2efac70f43a4fac9303d549256d88b8f7cecadd50
//
// RegExp: location
//  Remove meta information about the location
// RegExp: timestamp
//  Remove meta information about the time
// SEE:
// * 09198e90b6a14acfef0d4044606b8fd5801648f98763bf967f181aabaf59804d
// * 0a8c510c3691d8e68ccc749559680257a382fe792a3d4d8531fb285cd74c3492
//
var NEGATIVE_KEYWORD = /author|comment|related|meta|caption|share|photo|social|next|prev|location|timestamp/i;

Hardcode.prototype._removeNode = function (node) {
  if (node.attr.hasOwnProperty('class') && NEGATIVE_KEYWORD.test(node.attr['class'])) {
    return true;
  }

  if (node.attr.hasOwnProperty('id') && NEGATIVE_KEYWORD.test(node.attr.id)) {
    return true;
  }

  return false;
};
