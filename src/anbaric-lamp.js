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
    drawDebugMatrix(greyScaleMatrix, []);
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
      var params = {
        padding: 20
      };

      var start = lines[selection.start.line];
      var end = lines[selection.end.line];

      var padding = Math.max(
        params.padding * start.dimensions.height / 100,
        params.padding * end.dimensions.height / 100
      );

      //get the bounds to crop the image to the selection.
      if(selection.start.line === selection.end.line) {
        //bound are whithin the same line
        var crop = graphics.crop({
          x0: Math.floor(start.letters[selection.start.letter].bounds.x0 - padding),
          y0: Math.floor(start.bounds.y0 - padding),
          x1: Math.floor(end.letters[selection.end.letter].bounds.x1 + 2 * padding),
          y1: Math.floor(end.bounds.y1 + 2 * padding)
        }, greyScaleMatrix);

        var histogram = graphics.histogram(crop);
        var otsu = graphics.otsu(histogram, crop.cols * crop.rows);

        for(var i = 0; i < crop.cols * crop.rows; i++) {
          crop.data[i] = crop.data[i] > otsu ? 255 : 0;
        }

        drawDebugMatrix(crop, []);

        clipboard.setClipboard(OCR(crop));
      }
    });

  // console.time('OCRAD processing full source image');
  // var imageText = OCRAD(imageData);
  // console.timeEnd('OCRAD processing full source image');

  return {
    image: image,
    greyScale: greyScaleMatrix,
    sobel: sobelMatrix,
    canny: cannyMatrix,
    lines: lines,
    illuminator: illuminator,
    debug: {
      canvas: debugCanvas
    }//,
    // OCR: imageText
  };
}
