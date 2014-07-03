import params from 'constants';

import math from 'math';
import lineUtils from 'line-utils';
import colors from 'colors';
import utils from 'utils';
import graphics from 'graphics';
import HeapQueue from "HeapQueue";
import mocks from 'mocks';


function connectedLetters (strokeWidthMatrix, contours){
  var width = strokeWidthMatrix.cols;
  var height = strokeWidthMatrix.rows;

  var letters = contours
    .map(function (points) {
      return contour2Letter(strokeWidthMatrix, null, points, width, height);
    })
    .filter(function(e){
      if(!e) return false;
      if(e.std > e.mean * params.std_ratio) return false;
      return true;
    });

  return letters;
}

function strokeWidthTransform(imageData, cannyImage, sobelImage, dark_on_light){
  console.group(dark_on_light ? 'dark on light' : 'light on dark');

  var strokeWidthMatrix = createStrokeWidthMatrix(cannyImage, sobelImage, dark_on_light);
  var contours = connectedComponents(strokeWidthMatrix);

  var width = cannyImage.cols;
  var height = cannyImage.rows;

  var letters = removeOcclusions(
    connectedLetters(strokeWidthMatrix, contours),
    width,
    height
  );

  var lines = lineUtils.findLines(letters);

  var lines = lineUtils.findLines(letters, params)
    .filter(function(e){ return e.length > 1; })
    .map(lineUtils.wrap_lines)
    .filter(function(e){
      return e.lettercount > 3 || (e.lettercount > 2 && Math.abs(e.angle) < 0.1);
    });

  var dilationMatrix = graphics.dilate(lines, imageData);

  var marker = colors.colorFilter(lines, imageData, dilationMatrix);

  var letters = connected_priority(marker, params)
    .map(function (points) {
      return contour2Letter(strokeWidthMatrix, marker, points, width, height);
    })
    .filter(function(e){
      return e;
    });
  letters = removeOcclusions(letters, width, height);

  var lines = lineUtils.findLines(letters, params)
    .filter(function(e){ return e.length > 1; })
    .map(lineUtils.wrap_lines);

  //merge the adjacent lines
  lines = utils.equivalence_classes(lines, function (r_bb, l_bb){
    var y_overlap = Math.min(r_bb.y1, l_bb.y1) - Math.max(r_bb.y0, l_bb.y0);
    if(y_overlap <= 0){
      return false;
    }

    var frac_overlap = y_overlap / Math.min(r_bb.height, l_bb.height);
    if(frac_overlap < 0.8) {
      return false;
    }

    var x_dist = Math.max(r_bb.x0, l_bb.x0) - Math.min(r_bb.x1, l_bb.x1);
    if(x_dist < 0) return false;
    if(x_dist > 0.2 * Math.max(r_bb.width, l_bb.width)) return false;

    if(x_dist > 3 * Math.max(r_bb.height, l_bb.height)) return false;

    var max_ang = 0.2; // this merger breaks down with too much angle
    if(Math.abs(r_bb.angle) > max_ang || Math.abs(r_bb.angle) > max_ang) return false;

    if(Math.max(r_bb.height, l_bb.height) / Math.min(r_bb.height, l_bb.height) > 1.4) return false;

    return true;
  }).map(function(cluster){
    if(cluster.length === 1) return cluster[0];
    return lineUtils.wrap_lines([].concat.apply([], cluster.map(function(e){ return e.letters; })));
  });

  // this is a weird thing that does a quasi-dynamic programmingish
  // thing in order to figure out vertical lines and then use that
  // to split up lines

  lines = [].concat.apply([], lineUtils.split_lines(lines, swt).map(function(groups){
    return (groups.length === 1) ? groups : groups.map(lineUtils.wrap_lines);
  })).filter(function(e){
    return e.lettercount > 1;
  });

  lines = lines.map(function(line){
    if(line.letters.length < 7) return line;

    var heights = line.letters.slice(1, -1).map(function(e){ return e.height; });
    var avg = math.mean(heights);

    // this might be a bad idea
    var heights = line.letters.slice(1, -1)
      .map(function(e){ return e.height; })
      .filter(function(e){ return e > avg; });
    var avg = math.mean(heights);

    var std = Math.max(1, math.stdev(heights));

    if(avg < 10) return line;

    var letters = line.letters;
    if((letters[0].height - avg) / std > 3){
      letters = letters.slice(1);
    }

    if((letters[letters.length - 1].height - avg) / std > 3){
      letters = letters.slice(0, -1);
    }

    if(letters.length < line.letters.length){
      return lineUtils.wrap_lines(letters);
    }

    return line;
  }).filter(function(e){ return e; });

  lines = lines.filter(function(line){
    if(Math.abs(line.angle / line.lettercount) > 0.07) return false;
    return true;
  });

  // letter shape is more useful than like the alternative
  lines.forEach(function(line){
    line.letters.forEach(function(letter){
      var contour = [];
      for(var i = 0; i < letter.contours.length; i++){
        var p = letter.contours[i];
        var x = p % width;
        var y = Math.floor(p / width);
        contour.push((x - letter.x0) + (y - letter.y0) * (letter.x1 - letter.x0 + 1));
      }
      delete letter.contours;
      letter.shape = contour;
    });
  });

  console.groupEnd();
  return lines;
}

function createStrokeWidthMatrix(cannyImage, sobelImage, darkOnLight){
  var width = cannyImage.cols;
  var height = cannyImage.rows;

  var rays = [];
  var strokeWidthMatrix = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);
  //using the canny edges and the sobel gradient, we calculare the ray vectors
  //walking all the pixels of the image and operating on the white edge pixels
  for(var i = 0; i < width * height; i++){
    //we have to get only the white pixels
    //to calculate ray starts
    if(cannyImage.data[i] !== 0xff) { continue; }
    //calculate the angle of the gradient
    //var itheta = math.theta(i, sobelImage);
    var theta = math.theta(i, sobelImage);
    var origin = math.index2Point(i, width);
    var ray = createRay(cannyImage, i, origin.x, origin.y, theta, width, height, darkOnLight);
    rays.push(ray);
    calculateStrokeWidth(strokeWidthMatrix, sobelImage, ray, theta, origin.x, origin.y, width);
  }

  return strokeWidthMatrix;
}

function calculateStrokeWidth(strokeWidthMatrix, sobelImage, ray, originTheta, originX, originY, width) {
  //a ray has at least one point, the starting point
  //there is no need to do boundary checks.

  //we get the angle of the gradient at the end of the ray
  var theta = math.theta(ray[ray.length - 1], sobelImage);
  var point = math.index2Point(ray[ray.length - 1], width);

  if(Math.abs(Math.abs(originTheta - theta) - Math.PI) < Math.PI / 2) {
    var strokeWidth = Math.sqrt(
      (point.x - originX) * (point.x - originX) +
      (point.y - originY) * (point.y - originY)
    ); // derive the stroke width

    //we iterate over the ray points and save the stroke width for
    //that point on a matrix.
    for(var i = 0; i < ray.length; i++){

      strokeWidth = strokeWidthMatrix.data[ray[i]] !== 0 && strokeWidthMatrix.data[ray[i]] < strokeWidth ?
        strokeWidthMatrix.data[ray[i]] :
        strokeWidth;
      //if we've been on this point before, we save the smallest value
      //strokeWidthMatrix.data[ray[i]] = math.nzmin(strokeWidthMatrix.data[ray[i]], strokeWidth);
      strokeWidthMatrix.data[ray[i]] = strokeWidth;
    }
  }
}

function createRay(cannyImage, index, originX, originY, theta, width, height, darkOnLight) {
  //we find the other end of the vector
  //extrapolate the ray, as libccv does using bresenham's line algorithm
  //http://en.wikipedia.org/wiki/Bresenham's_line_algorithm

  //stating ray index
  var ray = [index];
  var direction = darkOnLight ? -1 : 1;

  for(var i = 1; i < params.max_stroke; i++) {
    var x = Math.round(originX + Math.cos(theta) * direction * i);
    var y = Math.round(originY + Math.sin(theta) * direction * i);

    //we need to stop if we reach the boundaries of the image
    //without saving an invalid position
    if(x < 0 || y < 0 || x > width || y > height) {
      break;
    }

    var j = y * width + x;
    ray.push(j);

    //we've reached the other end of the stroke before
    //hitting the limit
    if(cannyImage.data[j] === 0xff) {
      break;
    }
  }

  //we return all the elements that conform the ray
  return ray;
}

/*
https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c#L225
*/
function connectedComponents(strokeWidthMatrix){
  var dx8 = [-1, 1, -1, 0, 1, -1, 0, 1];
  var dy8 = [0, 0, -1, -1, -1, 1, 1, 1];

  var width = strokeWidthMatrix.cols;
  var height = strokeWidthMatrix.rows;

  var markerMatrix = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);
  var contours = [];

  for(var i = 0; i < width * height; i++){
    //if we don't have previous marker data or stroke width data
    //for that point, we continue
    if(markerMatrix.data[i] || !strokeWidthMatrix.data[i]) { continue; }

    markerMatrix.data[i] = 1;
    var contour = [];
    var stack = [i];
    var closed;

    while(closed = stack.shift()){
      contour.push(closed);
      var cx = closed % width;
      var cy = Math.floor(closed / width);
      var w = strokeWidthMatrix.data[closed];

      for(var k = 0; k < 8; k++){
        var nx = cx + dx8[k];
        var ny = cy + dy8[k];
        var n = ny * width + nx;

        if(nx >= 0 &&
           nx < width &&
           ny >= 0 &&
           ny < height &&
           strokeWidthMatrix.data[n] &&
           !markerMatrix.data[n] &&
           strokeWidthMatrix.data[n] <= params.stroke_ratio * w &&
           strokeWidthMatrix.data[n] * params.stroke_ratio >= w
          ) {
          markerMatrix.data[n] = 1;
          // update the average stroke width
          w = (w * stack.length + strokeWidthMatrix.data[n]) / (stack.length + 1);
          stack.push(n);
        }
      }
    }
    if(contour.length >= params.min_area){
      contours.push(contour);
    }
  }

  return contours;
}

//https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c#L292
function contour2Letter(strokeWidthMatrix, marker, points){
  var width = strokeWidthMatrix.cols;
  var height = strokeWidthMatrix.rows;

  var size = points.length;
  var x0 = Infinity;
  var y0 = Infinity;
  var x1 = 0;
  var y1 = 0;

  var m10 = 0;
  var m01 = 0;
  var m11 = 0;
  var m20 = 0;
  var m02 = 0;
  var swtsum = 0;
  var swtvar = 0;
  var swts = [];
  var marksum = 0;
  var y_coords = [];

  for(var i = 0; i < size; i++){
    var p = points[i];
    var x = p % width;
    var y = Math.floor(p / width);

    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);

    y_coords.push(y);

    m10 += x;
    m01 += y;
    m11 += x * y;
    m20 += x * x;
    m02 += y * y;
    swtsum += strokeWidthMatrix.data[p];

    if(marker) marksum += marker.data[p];

    swts.push(strokeWidthMatrix.data[p]);
  }

  var mean = swtsum / size;

  for(var i = 0; i < size; i++){
    var p = points[i];
    swtvar += (strokeWidthMatrix.data[p] - mean) * (strokeWidthMatrix.data[p] - mean);
  }
  var xc = m10 / size, yc = m01 / size;
  var af = m20 / size - xc * xc;
  var bf = 2 * (m11 / size - xc * yc);
  var cf = m02 / size - yc * yc;
  var delta = Math.sqrt(bf * bf + (af - cf) * (af - cf));
  var ratio = Math.sqrt((af + cf + delta) / (af + cf - delta));
  ratio = Math.max(ratio, 1 / ratio);

  if(ratio > params.aspect_ratio) return;

  var median = swts.sort(function(a, b){ return a - b; })[Math.floor(swts.length / 2)];
  var std = Math.sqrt(swtvar / size);
  var area = (x1 - x0 + 1) * (y1 - y0 + 1);

  if(size / area < 0.1) return;

  var cy = y0 + (y1 - y0) / 2;
  var cx = x0 + (x1 - x0) / 2;

  if(y0 === 0 || y1 === height - 1) return;

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
      height: y1 - y0 + 1,
    },
    size: size,
    ratio: (x1 - x0) / (y1 - y0),
    std: std,
    mean: mean,
    medy: y_coords.sort(function(a, b){ return a - b; })[Math.floor(y_coords.length / 2)] - cy,
    area: area,
    contours: points,
    markweight: marksum / size,
    thickness: median
  };
}

function connected_priority(masked){
  var dx8 = [-1, 1, -1, 0, 1, -1, 0, 1];
  var dy8 = [0, 0, -1, -1, -1, 1, 1, 1];
  var width = masked.cols,
    height = masked.rows;

  var marker = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);
  var contours = [];

  var min_area = 10;

  var big_queue = new HeapQueue(function(b, a){
    return masked.data[a] - masked.data[b];
  });
  for(var i = 0; i < width * height; i++){
    if(!masked.data[i]) continue;
    big_queue.push(i);
  }

  while(big_queue.length){
    var i = big_queue.pop();
    if(marker.data[i] || !masked.data[i]) continue;

    //var ix = i % width;
    //var iy = Math.floor(i / width);

    marker.data[i] = 1;
    var contour = [];
    var stack = new HeapQueue(function(b, a){
      return masked.data[a] - masked.data[b];
    });
    stack.push(i);
    var w = masked.data[i];
    var counter = 0;
    var mean = 0;
    var M2 = 0;

    while(stack.length){
      var closed = stack.pop();

      contour.push(closed);
      var cx = closed % width, cy = Math.floor(closed / width);

      counter++;
      var delta = masked.data[closed] - mean;
      mean = mean + delta / counter;
      M2 += delta * (masked.data[closed] - mean);

      for(var k = 0; k < 8; k++){
        var nx = cx + dx8[k];
        var ny = cy + dy8[k];
        var n = ny * width + nx;

        //var std = Math.sqrt(M2/(counter - 1));

        if(nx >= 0 && nx < width &&
           ny >= 0 && ny < height &&
           masked.data[n] &&
           !marker.data[n]
           ){
            marker.data[n] = 1;
            if(Math.pow(masked.data[n], 1.5) > w){
              w = (w * stack.length + masked.data[n]) / (stack.length + 1);
              stack.push(n);
            } else {
              contour.push(n);
            }
        }
      }
    }

    if(contour.length >= min_area){
      contours.push(contour);
    }
  }
  return contours;
}

//https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c#L357
function removeOcclusions(letters, width, height){
  var buffer = new jsfeat.matrix_t(width, height, jsfeat.S32_t | jsfeat.C1_t);

  for(var i = 0; i < letters.length; i++){
    var contour = letters[i].contours;
    for(var j = 0; j < contour.length; j++){
      buffer.data[contour[j]] = i + 1;
    }
  }

  return letters.filter(function (letter, i){

    var another = [];
    for(var x = letter.x0; x < letter.x1; x++){
      for(var y = letter.y0; y < letter.y1; y++){
        var group = buffer.data[x + width * y];

        if(group && group !== i + 1){

          if(another.indexOf(group) === -1){
            another.push(group);
          }

        }
      }
    }

    return another.length <= params.letter_occlude_thresh;
  });
}

var swt = {
  transform: function (imageData, cannyImage, sobelImage) {
    //var darkOnLightLines = strokeWidthTransform(imageData, cannyImage, sobelImage, true);
    //var lightOnDarkLines = strokeWidthTransform(imageData, cannyImage, sobelImage, false);

    //var lines = darkOnLightLines.concat(lightOnDarkLines);

    //once merged, we'll sort them by the detected center median
    // lines.sort(function(a, b){
    //   return a.cy - b.cy;
    // });

    //return lines;
    return mocks;
  }
};

export default swt;
