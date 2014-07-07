var self = {
  indexToPoint: function (index, width) {
    return {
      x: index % width,
      y: Math.floor(index / width)
    };
  },
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
  theta: function (index, imageData) {
    //https://github.com/inspirit/jsfeat/blob/gh-pages/sample_sobel_edge.html#L124
    return Math.atan2(imageData.data[(index<<1) + 1], imageData.data[index<<1]);
  }
};

export default self;
