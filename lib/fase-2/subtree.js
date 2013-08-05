
var nodes = require('../nodes.js');
var domHelpers = require('../helpers-dom.js');

//
// Mutate the DOM of the best text container so only the article text is left
//
function Subtree(node) {
  this.top = node;
}
module.exports = Subtree;

Subtree.prototype.findImages = function () {
  var images = [];

  (function recursive(node) {
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];
      if (subnode.type === 'text') continue;

      if (subnode.tagname === 'img' || subnode.tagname === 'object') {
        images.push(subnode);
      } else {
        recursive(subnode);
      }
    }
  })(this.top);

  return images;
};

Subtree.prototype.findTextNodes = function () {
  var nodes = [];

  (function recursive(node) {
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];

      if (subnode.type === 'text') {
        nodes.push(subnode);
      } else {
        recursive(subnode);
      }
    }
  })(this.top);

  return nodes;
};

Subtree.prototype.surroundingBrElems = function (node) {
  var beforeCount = 0;
  var beforeElem = node;
  while((beforeElem = beforeElem.before()) &&
        beforeElem.type === 'element' && beforeElem.tagname === 'br') {
    beforeCount += 1;
  }

  var afterCount = 0;
  var afterElem = node;
  while((afterElem = afterElem.after()) &&
        afterElem.type === 'element' && afterElem.tagname === 'br') {
    afterCount += 1;
  }

  return beforeCount + afterCount;
};

Subtree.prototype.surroundingBlockElem = function (node) {
  var before, beforeNode = node;
  while (before = beforeNode.before()) {
    if (before.type === 'element' &&
        domHelpers.BLOCK_ELEMENTS.hasOwnProperty(before.tagname)) {
      return true;
    }

    if (before !== beforeNode.parent) break;
    beforeNode = before;
  }

  var after, afterNode = node;
  while (after = afterNode.before()) {

    if (after.type === 'element' &&
        domHelpers.BLOCK_ELEMENTS.hasOwnProperty(after.tagname)) {
      return true;
    }

    if (after !== afterNode.parent) break;
    afterNode = after;
  }

  return false;
};

function hasTextChild(node) {
  for (var i = 0, l = node.children.length; i < l; i++) {
    if (node.children[i].type === 'text') return true;
  }
  return false;
}

// This method reduces the tree so only the important elements are left
Subtree.prototype.reduceTree = function () {
  var self = this;

  if (this.top.children.length === 0) return;

  (function recursive(node) {
    // Skip element if its already removed
    if (node.inTree === false) { }

    // Cleanup text nodes
    else if (node.type === 'text') {
      // Remove empty text nodes
      if (node.getText().trim() === '') {
        node.remove();
      }
      else {
        var afterNode = node.after();
        if (afterNode.type === 'text') {
          node.append(afterNode);
          node.close();
          afterNode.remove();
        }
      }
    }
    // Cleanup elements
    else if (node.type === 'element') {
      var children = node.children.slice(0);
      for (var i = 0, l = children.length; i < l; i++) {
        recursive(children[i]);
      }

      // move <img> and <object> nodes to the nearest block container
      if (node.tagname === 'img' || node.tagname === 'object') {
        var destination = node;
        while (destination = destination.parent) {
          if (destination === self.top || (
              domHelpers.BLOCK_ELEMENTS.hasOwnProperty(destination.tagname) &&
              hasTextChild(destination) === false)
          ) {
            break;
          }
        }

        if (destination !== node.parent) {
          node.remove();
          destination.insert(node, 0);
        }
      }
      // Reduce <br> tags to the level there matters
      else if (node.tagname === 'br') {
        // Remove this br tag if there are enoght <br> tags or there is a
        // surrounding block element
        if (self.surroundingBrElems(node) >= 2 || self.surroundingBlockElem(node)) {
          node.remove();
        }
      }
      // elements with no children, can most likely just be removed or replaced
      else if (node.children.length === 0) {
        // Replace empty block elements with br tags
        if (domHelpers.BLOCK_ELEMENTS.hasOwnProperty(node.tagname)) {
          // Figure how many br tags there should be created and create them
          if (self.surroundingBlockElem(node) === false) {
            var brs = Math.max(0, 2 - self.surroundingBrElems(node));
            var index = node.parent.children.indexOf(node);
            for (var b = 0; b < brs; b++) {
              var br = new nodes.ElementNode(node.parent, 'br', {});
                  br.close();
              node.parent.children.splice(index, 0, br);
            }
          }
        }
        // Concat textnodes if possible
        else {
          var before = node.before();
          var after = node.after();
          if (before.type === 'text' && after.type === 'text') {
            before.append(after);
            before.close();
            after.remove();
          }
        }

        // Now remove the node, there don't contain anything
        node.remove();
      }
      // If this is an style element with only a text node as a child
      else if (domHelpers.INLINE_TEXT_TAGS.hasOwnProperty(node.tagname) &&
               node.children.length === 1 && node.children[0].type === 'text') {
        var textnode = node.children[0];
        var mergenode = null;

        var before = node.before();
        var after = node.after();

        // Find or create the text node that the child should be merge intro
        if (before.type === 'text') {
          mergenode = before;
        } else if (after.type === 'text') {
          mergenode = new nodes.TextNode(node.parent, '');
          var mergeInsert = node.parent.children.indexOf(after);
          node.parent.children.splice(mergeInsert, 0, mergenode);
        }

        // If a mergenode was found, append the textnode and if possible the
        // after node too.
        if (mergenode !== null) {
          mergenode.append(textnode);
          node.remove();

          if (after.type === 'text') {
            mergenode.append(after);
            after.remove();
          }

          mergenode.close();
        }
      }
    }
  })(this.top);
};

// Grap and create container nodes
Subtree.prototype.containerNodes = function () {
  var containers = [];

  (function recursive(node) {
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];

      if ((subnode.blocky === false ||
          (subnode.blocky === true && subnode.blockyChildren === false)) &&
          subnode.density !== 0) {
        containers.push(subnode);
      } else {
        recursive(subnode);
      }
    }
  })(this.top);

  return containers;
};

//
// A secret little gem, you can use to print out the subtree :)
//
function attrStringify(attr) {
  var names = Object.keys(attr);
  var str = '';
  for (var i = 0, l = names.length; i < l; i++) {
    str += names[i] + '="' + attr[names[i]].slice(0, 20) + (attr[names[i]].length > 20 ? '...' : '') + '" ';
  }
  return str;
}

Subtree.prototype.print = function () {
  var printout = '';
  var containers = this.containerNodes();

  (function recursive(indent, node) {
    var blocky = containers.indexOf(node) !== -1;

    printout += indent + (blocky ? '\x1B[33m' : '');
    printout += node.print();
    printout += '\n' + (blocky ? '\x1B[39m' : '');

    if (node.type === 'element') {
      for (var i = 0, l = node.children.length; i < l; i++) {
        recursive(indent + '  ', node.children[i]);
      }
    }
  })('', this.top);

  return printout;
};

