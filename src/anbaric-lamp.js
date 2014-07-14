/*
http://libccv.org/doc/doc-swt/
http://libccv.org/lib/ccv-swt/
https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c
https://github.com/aperrau/DetectText/blob/master/TextDetection.cpp
https://github.com/JasonAltschuler/Otsu
https://github.com/adamhooper/js-priority-queue
https://github.com/naptha/naptha.github.io
*/

import params from 'constants';
import math from 'math';
import utils from 'utils';
import domUtils from 'dom-utils';
import graphics from 'graphics';
import clipboard from 'clipboard';

import illuminator from 'illuminator';
import swt from 'swt';

var debugCanvas;
var debugContext;

function drawDebugMatrix(matrix, lines) {
  debugContext = debugCanvas.getContext('2d');
  var output = debugContext.createImageData(matrix.cols, matrix.rows);

  for(var i = 0; i < matrix.cols * matrix.rows; i++) {
    output.data[i * 4 + 3] = 255;

    if(matrix.data[i] === 1) {
      output.data[i * 4] = 255;
    } else {
      output.data[i * 4] = output.data[i * 4 + 1] = output.data[i * 4 + 2] = matrix.data[i];
    }
  }
  debugContext.putImageData(output, 0, 0);

  lines.forEach(drawLine);
}

function drawLine (line) {
  debugContext.beginPath();
  debugContext.rect(
    line.bounds.x0,
    line.bounds.y0,
    line.bounds.x1 - line.bounds.x0,
    line.bounds.y1 - line.bounds.y0
  );
  debugContext.lineWidth = 1;
  debugContext.strokeStyle = 'blue';
  debugContext.stroke();

  line.letters.forEach(drawLetter);
}

function drawLetter (letter, color) {
  debugContext.beginPath();
  debugContext.rect(
    letter.bounds.x0,
    letter.bounds.y0,
    letter.bounds.x1 - letter.bounds.x0,
    letter.bounds.y1 - letter.bounds.y0
  );
  debugContext.lineWidth = 1;
  debugContext.strokeStyle = color || 'orange';
  debugContext.stroke();
}

function OCR (matrix) {
  var selectionCanvas = domUtils.createCanvas(matrix.cols, matrix.rows);
  var selectionContext = selectionCanvas.getContext('2d');
  var selectionOutput = debugContext.createImageData(matrix.cols, matrix.rows);

  for(var i = 0; i < matrix.cols * matrix.rows; i++) {
    selectionOutput.data[i * 4 + 3] = 255;

    if(matrix.data[i] === 1) {
      selectionOutput.data[i * 4] = 255;
    } else {
      selectionOutput.data[i * 4] = selectionOutput.data[i * 4 + 1] = selectionOutput.data[i * 4 + 2] = matrix.data[i];
    }
  }

  console.time('OCRAD processing');
  var text = OCRAD(selectionOutput);
  console.timeEnd('OCRAD processing');

  return text.replace(/^\s*[\r\n]/gm, '');
}

export default function (image, debugContainer) {
  var imageData = graphics.getImageData(image);
  var greyScaleMatrix = graphics.createGreyScaleMatrix(imageData);

  var sobelMatrix = graphics.createSobelMatrix(greyScaleMatrix);
  var cannyMatrix = graphics.applyGaussianBlurAndCannyEdgeDetector(greyScaleMatrix);

  var lines = swt.transform(imageData, cannyMatrix, sobelMatrix);

  if(debugContainer && cannyMatrix) {
    console.time('drawing debug matrix');
    debugCanvas = domUtils.createCanvas(greyScaleMatrix.cols, greyScaleMatrix.rows);
    drawDebugMatrix(cannyMatrix, lines);
    debugContainer.appendChild(debugCanvas);
    console.timeEnd('drawing debug matrix');
  }

  // var result = getImageData(source)
  //   .then(createGreyScaleImage)
  //   .then(createSobelImage)
  //   .then(applyGaussianBlur)
  //   .then(applyCannyEdgeDetector)
  //   .then(strokeWidthTransform)
  //   .then(function (mask, lines){
  //     return {
  //       mask: mask,
  //       lines: lines
  //     }
  //   });

  illuminator.foo(
    image,
    lines,
    function (line, letter) {
      if(debugContainer && cannyMatrix) {
        drawDebugMatrix(cannyMatrix, lines);
        drawLetter(lines[line].letters[letter], 'cyan');
      }
    },
    function (selection) {
      var polygon = utils.selectionToPolygon(selection, lines);
      var box = utils.getPolygonBoundingBox(polygon);

      var crop = graphics.crop(box, greyScaleMatrix);

      var histogram = graphics.histogram(crop);
      var otsu = graphics.otsu(histogram, crop.cols * crop.rows);

      math.translatePolygon(polygon, {
        x: box.x0,
        y: box.y0
      });


      var consoleTable = [];


      var center = {
        x: (box.x1 - box.x0) / 2,
        y: (box.y1 - box.y0) / 2
      };
      polygon.sort(function (a, b){
        var atanA = Math.atan2((a.y - center.y),(a.x - center.x));
        var atanB = Math.atan2((b.y - center.y),(b.x - center.x));

        consoleTable.push({
          "a-index": a.index,
          "b-index": b.index,
          "atan-a": atanA,
          "atan-b": atanB,
          "diff": atanA - atanB});

        var d = atanA - atanB;
        if(Math.abs(d) > 0.1) {
          return d;
        }

        var d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
        var d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
        return d2 - d1;
      });


      // var topLeftVertex = polygon[0];
      // polygon.sort(function (a, b){
      //   var atanA = Math.atan2((a.y - topLeftVertex.y),(a.x - topLeftVertex.x));
      //   var atanB = Math.atan2((b.y - topLeftVertex.y),(b.x - topLeftVertex.x));

      //   consoleTable.push({
      //     "a-index": a.index,
      //     "b-index": b.index,
      //     "atan-a": atanA,
      //     "atan-b": atanB,
      //     "diff": atanA - atanB});

      //   if(a.x >= topLeftVertex.x && b.x >= topLeftVertex.x) {
      //     return atanA - atanB;
      //   }
      //   console.log(a.index, b.index);
      //   return atanB - atanA;
      // });

      console.table(consoleTable);

      // var topLeftVertex = polygon[0];
      // polygon.sort(function (a, b){
      //   var aTanA = Math.atan2((a.y - topLeftVertex.y),(a.x - topLeftVertex.x));
      //   var aTanB = Math.atan2((b.y - topLeftVertex.y),(b.x - topLeftVertex.x));

      //   if (aTanA < aTanB) return -1;
      //   else if (aTanB < aTanA) return 1;
      //   return 0;
      // });
      // var center = {
      //   x: (box.x1 - box.x0) / 2,
      //   y: (box.y1 - box.y0) / 2
      // };
      // polygon.sort(function (a, b) {
      //   if (a.x - center.x >= 0 && b.x - center.x < 0) {
      //     return true;
      //   }
      //   if (a.x - center.x < 0 && b.x - center.x >= 0) {
      //     return false;
      //   }
      //   if (a.x - center.x == 0 && b.x - center.x == 0) {
      //     if (a.y - center.y >= 0 || b.y - center.y >= 0) {
      //       return a.y > b.y;
      //     }
      //     return b.y > a.y;
      //   }

      //   // compute the cross product of vectors (center -> a) x (center -> b)
      //   var det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
      //   if (det < 0) {
      //     return true;
      //   }
      //   if (det > 0) {
      //     return false;
      //   }

      //   // points a and b are on the same line from the center
      //   // check which point is closer to the center
      //   var d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
      //   var d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
      //   return d1 > d2;
      // });


      // var center = {
      //   x: (box.x1 - box.x0) / 2,
      //   y: (box.y1 - box.y0) / 2
      // };
      // polygon.sort(function (a, b) {
      //   if (a.x - center.x >= 0 && b.x - center.x < 0) {
      //     return -1;
      //   }
      //   if (a.x - center.x < 0 && b.x - center.x >= 0) {
      //     return 1;
      //   }
      //   // if (a.x - center.x == 0 && b.x - center.x == 0) {
      //   //   if (a.y - center.y >= 0 || b.y - center.y >= 0) {
      //   //     return a.y - b.y;
      //   //   }
      //   //   return b.y - a.y;
      //   // }

      //   // compute the cross product of vectors (center -> a) x (center -> b)
      //   // var det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
      //   // return det;

      //   // points a and b are on the same line from the center
      //   // check which point is closer to the center
      //   var d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
      //   var d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);

      //   return d1 - d2;
      // });




      // var convexHull = new ConvexHullGrahamScan();
      // polygon.forEach(function (vertex) {
      //   convexHull.addPoint(vertex.x, vertex.y);
      // });

      // var hullPoints = convexHull.getHull();


      for(var i = 0; i < crop.cols * crop.rows; i++) {
        var point = math.indexToPoint(i, crop.cols);
        if(math.pointInPolygon(point, polygon)) {
          crop.data[i] = crop.data[i] > otsu ? 255 : 0;
        } else {
          crop.data[i] = 120;
        }
      }

      drawDebugMatrix(crop, []);

      clipboard.setClipboard(OCR(crop));
    });

  return {
    image: image,
    greyScale: greyScaleMatrix,
    sobel: sobelMatrix,
    canny: cannyMatrix,
    lines: lines,
    illuminator: illuminator,
    debug: {
      canvas: debugCanvas
    }
  };
}
