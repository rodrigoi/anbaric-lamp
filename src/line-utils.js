import params from 'constants';

import utils from "utils";
import math from "math";

function checkDimensionRatio (a, b, dimension, ratio) {
  var max = Math.max(a.dimensions[dimension], a.dimensions[dimension]);
  var min = Math.min(b.dimensions[dimension], b.dimensions[dimension]);

  return max / min > ratio;
}

function pairLetters (letters) {
  //for evey letter
  var pairs = [];
  for(var i = 0; i < letters.length; i++){
    var letterA = letters[i];

    //we scan the rest of the letters for certain properties
    //that make a line, like dimensions and stroke thickness.
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

      if(Math.abs(slope) > 1){ continue; }

      pairs.push({
        left: left,
        right: right,
        dist: Math.sqrt(20 * Math.pow(y + height, 2) + Math.pow(x + width, 2))
      });
    }

    pairs.sort(function(a, b){
      return a.dist - b.dist;
    });
  }
  return pairs;
}

function calculateSlope (letters){
  if(letters.length === 1) return 0;

  //we calculate the slopes of grups of two letters
  var slopes = [];
  for(var i = 0; i < letters.length; i++){
    var letterA = letters[i];
    for(var j = 0; j < i; j++){
      var letterB = letters[j];
      slopes.push((letterA.center.y - lj.cy) / (letterA.center.x - lj.cx));
    }
  }

  //and return the angle in radians.
  return Math.atan(slopes.sort(function(a, b){
    return a - b;
  })[Math.floor(slopes.length/2)]);
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
    var right = pair.right.group;
    var left = pair.left.group;

    if(left === right) { continue; }

    var leftLetters = groups[left].members;
    var rightLetters = groups[right].members;

    var merged = leftLetters.concat(rightLetters).sort(utils.compareX);
    if(right.length > 1 || left.length > 1) {
      var zigtotes = utils.zigometer(merged) / (leftLetters.length + rightLetters.length);
      var angtotes = calculateSlope(merged);
    }
  }
  return groups;
}

var self = {
  findLines: function (letters){
    var pairs = pairLetters(letters);
    var lines = groupLetters(letters, pairs);

    return lines;

    while(pairs.length){
      var pair = pairs.shift();
      var left_group = pair.left.group;
      var right_group = pair.right.group;

      if(left_group === right_group) continue;

      var lca = groups[left_group].members;
      var rca = groups[right_group].members;

      var langle = utils.measure_angle(lca);
      var rangle = utils.measure_angle(rca);

      var merged = lca.concat(rca).sort(utils.compareX);

      if(lca.length > 1 || rca.length > 1){
        var zigtotes = utils.zigometer(merged) / (lca.length + rca.length);
        var angtotes = utils.measure_angle(merged);

        if(Math.abs(angtotes) > 0.1 + Math.abs(langle) + Math.abs(rangle)) continue;

        if(zigtotes > 0) continue;

        var r_bb = utils.bounding_box(rca);
        var l_bb = utils.bounding_box(lca);

        if(math.intersects(r_bb, l_bb)) continue;

        var l_height = Math.max.apply(Math, lca.map( utils.getHeight ));
        var r_height = Math.max.apply(Math, rca.map( utils.getHeight ));
        var ratio = Math.max(r_height, l_height) / Math.min(r_height, l_height);

        if(ratio > 1.5 + 10 / Math.max(lca.length, rca.length)) continue;
      }

      for(var i = 0; i < lca.length; i++){
        lca[i].group = right_group;
      }

      groups[right_group].members = merged;

      groups[left_group] = null;
    }

    return groups.filter(function(e){
      return e;
    }).map(function(e){
      return e.members;
    });
  },
  wrap_lines: function (letters){
    if(letters.length === 0) return null;

    letters = letters.sort(function(a, b){ return a.cx - b.cx; });

    var size = 0;

    var x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0, hs = 0;
    for(var i = 0; i < letters.length; i++){
      var letter = letters[i];
      x0 = Math.min(x0, letter.x0); y0 = Math.min(y0, letter.y0);
      x1 = Math.max(x1, letter.x1); y1 = Math.max(y1, letter.y1);
      size += letter.size;
      hs += letter.height;
    }

    var slopes = [];
    // This is an implementation of a Theil-Sen estimator
    // it's like actually really simple, it's just the median
    // of the slopes between every existing pair of points
    for(var i = 0; i < letters.length; i++){
      var li = letters[i];
      for(var j = 0; j < i; j++){
        var lj = letters[j];
        slopes.push((li.cy - lj.cy) / (li.cx - lj.cx));
      }
    }
    var dydx = slopes.sort(function(a, b){ return a - b; })[Math.floor(slopes.length/2)];

    var cx = x0 / 2 + x1 / 2;
    var cy = y0 / 2 + y1 / 2;

    var yr0 = Infinity, yr1 = -Infinity, sh = 0, st = 0;
    for(var i = 0; i < letters.length; i++){
      var letter = letters[i];
      var y_pred = (letter.cx - cx) * dydx + cy;
      yr0 = Math.min(yr0, letter.y0 - y_pred);
      yr1 = Math.max(yr1, letter.y1 - y_pred);
      sh += letter.height;
      st += letter.thickness;
    }

    var lettersize = letters.map(function(e){
      return e.size / e.width;
    }).sort(function(a, b){ return a - b; })[Math.floor(letters.length / 2)];

    // approximate the x-height of some line of text
    // as the height of the smallest character whose
    // height is larger than half the average character
    // height
    var xheight = letters.map(function(e){
      return e.height;
    }).filter(function(e){
      // return e > (yr1 - yr0) / 3
      return e <= (hs / letters.length);
    }).sort(function(a, b){
      return a - b;
    }).slice(-1)[0];

    return {
      letters: letters,
      lettercount: letters.length,
      lettersize: lettersize,
      size: size,
      lineheight: yr1 - yr0,
      xheight: xheight,
      avgheight: sh / letters.length,
      //direction: direction,
      angle: Math.atan(dydx),
      thickness: st / letters.length,
      x0: x0,
      y0: y0,
      y1: y1,
      x1: x1,
      cx: cx,
      cy: cy,
      width: x1 - x0 + 1,
      height: y1 - y0 + 1,
      area: (x1 - x0) * (y1 - y0)
    };
  },
  split_lines: function(regions, swt){
    var width = swt.cols;

    return regions.map(function (line) {
      var buf = [line.letters[0]], groups = [];
      for(var i = 0; i < line.letters.length - 1; i++) {
        var cur = line.letters[i];
        var next = line.letters[i + 1];

        if(next.x0 - cur.x1 > Math.sqrt(Math.min(next.area, cur.area))) {
          var streak = -1, separators = 0, y = Math.floor(cur.cy / 2 + next.cy / 2);
          var goal = 3 * Math.max(cur.height, next.height);

          for(var x = cur.x1; x < next.x0; x++){
            var n = y * width + x;
            if(swt.data[n] > 0){
              if(streak < 0) streak = x;
            }else{
              if(streak > 0){
                var mid = Math.floor(x / 2 + streak / 2), explored = 0;
                for(var t = 0; t < goal; t++){
                  var k = (y + t) * width + mid;
                  if(swt.data[k] > 0){
                    explored++;
                  }else if(swt.data[k + 1] > 0){
                    mid++;
                    explored++;
                  }else if(swt.data[k - 1] > 0){
                    mid--;
                    explored++;
                  } else break;
                }
                var mid = Math.floor(x / 2 + streak / 2);
                for(var t = 0; t < goal; t++){
                  var k = (y - t) * width + mid;
                  if(swt.data[k] > 0){
                    explored++;
                  }else if(swt.data[k + 1] > 0){
                    mid++; explored++;
                  }else if(swt.data[k - 1] > 0){
                    mid--; explored++;
                  } else break;
                }
                if(explored > goal) separators++;
              }
              streak = -1;
            }
          }
          if(separators > 0) { // break it off
            groups.push(buf);
            buf = [];
          }
        }
        buf.push(next);
      }
      groups.push(buf);
      // return groups
      return (groups.length === 1) ? [line] : groups;
    });
  }
};

export default self;
