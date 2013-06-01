
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
    sum += zeroDivide(
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
  return zeroDivide(value - adjust.min, adjust.max - adjust.min);  
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
