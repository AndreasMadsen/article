
var fs = require('fs');
var path = require('path');
var async = require('async');
var fork = require('child_process').fork;

var datamap = require('../../test/reallife/datamap.json');

// Create a items list based on process.argv
var ITEMS = (function () {
  if (process.argv[2] === undefined) {
    return datamap;
  } else {
    var argv = process.argv.slice(2);
    var items = datamap.filter(function (item) {
      var index = argv.indexOf(item.key);
      if (index !== -1) {
        argv.splice(index, 1);
        return true;
      }
      return false;
    });

    if (argv.length !== 0) {
      throw new Error('Could not find ' + JSON.stringify(argv));
    }

    return items;
  }
})();

ITEMS = ITEMS.map(function (item, index) {
  item.index = index;
  return item;
});

var LASTINDEX = 0;

function Logic(ws) {
  this.ws = ws;
}
module.exports = Logic;

Logic.prototype.send = function (msg) {
  this.ws.send(JSON.stringify(msg));
};

Logic.prototype.open = function () {
  this.send({
    'what': 'ready',
    'data': ITEMS.length
  });

  this._sendResult(LASTINDEX);
};

Logic.prototype.close = function () { };

Logic.prototype._sendResult = function (index) {
    LASTINDEX = index;
    var self = this;

    async.parallel({
      actual: function (done) {
        var child = fork(path.resolve(__dirname, 'analyser'), [ITEMS[index].key, ITEMS[index].href], {
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
          path.resolve(__dirname, '../../test/reallife/expected/' + ITEMS[index].key + '.json'),
          function (err, expected) {
            if (err) return done(err);
            else done(null, JSON.parse(expected));
          }
        );
      }
    }, function (err, compare) {
      if (err) return self.send({ 'what': 'error', 'data': err.message });
      
      self.send({'what': 'compare', 'data': {
        'item': ITEMS[index],
        'compare': compare
      }});
    });
};

var HANDLERS = {
  load: function (index) {
    this._sendResult(index);
  },
};

Logic.prototype.message = function (msg) {
  if (HANDLERS.hasOwnProperty(msg.what) === false) {
    this.send({ 'what': 'error', 'data': 'no such command' });
  } else {
    HANDLERS[msg.what].call(this, msg.data);
  }
};
