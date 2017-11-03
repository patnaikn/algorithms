/*
  A JavaScript module which includes several common algorithms.
*/
const path = require('path');
exports.bubbleSort = require(path.join(__dirname, 'algorithms', 'bubbleSort'));
exports.linearSearch = require(path.join(__dirname, 'algorithms', 'linearSearch'));
exports.quickSort = require(path.join(__dirname, 'algorithms', 'quickSort'));
exports.binarySearch = require(path.join(__dirname, 'algorithms', 'binarySearch'));
exports.longestCommonSubsequence = require(path.join(__dirname, 'algorithms', 'longestCommonSubsequence'));
module.exports = exports;
