var self = {
  applyGrayscale: function applyGrayscale(imageData) {
  },
  dilate: function dilate(regions, imageData){
    var dilateRadius = 4;

    var width = imageData.width;
    var height = imageData.height;

    var dilationMatrix = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);

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

          //mark outside
          dilationMatrix.data[contour] = 2;
        }
      }
    }

    return dilationMatrix;
  }
};

export default self;
