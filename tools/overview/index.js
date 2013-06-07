
var fs = require('fs');
var path = require('path');
var http = require('http');

var server = http.createServer();

server.listen(9200, '127.0.0.1', function () {
  console.log('analyse server ready on http://localhost:9200');
});

var datamap = require('../../test/reallife/datamap.json');

function stateContext(state, value) {
  var str = '';
  if (state[0] === value) str += 'Title ';
  if (state[1] === value) str += 'Text ';
  if (state[2] === value) str += 'Image ';
  return str;
}
function sumContext(sum, name) {
  var state = sum[name];
  var str = '';
  
  str += '<tr>';
  str += '<td>' + name + ':</td>';
  str += '<td>' + state[0] + '</td>';
  str += '<td>' + state[1] + '</td>';
  str += '<td>' + state[2] + '</td>';
  str += '<td>' + state[3] + '</td>';
  str += '<td>' + state[4] + '</td>';
  str += '</tr>';
  return str;
}

var stylesheet = fs.readFileSync(path.resolve(__dirname, 'style.css'));

// Just serve static files
server.on('request', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('<title>Overview</title>\n');

  res.write('<style>\n');
  res.write(stylesheet);
  res.write('</style>\n');

  res.write('<table>\n');

  res.write('\t<thead>\n');
  res.write('\t\t<tr><th>Identifier</th><th>Unknown</th><th>Wrong</th><th>Bad</th><th>Good</th><th>Perfect</th></tr>\n');  
  res.write('\t</thead>\n');
  
  var sum = {
    Title: [0,0,0,0,0],
    Text: [0,0,0,0,0],
    Image: [0,0,0,0,0]
  };

  res.write('\t<tbody>');
  datamap.forEach(function (item) {
    var state = (item.state || '0-0-0').split('-').map(Number);

    sum.Title[state[0]] += 1;
    sum.Text[state[1]] += 1;
    sum.Image[state[2]] += 1;

    res.write('\t\t<tr>');
    res.write('<td>' + item.key + '</td>');
    res.write('<td>' + stateContext(state, 0) + '</td>');
    res.write('<td>' + stateContext(state, 1) + '</td>');
    res.write('<td>' + stateContext(state, 2) + '</td>');
    res.write('<td>' + stateContext(state, 3) + '</td>');
    res.write('<td>' + stateContext(state, 4) + '</td>');
    res.write('</tr>\n');
  });
  res.write('\t</tbody>\n');

  res.write('\t<thead>\n');
  res.write('\t\t<tr><th>Identifier</th><th>Unknown</th><th>Wrong</th><th>Bad</th><th>Good</th><th>Perfect</th></tr>\n');  
  res.write('\t</thead>\n');

  res.write('\t<tfoot>\n');
  res.write('\t\t' + sumContext(sum, 'Title') + '\n');
  res.write('\t\t' + sumContext(sum, 'Text') + '\n');
  res.write('\t\t' + sumContext(sum, 'Image') + '\n');
  res.write('\t</tfoot>\n');
  
  res.write('</table>\n');
  res.end();
});
