/*
  A JavaScript module which performs a quick sort on a given array of numbers, ordering the elements from lowest to highest.
*/
module.exports = exports = function(input) {
  return quickSort(input);
};
function quickSort(input, first, last) {
//  complete the function
    if (input.length <= 1) {
        return input;
    }

    var pivot = input[0];

    var left = [];
    var right = [];

    for (var i = 1; i < input.length; i++) {
        input[i] < pivot ? left.push(input[i]) : right.push(input[i]);
    }

    return quickSort(left).concat(pivot, quickSort(right));
}
