/*
RGB -> XYZ
http://www.easyrgb.com/index.php?X=MATH&H=02#text2

XYZ -> CIE-L*ab
http://www.easyrgb.com/index.php?X=MATH&H=07#text7
*/

var self = {
  labFromImageData: function (index, imageData) {
    return self.rgbTolab([
      imageData.data[4 * index],
      imageData.data[4 * index + 1],
      imageData.data[4 * index + 2]
    ]);
  },
  /*
  https://github.com/naptha/naptha.github.io/blob/master/js/swt-worker.js#L2188
  */
  rgbTolab: function (rgb){
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;
    var x;
    var y;
    var z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
  },
  /*
  https://github.com/naptha/naptha.github.io/blob/master/js/swt-worker.js#L3407
  */
  colorFilter: function (regions, imageData, dilationMatrix) {
    console.time('create color filter matrix from letters and dilation matrix');
    var width = imageData.width;
    var height = imageData.height;

    var pixelMap = new Uint16Array(width * height);
    var intoct = new Uint32Array(16 * 16 * 16);
    var extoct = new Uint32Array(16 * 16 * 16);
    var zeroes = new Uint32Array(16 * 16 * 16);

    var padding = {
      x: 30,
      y: 20
    };

    var marker = new jsfeat.matrix_t(width, height, jsfeat.U8C1_t);

    //for every region
    for(var r = 0; r < regions.length; r++) {
      var region = regions[r];
      intoct.set(zeroes);
      extoct.set(zeroes);

      //get region bounds
      var bounds = {
        x0: Math.max(0, region.bounds.x0 - padding.x),
        y0: Math.max(0, region.bounds.y0 - padding.y),
        x1: Math.min(width, region.bounds.x1 + padding.x),
        y1: Math.min(height, region.bounds.y1 + padding.y)
      };

      var color;
      var x = bounds.x0;
      var y;
      for(; x < bounds.x1; x++) {
        y = bounds.y0;
        for (; y < bounds.y1; y++) {

          var index = x + y * width;
          var lab = self.labFromImageData(index, imageData);

          color = Math.round((2 * lab[0] + 40) / 16) |
            Math.round((lab[1] + 128) / 16) << 4 |
            Math.round((lab[2] + 128) / 16) << 8;

          pixelMap[index] = color;
          if(dilationMatrix.data[index] === 1) {
            extoct[color]++;
            extoct[color+1]++;
            extoct[color-1]++;
            extoct[color+16]++;
            extoct[color-16]++;
            extoct[color+256]++;
            extoct[color-256]++;
          } else if (dilationMatrix.data[index] === 2) {
            intoct[color]++;
            intoct[color+1]++;
            intoct[color-1]++;
            intoct[color+16]++;
            intoct[color-16]++;
            intoct[color+256]++;
            intoct[color-256]++;
          }
        }
      }

      for(y = bounds.y0; y < bounds.y1; y++){
        for(x = bounds.x0; x < bounds.x1; x++){
          var p = x + y * width;
          color = pixelMap[p];
          if(intoct[color] / (1 + extoct[color]) > 3){
            marker.data[p] = Math.min(255, 2 * (intoct[color] / (1 + extoct[color])));
          }
        }
      }
    }

    console.timeEnd('create color filter matrix from letters and dilation matrix');
    return marker;
  }
};

export default self;
