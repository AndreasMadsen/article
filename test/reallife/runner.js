
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
      if (key2url.hasOwnProperty(key) === false) {
        return callback(new Error(key + ' is not in the datamap'));
      }

      startpoint(content)
        .pipe(article(key2url[key], function (err) {
          // Since the result is rarely perfect just make sure no error
          // occurred. The quality of the result can be judged by using
          // the analyser tool.
          callback(err, require('./expected/' + key + '.json'));
        }));
    }
});
