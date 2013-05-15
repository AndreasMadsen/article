
var path = require('path');
var startpoint = require('startpoint');
var interpreted = require('interpreted');

var article = require('../../lib/article.js');
var datamap = require('./datamap.json');

var key2url = {};
for (var i = 0, l = datamap.length; i < l; i++) {
  key2url[datamap[i].key] = datamap[i].href;
}

interpreted({
    source: path.resolve(__dirname, 'source'),
    expected: path.resolve(__dirname, 'expected'),
  
    test: function(key, content, callback) {
        startpoint(content)
          .pipe(article(key2url[key], callback));
    }
});
