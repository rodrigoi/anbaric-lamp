import params from 'constants';
import domUtils from 'dom-utils';

/*
https://github.com/naptha/naptha.github.io/blob/master/js/swt-worker.js#L3381
*/
function applyDilationRadius (regions, dilationMatrix){
  var dilateRadius = 4;
  var width = dilationMatrix.cols;

  //for every region, last to first
  for(var r = regions.length - 1; r >= 0; r--) {
    var region = regions[r];
    //for every letter on that region, last to first
    for(var l = region.letters.length - 1; l >=0; l--){
      var letter = region.letters[l];
      var contours = letter.contours;
      //for every contour, last to first
      for(var c = contours.length - 1; c >= 0; c--) {
        var contour = contours[c];

        //for point in a grid dilateRadius^2
        for(var x = -dilateRadius; x <= dilateRadius; x++) {
          for(var y = -dilateRadius; y <=dilateRadius; y++) {
            dilationMatrix.data[contour + x + y * width] = 1;
          }
        }
      }
    }
  }
}

function differentiate (regions, dilationMatrix) {
  for(var a = regions.length - 1; a >= 0; a--){
    for(var b = regions[a].letters.length - 1; b >= 0; b--){
      var c = regions[a].letters[b].contours;
      for(var i = c.length - 1; i >= 0; i--){
        dilationMatrix.data[c[i]] = 2
      }
    }
  }
}

var self = {
  getImageData: function (source){
    console.time('get image data from source');
    //we create an in memory canvas to to get the image data using the canvas' context.
    //it should have the same dimensions
    var canvas = domUtils.createCanvas(source.width, source.height);

    //now we draw the image on the canvas using the same width and height
    var context = canvas.getContext('2d');
    context.drawImage(source, 0, 0);

    //now we can get the image data and resolve the promise
    var data = context.getImageData(0, 0, source.width, source.height);

    console.timeEnd('get image data from source');
    return data;
  },
  createGreyScaleMatrix: function (imageData) {
    console.time('create greyscale from image data');
    //we need a matrix representing the greyscale image
    var greyScaleMatrix = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8C1_t);
    jsfeat.imgproc.grayscale(imageData.data, greyScaleMatrix.data);

    console.timeEnd('create greyscale from image data');
    return greyScaleMatrix;
  },
  createSobelMatrix: function (greyScaleMatrix) {
    console.time('create sobel derivatives from greyscale matrix');

    var sobelMatrix = new jsfeat.matrix_t(greyScaleMatrix.cols, greyScaleMatrix.rows, jsfeat.S32C2_t);
    jsfeat.imgproc.sobel_derivatives(greyScaleMatrix, sobelMatrix);

    console.timeEnd('create sobel derivatives from greyscale matrix');
    return sobelMatrix;
  },
  applyGaussianBlurAndCannyEdgeDetector: function (greyScaleMatrix) {
    console.time('apply gaussian blur and canny edge detector on greyscale matrix');

    var edgeMatrix = new jsfeat.matrix_t(greyScaleMatrix.cols, greyScaleMatrix.rows, jsfeat.U8C1_t);
    jsfeat.imgproc.gaussian_blur(greyScaleMatrix, edgeMatrix, 3, 0);
    // //now we need to run a canny edge detector on the greyscaled and blurred matrix
    jsfeat.imgproc.canny(edgeMatrix, edgeMatrix, params.low_thresh, params.high_thresh);

    console.timeEnd('apply gaussian blur and canny edge detector on greyscale matrix');
    return edgeMatrix;
  },
  dilate: function (regions, imageData){
    console.time('create morphological dilation matrix from letters');
    var width = imageData.width;
    var height = imageData.height;

    var dilationMatrix = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);

    applyDilationRadius(regions, dilationMatrix);

    differentiate(regions, dilationMatrix);

    console.timeEnd('create morphological dilation matrix from letters');
    return dilationMatrix;
  }
};

export default self;
