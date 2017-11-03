/*
  A JavaScript module which performs a bubble sort on a given array of numbers, ordering the elements from lowest to highest.
*/
module.exports = exports = function(input) {
  //  complete the function
    var i, j, k, length;
    length = input.length;
    for(i= (length-1); i >= 0; i--){
        for(j = (length-i); j > 0; j--){
            if(input[j] < input[j-1]){
                k = input[j];
                input[j] = input[j-1];
                input[j-1] = k;
            }
        }
    }
    return input;
};
