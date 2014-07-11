var self = {
  zigometer: function (letters){
    var verticalOverlap = 2; // this is the allowable vertical extent

    // cant calculate discrete 2nd deriv of 2 points
    if(letters.length < 3) {
      return 0;
    };

    letters.sort(self.compareXCenter);

    var last = letters[0];
    var lastdy;
    var sigddy = 0;
    for(var i = 1; i < letters.length; i++){
      var dy =  Math.max(verticalOverlap, Math.max(last.bounds.y0, letters[i].bounds.y0) - Math.min(last.bounds.y1, letters[i].bounds.y1)) - verticalOverlap;
      if(i > 1) {
        sigddy += Math.abs(dy - lastdy);
      }
      lastdy = dy;
      last = letters[i];
    }
    return sigddy;
  },
  isBetweenBounds: function (x, y, x0, x1, y0, y1){
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  },
  boxesIntersect: function(a, b){
    var width = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    var height = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    var min_area = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    return (width > 0 && height > 0) && (width * height) > 0.3 * min_area;
  },
  getBoundingBox: function(letters){
    var x0 = letters[0].bounds.x0;
    var y0 = letters[0].bounds.y0;
    var x1 = letters[0].bounds.x1;
    var y1 = letters[0].bounds.y1;

    for(var i = 1; i < letters.length; i++){
      x0 = Math.min(x0, letters[i].bounds.x0);
      y0 = Math.min(y0, letters[i].bounds.y0);
      x1 = Math.max(x1, letters[i].bounds.x1);
      y1 = Math.max(y1, letters[i].bounds.y1);
    }
    return {
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      width: x1 - x0,
      height: y1 - y0
    };
  },
  compare: function (a, b) {
    return a - b;
  },
  compareX: function (a, b) {
    return self.compare(a.bounds.x1, b.bounds.x1);
  },
  compareXCenter: function (a, b) {
    return a.center.x - b.center.x;
  },
  compareYCenter: function (a, b) {
    return a.center.y - b.center.y;
  },
  getHeight: function (a) {
    return a.dimensions.height;
  }
};

export default self;
