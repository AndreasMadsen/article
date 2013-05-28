
// Find all releveant elements
var diffTitle = document.querySelector('#diff-title');
var diffImage = document.querySelector('#diff-image');
var diffText = document.querySelector('#diff-text');

var statusDiv = document.querySelector('#status');

var buttonRefresh = document.querySelector('#refresh');
var buttonOpen = document.querySelector('#open');

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

var canRefresh = false;
var dmp = new diff_match_patch();
    dmp.Diff_EditCost = 4;

function diff(a, b) {
  return dmp.diff_prettyHtml( dmp.diff_main(a, b) );
}

var HANDLERS = {
  'ready': function (link) {
    status(false, 'Comparing ...');
    buttonOpen.href = link;
  },
  
  'compare': function (compare) {
    status(false, 'Compared result');
    canRefresh = true;

    diffTitle.innerHTML = diff(compare.actual.title || '', compare.expected.title || '');
    diffImage.innerHTML = diff(compare.actual.image || '', compare.expected.image || '');
    diffText.innerHTML = diff(compare.actual.text || '', compare.expected.text || '');
  },

  'error': function (message) {
    status(true, message);
  },
};

buttonRefresh.addEventListener('click', function () {
  if (canRefresh === false) return;
  canRefresh = true;

  status(false, 'Comparing ...');
  send({ 'what': 'refresh' });
});
