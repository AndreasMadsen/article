
var spawn = require('child_process').spawn;
var inspector = require('inspector');
var readline = require('readline');
var async = require('async');
var path = require('path');
var fs = require('fs');

var datamap = require('./reallife/datamap.json');
var unlabled = datamap.map(function (item, index) {
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

// Startup
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var browser = new Browser(function () {
  async.eachSeries(unlabled, labelInterface, function () {
    console.log('');
    console.log('--------------------');
    console.log('Labeled all files');
    rl.close();
    browser.close();
  });
});

//
// Label interface
//
function labelInterface(item, done) {
  console.log('');
  console.log('--------------------');
  console.log('opening: ' + item.href);
  console.log('');
  browser.navigate(item.href, function (err) {
    if (err) return done(err);
    
    rl.question('What is the title? ', function (ansewer) {

      // Set labeled falg
      datamap[item.index].labeled = true;

      fs.writeFile(
        path.resolve(__dirname, 'reallife', 'datamap.json'),
        JSON.stringify(datamap, null, '\t') + '\n',
        function (err) {
          if (err) return done(err);

          fs.writeFile(
            path.resolve(__dirname, 'reallife', 'expected', item.key + '.json'),
            JSON.stringify({
              'title': ansewer
            }, null, '\t') + '\n',
            done
          );
        }
      );
    });
  });
}

//
// Simple browser object
//
function Browser(callback) {
  var chromium = 'google-chrome';
  if (require('os').platform() === 'darwin') {
      chromium = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  // spawn a chromium process
  this.process = spawn(chromium, [
    'about:blank',
    '--remote-debugging-port=12578'
  ]);
    
  this.inspector = inspector(12578, '127.0.0.1', 'about:blank');
  this.inspector.once('connect', callback);
}

Browser.prototype.navigate = function (href, callback) {
  this.inspector.Page.navigate(href, callback);
};

Browser.prototype.close = function () {
  var self = this;

  this.inspector.close();
  this.inspector.once('close', function () {
    self.process.kill();
  });
};
