
var domHelpers = require('../helpers-dom.js');

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
// RegExp: comment|reply
//  Remove comments
// RegExp: related|mostpopular
//  Remove links there don't have something to do with this article
// RegExp: next|prev
//  Remove next and prev links since that is not currently supported
// RegExp: share|social|follow|subscribe
//  Remove social network buttons
// RegExp: photo|caption|slide
//  Remove photo descriptions
// SEE:
// * 5bc9df3a36efb57a22edf862cec6a28eb112e535559c194d7976fb664c922c13
// * 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3b21e15fbf3161d
// * 5a012f66c2bf0c70a0744c7483478aaa0c1a2b5b5920a72223f3a090e39df8be
// * 488a0b7fa8bc2e0d799ac1dcb22620654777c66a9260983f369d842210f5d3d4
// * fe32bd9876a32fd93d180c282959cc80bc5349f8b5eeae759eb5f5c801536847
// * 44f750fab67bb9f54f5b5cc90bc34d55cff06260a3e63245856a6e57fcda5906
// * 6b095375a53dfc7994a032e2efac70f43a4fac9303d549256d88b8f7cecadd50
// * f0ad1615c376d042a458dd4fc713b0d17124d74ae07becaab78bfb7a82dd14b4
//
// RegExp: location
//  Remove meta information about the location
// RegExp: timestamp
//  Remove meta information about the time
// RegExp: description
//  REmove meta data about some image description
// SEE:
// * 09198e90b6a14acfef0d4044606b8fd5801648f98763bf967f181aabaf59804d
// * 0a8c510c3691d8e68ccc749559680257a382fe792a3d4d8531fb285cd74c3492
// * 0e55dcdbeb54c88ee87942b9fef7ea5398fa9a1e83493d55844b479506a80fd8
//
// RegExp: flash
//  Remove elements shouldn't contain any text information
//
// RegExp: advertisement
//  Remove advertisement containers
// SEE:
// * ccada6580a0b1d05408db6d59cca18c2707530139807ebf112de8f6615d32b90
//
// RegExp: nav
//  Remove menus
// SEE:
// * ccada6580a0b1d05408db6d59cca18c2707530139807ebf112de8f6615d32b90
//
// RegExp: login
//  Remove login containers
// SEE:
// * ccada6580a0b1d05408db6d59cca18c2707530139807ebf112de8f6615d32b90
//
// RegExp: nocontent
// SEE: 8d612a03fa42a2fb014b59534c46c9590da90fbeb91ac50938cdfa36dd274e23
//
// RegExp: footer|cookies|email|account|promo
// SEE: ccada6580a0b1d05408db6d59cca18c2707530139807ebf112de8f6615d32b90
//
// RegExp: mmw
// SEE: 26c3b98f33bb6902f32535235fd7d32792df87779bdf1f86c3b21e15fbf3161d
//
var NEGATIVE_KEYWORD = /author|comment|related|meta|caption|share|photo|social|next|prev|location|timestamp|mostpopular|flash|advertisement|nav|login|subscribe|slide|reply|nocontent|follow|footer|email|account|promo|cookies|mmw/i;
var NEGATIVE_CLASSNAME = /(^| )(hidden)( |$)/
Hardcode.prototype._removeNode = function (node) {
  if (node.attr.hasOwnProperty('class') && NEGATIVE_KEYWORD.test(node.attr['class'])) {
    return true;
  }

  if (node.attr.hasOwnProperty('id') && NEGATIVE_KEYWORD.test(node.attr.id)) {
    return true;
  }

  if (node.attr.hasOwnProperty('class') && NEGATIVE_CLASSNAME.test(node.attr['class'])) {
    return true;
  }

  if (domHelpers.NO_TEXT_ELEMENTS.hasOwnProperty(node.tagname)) {
    return true;
  }

  if (domHelpers.IGNORE_TEXT_ELEMENT.hasOwnProperty(node.tagname)) {
    return true;
  }

  return false;
};
