
var ttest = require('ttest');
var summary = require('summary');

function Commonality(top) {
  this._top = top;

  this.nodelist = null;
}
module.exports = Commonality;

function attrStringify(attr) {
  var names = Object.keys(attr);
  var str = '';
  for (var i = 0, l = names.length; i < l; i++) {
    str += names[i] + '="' + attr[names[i]].slice(0, 20) + (attr[names[i]].length > 20 ? '...' : '') + '" ';
  }
  return str;
}

Commonality.prototype.collect = function (nodelist) {
  this.parent = new FeatureSummary();
  this.node = new FeatureSummary();

  this.nodelist = nodelist;

  for (var i = 0, l = nodelist.length; i < l; i++) {
    this.node.collect(nodelist[i]);
  
    var parent = nodelist[i];
    while(parent !== this._top && (parent = parent.parent)) {
      this.parent.collect(parent);
    }
  }
};

var ttest_options = {
  alpha: 0.025,
  alternative: "greater"
};

Commonality.prototype.tagnameReducer = function () {
  var names = Object.keys(this.node.tagname);

  // Find the tagname collection there quickly assumed to have the
  // highest density mean
  var maxmean = 0;
  var maxtagname = null;
  for (var i = 0, l = names.length; i < l; i++) {
    var mean = summary(this.node.tagname[names[i]]).mean();
    if (mean > maxmean) {
      maxtagname = names[i];
      maxmean = mean;
    }
  }
  var maxdataset = this.node.tagname[maxtagname];

  for (var n = 0, r = names.length; n < r; n++) {
    if (names[n] == maxtagname) continue;

    // If there is only two values then there is not enogth data to perfrom
    // a statical valid analysis, but if maxmean is 25% greater than the
    // alternative it should be good enogth
    if (maxdataset.length + this.node.tagname[names[n]].length === 2) {

      if (maxmean > summary(this.node.tagname[names[n]]).mean() * 1.25) {
        for (var p = 0, t = this.nodelist.length; p < t; p++) {
          if (this.nodelist[p].tagname === names[n]) {
            this.nodelist[p].remove();
            break;
          }
        }
      }
    }
    
    // Check if the maxdataset mean is greater than the current tagname
    else if (ttest(maxdataset, this.node.tagname[names[n]], ttest_options).valid() === false) {
      for (var p = 0, t = this.nodelist.length; p < t; p++) {
        if (this.nodelist[p].tagname === names[n]) {
          this.nodelist[p].remove();
        }
      }
    }
  }
};

//
// Collects features and bind them to the node density
//
function FeatureSummary() {
  this.type = {
    'element': [],
    'text': []
  };
  this.tagname = {
    // $tagname : [$density]
  };
  this.attribute = {
    // $attrname: { $value: [$density] }
  };
}

FeatureSummary.prototype._appendAttribute = function (attrobject, attrvalue, node) {
  if (attrobject.hasOwnProperty( attrvalue )) {
    attrobject[ attrvalue ].push(node.density);
  } else {
    attrobject[ attrvalue ] = [node.density];
  }
};

FeatureSummary.prototype.collect = function (node) {
  this.type[node.type].push(node.density);  

  if (node.type === 'element') {
    if (this.tagname.hasOwnProperty(node.tagname)) {
      this.tagname[node.tagname].push(node.density);
    } else {
      this.tagname[node.tagname] = [node.density];
    }
  
    var attrnames = Object.keys(node.attr);
    var attrobject = null;
    var attrname = null;
    for (var i = 0, l = attrnames.length; i < l; i++) {
      attrname = attrnames[i];
  
      if (this.attribute.hasOwnProperty( attrname )) {
        attrobject = this.attribute[ attrname ];
      } else {
        attrobject = this.attribute[ attrname ] = {};
      }
  
      if (attrname === 'class') {
        for (var n = 0, r = node.classes.length; n < r; n++) {
          this._appendAttribute(attrobject, node.classes[n], node);
        }
      } else {
        this._appendAttribute(attrobject, node.attr[ attrname ], node);
      }
    }
  }
};
