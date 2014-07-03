/*
http://libccv.org/doc/doc-swt/
http://libccv.org/lib/ccv-swt/
https://github.com/liuliu/ccv/blob/unstable/lib/ccv_swt.c
https://github.com/aperrau/DetectText/blob/master/TextDetection.cpp
https://github.com/JasonAltschuler/Otsu
https://github.com/adamhooper/js-priority-queue
*/

import params from "constants";
import swt from "swt";

function getImageData (source){
  //we create an in memory canvas to to get the image data using the canvas' context.
  //it should have the same dimensions
  var canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  //now we draw the image on the canvas using the same width and height
  var context = canvas.getContext('2d');
  context.drawImage(source, 0, 0);

  //now we can get the image data and resolve the promise
  var data = context.getImageData(0, 0, source.width, source.height);

  return data;
}

function createGrayScaleImage (imageData) {
  //we need a matrix representing the greyscale image
  var grayscaleImage = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8C1_t);
  jsfeat.imgproc.grayscale(imageData.data, grayscaleImage.data);

  return grayscaleImage;
}

function createSobelImage (matrix) {
  var sobelImage = new jsfeat.matrix_t(matrix.cols, matrix.rows, jsfeat.S32C2_t);
  jsfeat.imgproc.sobel_derivatives(matrix, sobelImage);
  return sobelImage;
}

function applyGaussianBlurAndCannyEdgeDetector(matrix) {
  jsfeat.imgproc.gaussian_blur(matrix, matrix, 3, 0);
  // //now we need to run a canny edge detector on the greyscale matrix
  jsfeat.imgproc.canny(matrix, matrix, params.low_thresh, params.high_thresh);
}

function strokeWidthTransform(imageData, cannyImage, sobelImage) {
  //the transform function returns an array of lines
  //each line containing the individual letter information
  var lines = swt.transform(imageData, cannyImage, sobelImage);
  return {
    mask: cannyImage,
    lines: lines
  };
}

var debugCanvas;

function drawResultMatrix(result) {
  var mask = result.mask;

  var context = debugCanvas.getContext('2d');
  var output = context.createImageData(mask.cols, mask.rows);

  for(var i = 0; i < mask.cols * mask.rows; i++) {
    output.data[i * 4 + 3] = 255;

    if(mask.data[i] === 1) {
      output.data[i * 4] = 255;
    } else {
      output.data[i * 4] = output.data[i * 4 + 1] = output.data[i * 4 + 2] = mask.data[i];
    }
  }
  context.putImageData(output, 0, 0);

  var lines = result.lines;
  lines.forEach(function (line) {
    // //draw line bounding box
    context.beginPath();
    context.rect(
      line.bounds.x0,
      line.bounds.y0,
      line.bounds.x1 - line.bounds.x0,
      line.bounds.y1 - line.bounds.y0
    );
    context.lineWidth = 1;
    context.strokeStyle = 'blue';
    context.stroke();

    //connect the center of each letter
    line.letters.forEach(function (letter) {
      context.beginPath();
      context.rect(
        letter.bounds.x0,
        letter.bounds.y0,
        letter.bounds.x1 - letter.bounds.x0,
        letter.bounds.y1 - letter.bounds.y0
      );
      context.lineWidth = 1;
      context.strokeStyle = 'orange';
      context.stroke();
    });
  });
}

var lamp = {
  read: function read(source){
    var imageData = getImageData(source);
    var matrix = createGrayScaleImage(imageData);
    var sobelImage = createSobelImage(matrix);

    applyGaussianBlurAndCannyEdgeDetector(matrix);

    //at this point, matrix is a representation of the canny edges
    return strokeWidthTransform(imageData, matrix, sobelImage);

    // var result = getImageData(source)
    //   .then(createGrayScaleImage)
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
  },

  resultToCanvas: function resultToCanvas(result){
    var mask = result.mask;

    debugCanvas = document.createElement('canvas');
    debugCanvas.width = mask.cols;
    debugCanvas.height = mask.rows;

    drawResultMatrix(result);

    return debugCanvas;
  },

  highlight: function highlight(line, letter, result) {
    drawResultMatrix(result);

    var context = debugCanvas.getContext('2d');

    // //draw line bounding box
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
};

export { lamp };
