import params from 'constants';

import math from 'math';
import lineUtils from 'line-utils';
import letterUtils from 'letter-utils';
import colors from 'colors';
import utils from 'utils';
import graphics from 'graphics';

import mocks from 'mocks';

function strokeWidthTransform(imageData, cannyImage, sobelImage, darkOnLight){
  console.group(darkOnLight ? 'dark on light' : 'light on dark');
  console.time('total processing time');

  var strokeWidthMatrix = createStrokeWidthMatrix(cannyImage, sobelImage, darkOnLight);

  //first attempt on the raw stroke width transformation
  var letters = letterUtils.findLetters(strokeWidthMatrix);
  var lines = lineUtils.findLines(letters);

  //this is a clever thing Naptha does. Once we have line candidates
  //we can run a morphological dilation and use the result
  //to improve the quality by running again using that data
  var dilationMatrix = graphics.dilate(lines, imageData);
  var marker = colors.colorFilter(lines, imageData, dilationMatrix);

  letters = letterUtils.findLetters(strokeWidthMatrix, marker);
  lines = lineUtils.findLines(letters);

  console.log(lines);

  console.timeEnd('total processing time');
  console.groupEnd();
  return lines;
}

function createStrokeWidthMatrix(cannyImage, sobelImage, darkOnLight){
  console.time('create stroke width matrix');

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
    var origin = math.indexToPoint(i, width);
    var ray = createRay(cannyImage, i, origin.x, origin.y, theta, width, height, darkOnLight);
    rays.push(ray);
    calculateStrokeWidth(strokeWidthMatrix, sobelImage, ray, theta, origin.x, origin.y, width);
  }

  console.timeEnd('create stroke width matrix');
  return strokeWidthMatrix;
}

function calculateStrokeWidth(strokeWidthMatrix, sobelImage, ray, originTheta, originX, originY, width) {
  //a ray has at least one point, the starting point
  //there is no need to do boundary checks.

  //we get the angle of the gradient at the end of the ray
  var theta = math.theta(ray[ray.length - 1], sobelImage);
  var point = math.indexToPoint(ray[ray.length - 1], width);

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

  //direction of the gradient
  var direction = darkOnLight ? -1 : 1;

  //stating ray index
  var ray = [index];
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

var swt = {
  transform: function (imageData, cannyImage, sobelImage) {
    var darkOnLightLines = strokeWidthTransform(imageData, cannyImage, sobelImage, true);
    var lightOnDarkLines = strokeWidthTransform(imageData, cannyImage, sobelImage, false);

    var lines = darkOnLightLines
      .concat(lightOnDarkLines)
      .sort(function(a, b){
        return a.center.y - b.center.y;
      });

    return lines;
    // return mocks;
  }
};

export default swt;
