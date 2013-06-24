
var nodes = require('../nodes.js');
var domHelpers = require('../helpers-dom.js');

//
// Mutate the DOM of the best text container so only the article text is left
//
function Subtree(node) {
  this.node = node;
}
module.exports = Subtree;

Subtree.prototype._findImages = function (node) {
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
  })(node);

  return images;
};

// This method reduces the tree so only the important elements are left
Subtree.prototype.reduceTree = function () {
  var self = this;

  var masterfragment = (function recursive(node) {
    var fragment = new nodes.FragmentNode(node);
    var subfragment = null;
    var subtext = null;
    var subnode = null;
    var closetext = null;

    for (var i = 0, l = node.children.length; i < l; i++) {
      subnode = node.children[i];
      closetext = false;

      // Append TextNode subnodes
      if (subnode.type === 'text') {
        if (subtext) {
          subtext.append(subnode);
        } else {
          fragment.append(subnode);
          subtext = subnode;
        }
      }
      // Append ElementNode subnodes there contain something and reduce it
      // recursively
      else if (subnode.textLength !== 0) {
        subfragment = recursive(subnode);
        subfragment.assign(subnode);

        fragment.append(subnode);
        closetext = true;
      }
      // Always add br elements
      else if (subnode.tagname === 'br') {
        fragment.append(subnode);
        closetext = true;
      }
      // Always add images and objects (they can be the article image)
      else if (subnode.tagname === 'img' || subnode.tagname === 'object') {
        fragment.append(subnode);
        closetext = true;
      }
      // Search for images and append them, also replace empty blocks with br tags
      else {
        var images = self._findImages(subnode);
        for (var n = 0, r = images.length; n < r; n++) {
          fragment.append(images[n]);
        }

        // Replace empty block elements with two br tags if no images where found
        if (images.length === 0 && domHelpers.BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname)) {
          fragment.append(new nodes.ElementNode(node, 'br', {}));
          fragment.append(new nodes.ElementNode(node, 'br', {}));
        }

        if (images.length > 0 || domHelpers.BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname)) {
          closetext = true;
        }
      }

      if (closetext && subtext !== null) {
        subtext.close();
        subtext = null;
      }
    }
    fragment.close();

    // If the last node is a TextNode close it properly
    if (subnode.type !== 'text' && subtext !== null) {
      subtext.close();
      subtext = null;
    }

    // If only one child was found and that resulted in a subfragment then
    // use that subfragment instead.
   if (fragment.children.length === 1 && subfragment) {
      fragment = subfragment;
    }

    return fragment;
  })(this.node);

  masterfragment.assign(this.node);
};

// Grap and create container nodes
Subtree.prototype.containerNodes = function () {
  var containers = [this.node];

  (function recursive(node) {
    var fragment = new nodes.FragmentNode(node);
    for (var i = 0, l = node.children.length; i < l; i++) {
      var subnode = node.children[i];

      if (subnode.type === 'text' ||
          domHelpers.BLOCK_ELEMENTS.hasOwnProperty(subnode.tagname) === false) {
        fragment.append(subnode);
      } else {
        if (fragment.children.length > 0) {
          fragment.close();

          // Use the fragment as a container if it contains more than one node
          if (fragment.children.length === 1) {
            containers.push(fragment.children[0]);
          } else {
            containers.push(fragment);
          }

          fragment = new nodes.FragmentNode();
        }

        containers.push(subnode);
        recursive(subnode);
      }
    }

    // If the last fragment has children and it don't contain all of them
    // then append this fragment too.
    if (fragment.children.length > 0 &&
        fragment.children.length !== node.children.length) {
      fragment.close();

      // Use the fragment as a container if it contains more than one node
      if (fragment.children.length === 1) {
        containers.push(fragment.children[0]);
      } else {
        containers.push(fragment);
      }
    }
  })(this.node);

  return containers;
};
