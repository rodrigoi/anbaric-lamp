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

export default function (image, debugContainer) {
  var imageData = graphics.getImageData(image);
  var greyScaleMatrix = graphics.createGreyScaleMatrix(imageData);

  var sobelMatrix = graphics.createSobelMatrix(greyScaleMatrix);
  var cannyMatrix = graphics.applyGaussianBlurAndCannyEdgeDetector(greyScaleMatrix);

  var lines = swt.transform(imageData, cannyMatrix, sobelMatrix);

  if(debugContainer && cannyMatrix) {
    debugCanvas = domUtils.createCanvas(imageData.width, imageData.height);
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
      var selectionCanvas = domUtils.createCanvas(imageData.width, imageData.height);
      var selectionContext = selectionCanvas.getContext('2d');
      selectionContext.beginPath();

      selectionContext.moveTo(75, 145);
      selectionContext.lineTo(291, 145);
      selectionContext.lineTo(291, 175);
      selectionContext.lineTo(75, 175);
      selectionContext.closePath();
      selectionContext.clip();
      selectionContext.drawImage(image, 0, 0);

      var selectionData = selectionContext.getImageData(75, 145, 216, 30);

      console.time('OCRAD processing');
      var text = OCRAD(selectionData);
      clipboard.setClipboard(text);
      console.timeEnd('OCRAD processing');

      debugContainer.appendChild(selectionCanvas);
    });

  console.time('OCRAD processing full source image');
  var imageText = OCRAD(imageData);
  console.timeEnd('OCRAD processing full source image');

  return {
    image: image,
    greyScale: greyScaleMatrix,
    sobel: sobelMatrix,
    canny: cannyMatrix,
    lines: lines,
    illuminator: illuminator,
    debug: {
      canvas: debugCanvas
    },
    OCR: imageText
  };
}
