import params from 'constants';

import utils from "utils";
import math from "math";

function checkDimensionRatio (a, b, dimension, ratio) {
  var max = Math.max(a.dimensions[dimension], a.dimensions[dimension]);
  var min = Math.min(b.dimensions[dimension], b.dimensions[dimension]);

  return max / min > ratio;
}

function calculateSlope (letters){
  if(letters.length === 1) return 0;

  //we calculate the slopes of grups of two letters
  var slopes = [];
  for(var i = 0; i < letters.length; i++){
    var letterA = letters[i];
    for(var j = 0; j < i; j++){
      var letterB = letters[j];
      slopes.push(
        (letterA.center.y - letterB.center.y) / (letterA.center.x - letterB.center.x)
      );
    }
  }

  //and return the angle in radians.
  return Math.atan(slopes.sort(utils.compare)[Math.floor(slopes.length/2)]);
}

function pairLetters (letters) {
  //for evey letter
  var pairs = [];
  for(var i = 0; i < letters.length; i++){
    var letterA = letters[i];

    //we scan the rest of the letters for certain properties
    //that make a line, like dimensions and stroke thickness.
    //so we can group them as candidates for a line
    for(var j = i + 1; j < letters.length; j++){
      var letterB = letters[j];

      var ratio = letterA.thickness / letterB.thickness;
      //if the thickness ratio is irregular
      if(ratio > params.thickness_ratio || ratio < 1 / params.thickness_ratio) { continue; }

      //if the height or width reatio does not match
      if(checkDimensionRatio(letterA, letterB, 'height', params.height_ratio)) { continue; }
      if(checkDimensionRatio(letterA, letterB, 'width', params.width_ratio)) { continue; }

      //if the letters are one inside the other >:
      if((letterA.bounds.x0 < letterB.bounds.x0 && letterA.bounds.x1 > letterB.bounds.x1) ||
         (letterB.bounds.x0 < letterA.bounds.x0 && letterB.bounds.x1 > letterA.bounds.x1)) {
        continue;
      }

      //which letter is where? because letter can come out of order
      var right = (letterA.bounds.x1 > letterB.bounds.x1) ? letterA : letterB;
      var left  = (letterA.bounds.x1 > letterB.bounds.x1) ? letterB : letterA;

      var width  = Math.max(0, Math.max(right.bounds.x0, left.bounds.x0) - Math.min(right.bounds.x1, left.bounds.x1));
      var height = Math.max(0, Math.max(right.bounds.y0, left.bounds.y0) - Math.min(right.bounds.y1, left.bounds.y1));

      if((width > 2 * Math.max(Math.min(left.dimensions.height, left.dimensions.width), Math.min(right.dimensions.height, right.dimensions.width))) ||
          height > 10) {
        continue;
      }

      //we get the center coordinates of the letters
      var y = right.center.y - left.center.y;
      var x = right.center.x - left.center.x;
      //to calculate the slope
      var slope = y / x;

      if(Math.abs(slope) < 1){
        pairs.push({
          left: left,
          right: right,
          dist: Math.sqrt(20 * Math.pow(y + height, 2) + Math.pow(x + width, 2))
        });
      }
    }

    pairs.sort(function(a, b){
      return a.dist - b.dist;
    });
  }
  return pairs;
}

function groupLetters (letters, pairs) {
  var groups = [];
  for(var i = 0; i < letters.length; i++){
    var letter = letters[i];
    letter.group = groups.length;
    groups.push({
      members: [letter]
    });
  }

  for(var p = 0; p < pairs.length; p++) {
    var pair = pairs[p];

    var leftGroup = pair.left.group;
    var rightGroup = pair.right.group;

    //if the letters are not assigned to the same group
    if(leftGroup !== rightGroup) {
      //we get the left and right letters
      var leftLetters  = groups[leftGroup].members;
      var rightLetters = groups[rightGroup].members;
      var allLetters = leftLetters.concat(rightLetters).sort(utils.compareX);

      if(leftLetters.length > 1 || rightLetters.length > 1){

        var zigtotes = utils.zigometer(allLetters) / (leftLetters.length + rightLetters.length);
        if(zigtotes > 0) continue;

        //we get the slope of each group of letters
        var leftAngle  = calculateSlope(leftLetters);
        var rightAngle = calculateSlope(rightLetters);

        var angtotes = calculateSlope(allLetters);


        if(Math.abs(angtotes) > 0.1 + Math.abs(leftAngle) + Math.abs(rightAngle)) continue;

        var leftBoundingBox  = utils.getBoundingBox(leftLetters);
        var rightBoundingBox = utils.getBoundingBox(rightLetters);

        if(utils.boxesIntersect(rightBoundingBox, leftBoundingBox)) continue;

        var leftHeight  = Math.max.apply(Math, leftLetters.map( utils.getHeight ));
        var rightHeight = Math.max.apply(Math, rightLetters.map( utils.getHeight ));
        var ratio = Math.max(rightHeight, leftHeight) / Math.min(rightHeight, leftHeight);

        if(ratio > 1.5 + 10 / Math.max(leftLetters.length, rightLetters.length)) continue;
      }

      for(var i = 0; i < leftLetters.length; i++){
        leftLetters[i].group = rightGroup;
      }

      groups[rightGroup].members = allLetters;
      groups[leftGroup] = null;
    }
  }

  return groups;
}

function contourToLine(letters){
  if(letters.length === 0) return null;

  letters = letters.sort(utils.compareXCenter);

  var x0 = Infinity;
  var y0 = Infinity;
  var x1 = 0;
  var y1 = 0;

  for(var i = 0; i < letters.length; i++){
    var letter = letters[i];
    x0 = Math.min(x0, letter.bounds.x0);
    y0 = Math.min(y0, letter.bounds.y0);
    x1 = Math.max(x1, letter.bounds.x1);
    y1 = Math.max(y1, letter.bounds.y1);
  }

  var cx = x0 / 2 + x1 / 2;
  var cy = y0 / 2 + y1 / 2;

  var st = 0;
  for(var i = 0; i < letters.length; i++){
    var letter = letters[i];
    st += letter.thickness;
  }

  return {
    bounds: {
      x0: x0,
      y0: y0,
      y1: y1,
      x1: x1
    },
    center: {
      x: cx,
      y: cy
    },
    dimensions: {
      width: x1 - x0 + 1,
      height: y1 - y0 + 1
    },
    letters: letters
  };
};

var self = {
  findLines: function (letters){
    console.time('group letters on lines');
    var pairs = pairLetters(letters);
    var groups = groupLetters(letters, pairs);

    var lines = groups
      .filter(function (group){ //filter null or empty groups
        return group;
      })
      .map(function (group){ //get group members
        return group.members;
      })
      .filter(function (members){ //get members with more than one letter
        return members.length > 1;
      })
      .map(contourToLine); //take the contour and calculate bounds

    console.timeEnd('group letters on lines');
    return lines;
  }
};

export default self;
