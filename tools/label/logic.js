
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var startpoint = require('startpoint');

var analyse = require('../../lib/article.js');

var datamap = require('../../test/reallife/datamap.json');
var UNLABLED = datamap.map(function (item, index) {
  return {
    labeled: item.labeled,
    href: item.href,
    key: item.key,
    why: item.why,
    index: index
  };
}).filter(function (item) {
  return !item.labeled;
});

//
// Lots of sideeffects :)
//
var OPEN_FLAG = false;
var SKIPS = 0;
var SOURCES = {};

function Logic(ws) {
  this.ws = ws;
}
module.exports = Logic;

Logic.prototype.send = function (msg) {
  this.ws.send(JSON.stringify(msg));
};

Logic.prototype._requestLabel = function () {
  var self = this;

  if (UNLABLED.length <= SKIPS) {
    this.send({ 'what': 'done', 'data': SKIPS });
  } else {
    var item = UNLABLED[SKIPS];
    this.send({ 'what': 'label-processing', 'data': item });

    this._analyse(item, function (err, result) {
      if (err) return self.send({ 'what': 'error', 'data': err.message });

      self.send({ 'what': 'label-analysed', 'data': result });
    });
  }
};

Logic.prototype._analyse = function (item, callback) {
  request({url: item.href, jar: true}, function (err, res, body) {
    if (err) return callback(err);
    if (res.statusCode !== 200) return callback(new Error('Status code was ' + res.statusCode));
    if (body.length === 0) return callback(new Error('No body was send'));

    SOURCES[item.key] = body;
    startpoint(body).pipe(analyse(item.href, callback));
  });
};

Logic.prototype.open = function () {
  if (OPEN_FLAG === true) {
    this.send({ 'what': 'error', 'data': 'already open' });
  } else {
    OPEN_FLAG = true;
    this._requestLabel();
  }
};

Logic.prototype.close = function () {
  OPEN_FLAG = false;
};

var HANDLERS = {
  skip: function (item) {
    SKIPS += 1;
    delete SOURCES[item.key];
    this._requestLabel();
  },

  save: function (item) {
    var self = this;

    this.send({ 'what': 'label-saving' });

    async.series([
      // Save expected file
      function (done) {
        fs.writeFile(
          path.resolve(__dirname, '../../test/reallife/expected/' + item.key + '.json'),
          JSON.stringify({
            'title': item.title,
            'text': item.text
          }, null, '\t') + '\n',
          done
        );
      },

      // Save source file
      function (done) {
        fs.writeFile(
          path.resolve(__dirname, '../../test/reallife/source/' + item.key + '.html'),
          SOURCES[item.key],
          done
        );
      },

      // Save labeled flag
      function (done) {
        datamap[item.index].labeled = true;

        fs.writeFile(
          path.resolve(__dirname, '../../test/reallife/datamap.json'),
          JSON.stringify(datamap, null, '\t') + '\n',
          done
        );
      }
    ], function (err) {
      if (err) return self.send({ 'what': 'error', 'data': err.message });

      // Cleanup memory
      delete SOURCES[item.key];
      UNLABLED.splice(SKIPS, 1);

      self._requestLabel();
    });
  }
};

Logic.prototype.message = function (msg) {
  if (HANDLERS.hasOwnProperty(msg.what) === false) {
    this.send({ 'what': 'error', 'data': 'no such command' });
  } else {
    HANDLERS[msg.what].call(this, msg.data);
  }
};
