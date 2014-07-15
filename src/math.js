import utils from 'utils';

var self = {
  concaveHull: function(polygon) {
    var polygonForDelaunay = [];
    polygon.forEach(function (vertex) {
      polygonForDelaunay.push([vertex.x, vertex.y]);
    });
    var triangleVertex = Delaunay.triangulate(polygonForDelaunay);
    var triangles = [];
    for(var i = triangleVertex.length; i;) {
      var triangle = [];
      --i; triangle.push([polygon[triangleVertex[i]].x, polygon[triangleVertex[i]].y]);
      --i; triangle.push([polygon[triangleVertex[i]].x, polygon[triangleVertex[i]].y]);
      --i; triangle.push([polygon[triangleVertex[i]].x, polygon[triangleVertex[i]].y]);
      triangles.push(triangle);
    }
    function dsq (a,b) {
      var dx = a[0]-b[0], dy = a[1]-b[1];
      return dx*dx+dy*dy;
    }
    var alpha = 50;
    var asq = alpha*alpha;
    triangles.filter(function (t){
      return dsq(t[0],t[1]) < asq && dsq(t[0],t[2]) < asq && dsq(t[1],t[2]) < asq;
    });
    console.log(triangles);

      // var topLeftVertex = polygon[0];
      // polygon.sort(function (a, b){
      //   var atanA = Math.atan2((a.y - topLeftVertex.y),(a.x - topLeftVertex.x));
      //   var atanB = Math.atan2((b.y - topLeftVertex.y),(b.x - topLeftVertex.x));

      //   consoleTable.push({
      //     "a-index": a.index,
      //     "b-index": b.index,
      //     "atan-a": atanA,
      //     "atan-b": atanB,
      //     "diff": atanA - atanB});

      //   if(a.x >= topLeftVertex.x && b.x >= topLeftVertex.x) {
      //     return atanA - atanB;
      //   }
      //   console.log(a.index, b.index);
      //   return atanB - atanA;
      // });

      // console.table(consoleTable);

      // var topLeftVertex = polygon[0];
      // polygon.sort(function (a, b){
      //   var aTanA = Math.atan2((a.y - topLeftVertex.y),(a.x - topLeftVertex.x));
      //   var aTanB = Math.atan2((b.y - topLeftVertex.y),(b.x - topLeftVertex.x));

      //   if (aTanA < aTanB) return -1;
      //   else if (aTanB < aTanA) return 1;
      //   return 0;
      // });
  },
  translateRegions: function(regions, offset) {
    for (var i = 0; i < regions.length; i++) {
      regions[i].x0 -= offset.x;
      regions[i].y0 -= offset.y;
      regions[i].x1 -= offset.x;
      regions[i].y1 -= offset.y;
    }
  },
  pointInRegions: function(point, regions) {
    for(var i = 0; i < regions.length; i++) {
      var region = regions[i];
      if(utils.isBetweenBounds(point.x, point.y, region.x0, region.x1, region.y0, region.y1)) {
        return true;
      }
    }
    return false;
  },
  translatePolygon: function(polygon, offset) {
    for (var i = 0; i < polygon.length; i++) {
      polygon[i].index = i;
      polygon[i].x -= offset.x;
      polygon[i].y -= offset.y;
    }
  },
  /*
  http://en.wikipedia.org/wiki/Point_in_polygon
  ray-casting algorithm based on
  http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  */
  pointInPolygon: function (point, polygon) {
    var x = point.x;
    var y = point.y;
    var inside = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var xi = polygon[i].x;
      var yi = polygon[i].y;
      var xj = polygon[j].x;
      var yj = polygon[j].y;

      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect){
        inside = !inside;
      }
    }

    return inside;
  },
  pointToIndex: function (x, y, width) {
    return x + y * width;
  },
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
