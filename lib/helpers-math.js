
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
      appear[i] * (values[i] - adjust[i][0]),
      adjust[i][1] - adjust[i][0]
    );

    divider += appear[i];
  }
  
  // The returned value is between 1 (likely) and 0 (unlikly).
  return 1 - sum / divider;
}
exports.adjustedSum = adjustedSum;

function adjusedValue(value, adjust) {
  return 1 - zeroDivide(value - adjust[0], adjust[1] - adjust[0]);  
}
exports.adjusedValue = adjusedValue;
