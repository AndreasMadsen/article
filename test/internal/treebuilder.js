
var util = require('util');
var test = require('tap').test;
var startpoint = require('startpoint');

var TreeBuilder = require('../../lib/treebuilder.js');

//
// Simple Tree Constructor
//
function Tree(handlers) {
  TreeBuilder.call(this);
  
  this._element = handlers.element;
  this._end = handlers.end;
}
util.inherits(Tree, TreeBuilder);

test('handlers emits in order', function (t) {
  function validateTree(node, expected, parent) {
    parent = parent || null;

    t.equal(node.type, expected.type);
    t.equal(node.position, expected.position);
    t.equal(node.density, expected.density);
    t.equal(node.tagname, expected.tagname);
    t.deepEqual(node.attr, expected.attr);
    t.equal(node.text, expected.text);

    t.equal(node.parent, parent);
    
    if (Array.isArray(expected.children)) {
      t.equal(node.children.length, expected.children.length);

      if (node.children.length === expected.children.length) {
        for (var i = 0, l = expected.children.length; i < l; i++) {
          validateTree(node.children[i], expected.children[i], node);
        }
      }
    } else {
      t.equal(node.children, expected.children);
    }
  }

  var order = [];

  var builder = new Tree({
    element: function (node) {
      order.push(node);
    },
    end: function () {
      var root = builder._tree;

      // Check root properties
      validateTree(root, {
        type: 'root',
        position: 0,
        density: 3.125,

        children: [
          {
            type: 'element',
            tagname: 'h1',
            attr: { id: '1' },
            position: 1,
            density: 6.5,

            children: [
              {
                type: 'text',
                position: 2,
                density: 5,
                text: 'Main ',
                children: null
              },
              {
                type: 'element',
                tagname: 'br',
                attr: { id: '2' },
                position: 3,
                density: 0,

                children: []
              },
              {
                type: 'text',
                position: 4,
                density: 8,
                text: ' & Title',
                children: null
              }
            ]
          },
          
          // Sibling to <h1>
          {
            type: 'element',
            tagname: 'div',
            attr: { id: '3' },
            position: 5,
            density: 4,
            
            children: [
              {
                type: 'text',
                position: 6,
                density: 7,
                text: ' Hallo ',
                children: null
              },
              {
                type: 'element',
                tagname: 'br',
                attr: { id: '4' },
                position: 7,
                density: 0,
                
                children: []
              },
              {
                type: 'element',
                tagname: 'strong',
                attr: { id: '5' },
                position: 8,
                density: 5,
                
                children: [
                  {
                    type: 'text',
                    position: 9,
                    density: 5,
                    text: 'World',
                    children: null
                  }
                ]
              }
            ]
            // div element ends
          },
          {
            type: 'element',
            tagname: 'script',
            attr: { },
            position: 10,
            density: 0,
            
            children: [
              {
                type: 'text',
                position: 11,
                density: 42,
                text: '/* some crazy code we do not care about */',
                children: null
              }
            ]
          },
          {
            type: 'element',
            tagname: 'style',
            attr: { },
            position: 12,
            density: 0,
            
            children: [
              {
                type: 'text',
                position: 13,
                density: 42,
                text: '/* some crazy code we do not care about */',
                children: null
              }
            ]
          },
          {
            type: 'element',
            tagname: 'div',
            attr: { },
            position: 14,
            density: 0,

            children: []
          }
        ]
        // root node ends
      });
      
      // Done testing
      t.end();
    }
  });

  startpoint(
    '<h1 id="1">Main <br id="2"> &amp; Title</h1>\n' +
    '<div id="3">\n' +
      'Hallo\n' +
      '<br id="4">\n' +
      '<strong id="5">World</strong>\n' +
    '</div>\n' +
    '<script>/* some crazy code we do not care about */</script>\n' +
    '<style>/* some crazy code we do not care about */</style>\n' +
    '<div></div>'
  ).pipe(builder);
});
