
// Find all releveant elements
var iframe = document.querySelector('iframe');

var labelTitle = document.querySelector('#label-title');
var labelImage = document.querySelector('#label-image');
var labelText = document.querySelector('textarea');

var statusDiv = document.querySelector('#status');

var buttonSave = document.querySelector('#save');
var buttonSkip = document.querySelector('#skip');

// Create connection
var socket = new WebSocket("ws://" + window.location.hostname + ':' + 9000);

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

var currentItem = null;
var canSave = false;

var HANDLERS = {
  'done': function (skips) {
    status(false, 'Done, skiped ' + skips + ' label requests');

    labelTitle.value = '';
    labelImage.value = '';
    labelText.value = '';
    iframe.src = 'about:blank';
  },

  'error': function (message) {
    status(true, message);
  },

  'label-processing': function (item) {
    status(false, 'Analysing data ... <br> ' + item.href);

    labelTitle.value = '';
    labelImage.value = '';
    labelText.value = '';

    currentItem = item;
    iframe.src = item.href;
  },
  
  'label-analysed': function (analyse) {
    status(false, 'Please vertify this! <br> ' + currentItem.href);

    labelTitle.value = analyse.title;
    labelImage.value = analyse.image;
    labelText.value = analyse.text;
    
    canSave = true;
  },
  
  'label-saving': function () {
    status(false, 'Saving data ...');
  }
};

buttonSave.addEventListener('click', function () {
  if (canSave === false) return;
  canSave = false;
  
  currentItem.text = labelText.value;
  currentItem.title = labelTitle.value;
  currentItem.image = labelImage.value;

  send({ 'what': 'save', 'data': currentItem });
});

buttonSkip.addEventListener('click', function () {
  if (canSave === false) return;
  canSave = false;
  
  send({ 'what': 'skip', 'data': currentItem });
});
