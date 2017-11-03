/*
  A JavaScript module which resolves the longest common subsequence inside two input strings.  If there is  a subsequence, the longest one is returned.  If there is no common subsequence, -1 is returned.  Adapted from an existing JavaScript implementation of the algorithm.
  Citation: "Algorithm Implementation/Strings/Longest Common Subsequence - Wikibooks, Open Books For An Open World". 2016. En.Wikibooks.Org. https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Longest_common_subsequence#JavaScript.
*/
module.exports = exports = function(s1, s2) {
  //  complete the function
    var comparsions = []; //2D array for the char comparsions ...
    var maxSubStrLength = 0;
    var lastMaxSubStrIndex = -1, i, j, char1, char2, startIndex;

    for (i = 0; i < s1.length; ++i) {
        comparsions[i] = new Array();

        for (j = 0; j < s2.length; ++j) {
            char1 = s1.charAt(i);
            char2 = s2.charAt(j);

            if (char1 === char2) {
                if (i > 0 && j > 0) {
                    comparsions[i][j] = comparsions[i - 1][j - 1] + 1;
                } else {
                    comparsions[i][j] = 1;
                }
            } else {
                comparsions[i][j] = 0;
            }

            if (comparsions[i][j] > maxSubStrLength) {
                maxSubStrLength = comparsions[i][j];
                lastMaxSubStrIndex = i;
            }
        }
    }

    if (maxSubStrLength > 0) {
        startIndex = lastMaxSubStrIndex - maxSubStrLength + 1;

        return s1.substr(startIndex, maxSubStrLength);
    }

    return -1;
};
