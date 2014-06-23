var self = {
  equivalence_classes : function(elements, is_equal){
    var node = [];
    for(var i = 0; i < elements.length; i++){
      node.push({
        parent: 0,
        element: elements[i],
        rank: 0
      });
    }

    for(var i = 0; i < node.length; i++){
      var root = node[i];
      while(root.parent){
        root = root.parent;
      }

      for(var j = 0; j < node.length; j++){
        if(i === j) continue;
        if(!is_equal(node[i].element, node[j].element)) continue;
        var root2 = node[j];
        while(root2.parent){
          root2 = root2.parent;
        }
        if(root2 !== root){
          if(root.rank > root2.rank){
            root2.parent = root;
          }else{
            root.parent = root2;
            if(root.rank === root2.rank){
              root2.rank++;
            }
            root = root2;
          }
          var node2 = node[j];
          while(node2.parent){
            var temp = node2;
            node2 = node2.parent;
            temp.parent = root;
          }
          var node2 = node[i];
          while(node2.parent){
            var temp = node2;
            node2 = node2.parent;
            temp.parent = root;
          }
        }
      }
    }

    var index = 0;
    var clusters = [];
    for(var i = 0; i < node.length; i++){
      var j = -1;
      var node1 = node[i];
      while(node1.parent){
        node1 = node1.parent;
      }
      if(node1.rank >= 0){
        node1.rank = ~index++;
      }
      j = ~node1.rank;

      if(clusters[j]){
        clusters[j].push(elements[i]);
      }else{
        clusters[j] = [elements[i]];
      }
    }
    return clusters;
  },
  zigometer: function(set){
    debugger;
    var v_overlap = 2; // this is the allowable vertical extent

    if(set.length < 3) return 0; // cant calculate discrete 2nd deriv of 2 points
    set.sort(function(a, b){ return a.x1 - b.x1; }); // im debating whether this is a better metric than cx
    var last = set[0], lastdy, sigddy = 0;
    for(var i = 1; i < set.length; i++){
      var dy =  Math.max(v_overlap, Math.max(last.y0, set[i].y0) - Math.min(last.y1, set[i].y1)) - v_overlap;
      if(i > 1) sigddy += Math.abs(dy - lastdy);
      lastdy = dy;
      last = set[i];
    }
    return 1000 * sigddy;
  },
  bounding_box: function(set){
    var x0 = set[0].x0;
    var y0 = set[0].y0;
    var x1 = set[0].x1;
    var y1 = set[0].y1;

    for(var i = 1; i < set.length; i++){
      x0 = Math.min(x0, set[i].x0);
      y0 = Math.min(y0, set[i].y0);
      x1 = Math.max(x1, set[i].x1);
      y1 = Math.max(y1, set[i].y1);
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
    return self.compare(a.x1, b.x1);
  },
  getHeight: function (a) {
    return a.height;
  }
};

export default self;
