
function Commonality(top) {
  this._top = top;
  this.parent = new FeatureSummary();
  this.node = new FeatureSummary();
}
module.exports = Commonality;

Commonality.prototype.collect = function (node) {
  this.node.collect(node);

  var parent = node;
  while(parent !== this._top && (parent = parent.parent)) {
    this.parent.collect(parent);
  }
};

Commonality.prototype.analyse = function () {
  
};

Commonality.prototype.match = function (node) {
  
};

//
// Collects features and bind them to the node density
//
function FeatureSummary() {
  this.type = {
    'fragment': [],
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

  if (this.tagname.hasOwnProperty(node.tagname)) {
    this.tagname[node.tagname].push(node.density);
  } else {
    this.tagname[node.tagname] = [node.density];
  }

  // If this node type has attributes
  if (node.attr) {
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
