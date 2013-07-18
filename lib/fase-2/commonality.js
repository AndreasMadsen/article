
var ttest = require('ttest');
var summary = require('summary');

function Commonality(top) {
  this._top = top;
  this._classlist = top.root.classlist;

  this.nodelist = null;
}
module.exports = Commonality;

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
  alpha: 0.15,
  alternative: "greater"
};

Commonality.prototype.tagnameReducer = function () {
  var maxRemoval = Math.floor(this.nodelist.length * 0.25);

  var names = Object.keys(this.node.tagname);

  // Find the tagname there can be primitivly assumed to have the highest
  // density mean
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
  var mindatavalue = Math.min.apply(Math, maxdataset);
  console.log('found: ' + maxtagname + ' -- ' + mindatavalue);

  for (var n = 0, r = names.length; n < r; n++) {
    if (names[n] == maxtagname) continue;
    var compare = this.node.tagname[names[n]];

    // If the maximal value in compare is less than the minimal value in
    // the maxdataset then its pretty safe to remove the currently compared
    // nodes
    if (Math.max.apply(Math, compare) < mindatavalue) {
      console.log('removing: ' + names[n]);
      for (var p = 0, t = this.nodelist.length; p < t; p++) {
        if (this.nodelist[p].tagname === names[n]) {
          this.nodelist[p].remove();
        }
      }
    }

    // If amount of nodes there can be removed is to huge then don't try to
    else if (compare.length > maxRemoval) continue;

    // If there is only two values then there is not enogth data to perfrom
    // a statical valid analysis, but if maxmean is 25% greater than the
    // alternative it should be good enogth
    if (maxdataset.length === 1 || compare.length === 1) {
      if (maxmean > summary(compare).mean() * 1.25) {
        for (var p = 0, t = this.nodelist.length; p < t; p++) {
          if (this.nodelist[p].tagname === names[n]) {
            this.nodelist[p].remove();
          }
        }
      }
    }

    // Check if the maxdataset mean is greater than the current tagname
    else if (ttest(maxdataset, compare, ttest_options).valid() === false) {
      for (var p = 0, t = this.nodelist.length; p < t; p++) {
        if (this.nodelist[p].tagname === names[n]) {
          this.nodelist[p].remove();
        }
      }
    }
  }
};

Commonality.prototype.classnameReducer = function () {
  var maxRemoval = Math.floor(this.nodelist.length * 0.25);

  // Find the classname there can be primitivly assumed to have the highest
  // density mean
  var maxmean = summary(this.node.classes.none).mean();
  var maxclassname = null;
  var maxdataset = this.node.classes.none;

  var classlist = Object.keys(this.node.classes.names);
  for (var i = 0, l = classlist.length; i < l; i++) {
    var mean = summary(this.node.classes.names[ classlist[i] ]).mean();
    if (mean > maxmean) {
      maxclassname = classlist[i];
      maxmean = mean;
    }
  }

  if (maxclassname) maxdataset = this.node.classes.names[maxclassname];
  var mindatavalue = Math.min.apply(Math, maxdataset);
  console.log('found: ' + maxclassname + ' -- ' +  mindatavalue);

  var names = [null].concat(classlist);
  for (var n = 0, r = names.length; n < r; n++) {
    if (names[n] == maxclassname) continue;
    var compare = names[n] === null ?
      this.node.classes.none : this.node.classes.names[names[n]];

    // If the maximal value in compare is less than the minimal value in
    // the maxdataset then its pretty safe to remove the currently compared
    // nodes
    if (Math.max.apply(Math, compare) < mindatavalue) {
      for (var p = 0, t = this.nodelist.length; p < t; p++) {
        if (names[n] === null ?
            this.nodelist[p].classes.length === 0 :
            this.nodelist[p].classes.indexOf( names[n] ) !== -1) {
          this.nodelist[p].remove();
        }
      }
    }

    // If amount of nodes there can be removed is to huge then don't try to
    else if (compare.length > maxRemoval) continue;

    // If there is only two values then there is not enogth data to perfrom
    // a statical valid analysis, but if maxmean is 25% greater than the
    // alternative it should be good enogth
    if (maxdataset.length === 1 || compare.length === 1) {
      if (maxmean > summary(compare).mean() * 1.25) {
        for (var p = 0, t = this.nodelist.length; p < t; p++) {
          if (names[n] === null ?
              this.nodelist[p].classes.length === 0 :
              this.nodelist[p].classes.indexOf( names[n] ) !== -1) {
            this.nodelist[p].remove();
          }
        }
      }
    }

    // Check if the maxdataset mean is greater than the current tagname
    else if (ttest(maxdataset, compare, ttest_options).valid() === false) {
      for (var p = 0, t = this.nodelist.length; p < t; p++) {
        if (names[n] === null ?
              this.nodelist[p].classes.length === 0 :
              this.nodelist[p].classes.indexOf( names[n] ) !== -1) {
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
  this.classes = {
    none: [], // $density, ...
    names: {
      // $classname: [$density]
    }
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
      if (attrname === 'class') continue;
      attrname = attrnames[i];

      if (this.attribute.hasOwnProperty( attrname )) {
        attrobject = this.attribute[ attrname ];
      } else {
        attrobject = this.attribute[ attrname ] = {};
      }

      this._appendAttribute(attrobject, node.attr[ attrname ], node);
    }

    if (node.classes.length === 0) {
      this.classes.none.push(node.density);
    } else {
      for (var n = 0, r = node.classes.length; n < r; n++) {
        this._appendAttribute(this.classes.names, node.classes[n], node);
      }
    }
  }
};
