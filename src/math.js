var self = {
  mean: function (array){
    for(var s = 0, i = 0; i < array.length; i++) s += array[i];
    return s / array.length;
  },
  stdev: function (array) {
    for(var s = 0, ss = 0, i = 0; i < array.length; i++){
      s += array[i];
      ss += array[i] * array[i];
    }
    return Math.sqrt((ss - s * s / array.length) / (array.length - 1));
  },
  intersects: function(a, b){
    var width = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    var height = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    var min_area = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    return (width > 0 && height > 0) && (width * height) > 0.3 * min_area;
  },
  theta: function(index, imageData) {
    return Math.atan2(imageData.data[(index<<1) + 1], imageData.data[index<<1]);
  },
  index2Point: function index2Point (index, width) {
    return {
      x: index % width,
      y: Math.floor(index / width)
    };
  }
};

export default self;
