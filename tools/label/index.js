
var st = require('st');
var path = require('path');
var http = require('http');
var WebSocketServer = require('ws').Server;

var Logic = require('./logic.js');

var server = http.createServer();
var wss = new WebSocketServer({server: server});

server.listen(9000, '127.0.0.1', function () {
  console.log('label server ready on http://localhost:9000');
});

// Just serve static files
server.on('request', st({
  path: path.resolve(__dirname, 'static'),
  url: '/',
  index: 'index.html',
  passthrough: false
}));

// Handle the UI communation
wss.on('connection', function (ws) {
  function send(msg) { ws.send(JSON.stringify(msg)); }
  
  var handler = new Logic(ws);

  handler.open();

  ws.once('close', function () {
    handler.close();
  });

  ws.on('message', function (msg) {
    handler.message(JSON.parse(msg));
  });
});
