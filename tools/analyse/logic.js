
var fs = require('fs');
var path = require('path');
var async = require('async');
var fork = require('child_process').fork;

var KEY = process.argv[2];
var ITEM = null;

var datamap = require('../../test/reallife/datamap.json');
datamap.forEach(function (item) {
  if (item.key === KEY) {
    ITEM = item;
  }
});

function Logic(ws) {
  this.ws = ws;
}
module.exports = Logic;

Logic.prototype.send = function (msg) {
  this.ws.send(JSON.stringify(msg));
};

Logic.prototype.open = function () {
  this.send({'what': 'ready', 'data': ITEM.href});
  this._sendResult();
};

Logic.prototype.close = function () { };

Logic.prototype._sendResult = function () {
    var self = this;

    async.parallel({
      actual: function (done) {
        var child = fork(path.resolve(__dirname, 'analyser'), [ITEM.key, KEY.href], {
          stdio: ['ignore', process.stdout, process.stderr, 'ipc']
        });

        child.once('message', function (result) {
          if (result[0]) {
            var err = new Error(result[0].message);
                err.stack = result[0].stack;
            return done(err);
          } else {
            done(null, result[1]);
          }
        });
      },
      expected: function (done) {
        fs.readFile(
          path.resolve(__dirname, '../../test/reallife/expected/' + ITEM.key + '.json'),
          function (err, expected) {
            if (err) return done(err);
            else done(null, JSON.parse(expected));
          }
        );
      }
    }, function (err, compare) {
      if (err) return self.send({ 'what': 'error', 'data': err.message });
      
      self.send({'what': 'compare', 'data': compare});
    });
};

var HANDLERS = {
  refresh: function () {
    this._sendResult();
  },
};

Logic.prototype.message = function (msg) {
  if (HANDLERS.hasOwnProperty(msg.what) === false) {
    this.send({ 'what': 'error', 'data': 'no such command' });
  } else {
    HANDLERS[msg.what].call(this, msg.data);
  }
};
