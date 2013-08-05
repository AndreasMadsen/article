
function zeroDivide(a, b) {
  return b === 0 ? 0 : a / b;
}

function adjustedSum(values, adjust, appear) {
  var divider = 0;
  var sum = 0;

  for (var i = 0, l = adjust.length; i < l; i++) {
    // if min == max, then the likehood can not be calculated because there is
    // nothing to relate to, so just distribute the likehood evenly by using
    // the number 0 (meainging very likely)
    sum += (adjust[i].max === adjust[i].min) ? appear[i] : zeroDivide(
      appear[i] * (values[i] - adjust[i].min),
      adjust[i].max - adjust[i].min
    );

    divider += appear[i];
  }

  // The returned value is between 1 (likely) and 0 (unlikly).
  return sum / divider;
}
exports.adjustedSum = adjustedSum;

function adjusedValue(value, adjust) {
  // The returned value is between 1 (likely) and 0 (unlikly).
  return adjust.min === adjust.max ? 1 : zeroDivide(value - adjust.min, adjust.max - adjust.min);
}
exports.adjusedValue = adjusedValue;

function distance(values) {
  var sum = 0;
  for (var i = 0, l = values.length; i < l; i++) {
    sum += Math.pow(values[i], 2);
  }

  return sum;
}
exports.distance = distance;

function average(values) {
  var sum = 0;
  for (var i = 0, l = values.length; i < l; i++) {
    sum += values[i];
  }

  return sum / l;
}
exports.average = average;

//
// Simple object used for storing and calculating a (min,max) range
//
function RangeObject() {
  this.max = -Infinity;
  this.min = Infinity;
}
exports.RangeObject = RangeObject;

RangeObject.prototype.update = function (value) {
  if (value < this.min) {
    this.min = value;
  }
  if (value > this.max) {
    this.max = value;
  }
};

RangeObject.prototype.adjust = function (value) {
  var a = value - this.min,
      b = this.max - this.min;

  return b === 0 ? 0 : a / b;
};

RangeObject.prototype.appearAdjust = function (value, appear) {
  var a = appear * (value - this.min),
      b = this.max - this.min;

  return b === 0 ? appear : a / b;
};

//
// Creates a size object
//  if just one of width or height is known the other will be estimated
//  using the golden ratio, assuming that it is a hoisontal picture
//
//  Note this also calculates the relative distance to the golden ratio,
//   but in case the width or height was estimated (distance would be 0),
//   a value of 0.618 is used (w = h). PS: the distance is then transformed
//   to a fitness score.
//
var GOLDEN_RATIO = 1.6180;
var MAYBE_BANNER_SIZE = 600*200;
function ImageSize(width, height) {
  // width and height are either numbers or null
	width = (typeof width === 'string' ? parseInt(width, 10) : Math.ceil(width)) || null;
	height = (typeof height === 'string' ? parseInt(height, 10) : Math.ceil(height)) || null;

	if (width && height) {
		this.width = width;
		this.height = height;
	} else if (width) {
		this.width = width;
		this.height = Math.ceil(width / GOLDEN_RATIO);
	} else if (height) {
		this.width = Math.ceil(height * GOLDEN_RATIO);
		this.height = height;
	} else {
		this.width = null;
		this.height = null;
	}

	if (width || height) {
		this.area = this.width * this.height;
	} else {
		this.area = null;
	}

  if (this.area > MAYBE_BANNER_SIZE && width && height) {
    this.banner = Math.min(
      Math.abs(GOLDEN_RATIO - (width / height))/GOLDEN_RATIO,
      Math.abs(GOLDEN_RATIO - (height / width))/GOLDEN_RATIO
    );
  } else {
    this.banner = 0;
  }
}
exports.ImageSize = ImageSize;
