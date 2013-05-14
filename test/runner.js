
var path = require('path');
var endpoint = require('endpoint');
var startpoint = require('startpoint');
var interpreted = require('interpreted');
var article = require('../article.js');

interpreted({
    source: path.resolve(__dirname, 'source'),
    expected: path.resolve(__dirname, 'expected'),

    run: ['1'],

    test: function(name, content, callback) {
        startpoint(content)
          .pipe(article('http://runner.test/'))
          .pipe(endpoint({objectMode: true}, callback));
    }
});
