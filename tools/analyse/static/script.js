
// Find all releveant elements
var diffTitle = document.querySelector('#diff-title');
var diffImage = document.querySelector('#diff-image');
var diffText = document.querySelector('#diff-text');

var identifier = document.querySelector('#identifier');
var statusDiv = document.querySelector('#status');

var buttonRefresh = document.querySelector('#refresh');
var buttonOpen = document.querySelector('#open');
var buttonLeft = document.querySelector('#left');
var buttonRight = document.querySelector('#right');

// Create connection
var socket = new WebSocket("ws://" + window.location.hostname + ':' + 9100);

socket.addEventListener("message", function (msg) {
  msg = JSON.parse(msg.data);
  
  HANDLERS[msg.what].call(null, msg.data);
});

function status(boolean, text) {
  statusDiv.style.borderColor = boolean ? 'tomato' : 'steelblue';
  statusDiv.innerHTML = text;
}

function send(msg) {
  socket.send(JSON.stringify(msg));
}

var canClick = false;
var dmp = new diff_match_patch();
    dmp.Diff_EditCost = 4;

function diff(a, b) {
  return dmp.diff_prettyHtml( dmp.diff_main(a, b) );
}

var TOTAL = 0;
var INDEX = 0;

var HANDLERS = {
  'ready': function (total) {
    status(false, 'Comparing ...');
    TOTAL = total;
  },

  'compare': function (data) {
    var item = data.item;
    var compare = data.compare;
    status(false, 'Compared result');
    canClick = true;

    identifier.innerHTML = item.key;
    buttonOpen.href = item.href;
    INDEX = item.index;

    diffTitle.innerHTML = diff(compare.actual.title || '', compare.expected.title || '');
    diffImage.innerHTML = diff(compare.actual.image || '', compare.expected.image || '');
    diffText.innerHTML = diff(compare.actual.text || '', compare.expected.text || '');

    buttonLeft.style.visibility = (INDEX !== 0) ? 'visible' : 'hidden';
    buttonRight.style.visibility = (INDEX !== (TOTAL - 1)) ? 'visible' : 'hidden';
  },

  'error': function (message) {
    status(true, message);
  },
};

buttonRefresh.addEventListener('click', function () {
  if (canClick === false) return;
  canClick = true;

  status(false, 'Comparing ...');
  send({ 'what': 'load', 'data': INDEX });
});

buttonLeft.addEventListener('click', function () {
  if (canClick === false) return;
  canClick = true;

  status(false, 'Comparing ...');
  send({ 'what': 'load', 'data': INDEX - 1 });
});

buttonRight.addEventListener('click', function () {
  if (canClick === false) return;
  canClick = true;

  status(false, 'Comparing ...');
  send({ 'what': 'load', 'data': INDEX + 1 });
});
