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

import illuminator from 'illuminator';
import swt from 'swt';

var debugCanvas;
var debugContext;

function drawDebugMatrix(matrix, lines) {
  debugCanvas = domUtils.createCanvas(matrix.cols, matrix.rows);

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

function drawLetter (letter) {
  debugContext.beginPath();
  debugContext.rect(
    letter.bounds.x0,
    letter.bounds.y0,
    letter.bounds.x1 - letter.bounds.x0,
    letter.bounds.y1 - letter.bounds.y0
  );
  debugContext.lineWidth = 1;
  debugContext.strokeStyle = 'orange';
  debugContext.stroke();
}

function highlightLetter(line, letter, result) {
  drawDebugMatrix(result);

  var context = debugCanvas.getContext('2d');

  //draw line bounding box
  context.beginPath();
  context.rect(
    result.lines[line].letters[letter].bounds.x0,
    result.lines[line].letters[letter].bounds.y0,
    result.lines[line].letters[letter].bounds.x1 - result.lines[line].letters[letter].bounds.x0,
    result.lines[line].letters[letter].bounds.y1 - result.lines[line].letters[letter].bounds.y0
  );
  context.lineWidth = 1;
  context.strokeStyle = 'cyan';
  context.stroke();
}

export default function (image, debugContainer) {
  var imageData = graphics.getImageData(image);
  var greyScaleMatrix = graphics.createGreyScaleMatrix(imageData);

  var sobelMatrix = graphics.createSobelMatrix(greyScaleMatrix);
  var cannyMatrix = graphics.applyGaussianBlurAndCannyEdgeDetector(greyScaleMatrix);

  var lines = swt.transform(imageData, cannyMatrix, sobelMatrix);

  if(debugContainer && cannyMatrix) {
    drawDebugMatrix(cannyMatrix, lines);
    debugContainer.appendChild(debugCanvas);
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

  return {
    image: image,
    greyScale: greyScaleMatrix,
    sobel: sobelMatrix,
    canny: cannyMatrix,
    lines: lines,
    OCR: OCRAD(imageData)
  };
}
