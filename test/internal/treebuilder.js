
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
        density: 25/6,

        children: [
          {
            type: 'element',
            tagname: 'h1',
            attr: { id: '1' },
            position: 1,
            density: 13,

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
            density: 6,
            
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

test('handlers manages microdata', function (t) {
  function validateTree(node, expected, parent) {
    parent = parent || null;

    t.equal(node.parent, parent);

    t.equal(node.type, expected.type);
    t.deepEqual(node.keys, expected.hasOwnProperty('keys') ? expected.keys : null);
    t.equal(node.value, expected.hasOwnProperty('value') ? expected.value : null);
    t.equal(node.scope, expected.hasOwnProperty('scope') ? expected.scope : null);
    
    var i, l, p, r;
    
    if (expected.hasOwnProperty('scopes')) {
      var scopes = Object.keys(node.scopes);
      t.deepEqual(scopes, Object.keys(expected.scopes));

      for (i = 0, l = scopes.length; i < l; i++) {
        t.equal(node.scopes[scopes[i]].length, expected.scopes[scopes[i]].length);

        for (p = 0, r = node.scopes[scopes[i]].length; p < r; p++) {
          validateTree(
            node.scopes[scopes[i]][p],
            expected.scopes[scopes[i]][p],
            node.scopes[scopes[i]][p].parent // skip parent test
          );
        }
      }
    } else {
      t.equal(node.scopes, null);
    }

    if (expected.hasOwnProperty('properties')) {
      var properties = Object.keys(node.properties);
      t.deepEqual(properties, Object.keys(expected.properties));

      for (i = 0, l = properties.length; i < l; i++) {
        t.equal(node.properties[properties[i]].length, expected.properties[properties[i]].length);

        for (p = 0, r = node.properties[properties[i]].length; p < r; p++) {
          validateTree(
            node.properties[properties[i]][p],
            expected.properties[properties[i]][p],
            node
          );
        }
      }
    } else {
      t.equal(node.properties, null);
    }
  }

  var builder = new Tree({
    element: function (node) { },
    end: function () {
      validateTree(builder._tree.micro, {
        type: 'root',
        parent: null,

        properties: {},

        scopes: {
          'http://data-vocabulary.org/Event': [{
            type: 'scope',
            scope: 'http://data-vocabulary.org/Event',
            keys: false,

            properties: {
              url: [{
                type: 'item',
                keys: ['url'],
                value: 'http://example.test'
              }],
              summary: [{
                type: 'item',
                keys: ['summary'],
                value: 'Main summary'
              }],
              photo: [{
                type: 'item',
                keys: ['photo'],
                value: '/picture.jpg'
              }],
              description: [{
                type: 'item',
                keys: ['description'],
                value: 'Crazy description'
              }],
              startDate: [{
                type: 'item',
                keys: ['startDate'],
                value: '2010-06-13'
              }],
              location: [{
                type: 'scope',
                scope: 'http://data-vocabulary.org/Organization',
                keys: ['location'],

                properties: {
                  name: [{
                    type: 'item',
                    keys: ['name'],
                    value: 'Here'
                  }]
                }
              }]
            }
          }],
          'http://data-vocabulary.org/Organization': [{
            type: 'scope',
            scope: 'http://data-vocabulary.org/Organization',
            keys: ['location'],

            properties: {
              name: [{
                type: 'item',
                keys: ['name'],
                value: 'Here'
              }]
            }
          }]
        }
      });

      t.equal(builder._tree.micro.node, builder._tree);
      t.end();
    }
  });

  startpoint(
    '<div itemscope itemtype="http://data-vocabulary.org/Event">\n' +
    '  <a href="http://example.test" itemprop="url">\n' +
    '    <span itemprop="summary">Main summary</span>\n' +
    '  </a>\n' +
    '  <img itemprop="photo" src="/picture.jpg">\n' +
    '  <span itemprop="description">Crazy description</span>\n' +
    '  <time itemprop="startDate" datetime="2010-06-13">June 13th, 2010</time>\n' +
    '  <span itemprop="location" itemscope itemtype="http://data-vocabulary.org/Organization">\n' +
    '    <span itemprop="name">Here</span>\n' +
    '  </span>\n' +
    '</div>'
  ).pipe(builder);
});
