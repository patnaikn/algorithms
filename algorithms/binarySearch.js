/*
  A JavaScript module which performs a binary search on an array of numbers ordered low to high.  If the specified value is found its index in the input array is returned.  If the specified value is not found -1 is returned.
*/
module.exports = exports = function(input, value) {
  var bottom = 0, top = input.length - 1, index = null;
//  complete the function

    var middleIndex = Math.floor((bottom+top)/2);

    while(input[middleIndex] != value && bottom < top){
      if(value < input[middleIndex]){
        top = middleIndex - 1;
      } else if(value > input[middleIndex]){
        bottom = middleIndex + 1;
      }
      middleIndex = Math.floor((bottom+top)/2);
    }
    return (input[middleIndex] != value)? -1 : middleIndex;
};
