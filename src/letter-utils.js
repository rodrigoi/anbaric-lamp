import params from 'constants';
import utils from 'utils';

/*
https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c#L357
*/
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
    for(var x = letter.bounds.x0; x < letter.bounds.x1; x++){
      for(var y = letter.bounds.y0; y < letter.bounds.y1; y++){
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

/*
https://github.com/naptha/naptha.github.io/blob/master/js/swt-worker.js#L3766
*/
function connectedComponentsByPriority(masked){
  var dx8 = [-1, 1, -1, 0, 1, -1, 0, 1];
  var dy8 = [0, 0, -1, -1, -1, 1, 1, 1];
  var width = masked.cols;
  var height = masked.rows;

  var marker = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);
  var contours = [];

  var big_queue = new HeapQueue(function (b, a){
    return masked.data[a] - masked.data[b];
  });

  for(var i = 0; i < width * height; i++){
    if(masked.data[i]){
      big_queue.push(i);
    }
  }

  while(big_queue.length){
    var i = big_queue.pop();
    if(marker.data[i] || !masked.data[i]){ continue; }

    marker.data[i] = 1;
    var contour = [];
    var stack = new HeapQueue(function(b, a){
      return masked.data[a] - masked.data[b];
    });
    stack.push(i);
    var w = masked.data[i];

    while(stack.length){
      var closed = stack.pop();

      contour.push(closed);
      var cx = closed % width;
      var cy = Math.floor(closed / width);


      for(var k = 0; k < 8; k++){
        var nx = cx + dx8[k];
        var ny = cy + dy8[k];
        var n = ny * width + nx;

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

    if(contour.length >= 10){
      contours.push(contour);
    }
  }
  return contours;
}
/*
https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c#L292
*/
function contourToLetter(strokeWidthMatrix, points){
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

  var median = swts.sort(utils.compare)[Math.floor(swts.length / 2)];
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
    std: std,
    mean: mean,
    contours: points,
    thickness: median
  };
}

var self = {
  findLetters: function (strokeWidthMatrix, marker) {
    console.time('find letters on matrix');

    var candidates = [];
    if(!marker) {
      candidates = connectedComponents(strokeWidthMatrix)
        .map(function (points) {
          return contourToLetter(strokeWidthMatrix, points);
        })
        .filter(function (e){
          if(!e) return false;
          if(e.std > e.mean * params.std_ratio) return false;
          return true;
        });
    } else {
      candidates = connectedComponentsByPriority(marker)
        .map(function (points) {
          return contourToLetter(strokeWidthMatrix, points);
        })
        .filter(function (e){
          return e;
        });
    }

    var width = strokeWidthMatrix.cols;
    var height = strokeWidthMatrix.rows;
    var letters = removeOcclusions(candidates, width, height);

    console.timeEnd('find letters on matrix');
    return letters;
  }
};

export default self;
