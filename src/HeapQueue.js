function HeapQueue(cmp){
  this.cmp = (cmp || function(a, b){
    return a - b;
  });
  this.length = 0;
  this.data = [];
}

HeapQueue.prototype.peek = function(){
  return this.data[0];
};

HeapQueue.prototype.push = function(value){
  this.data.push(value);
  var pos = this.data.length - 1;
  var parent, x;

  while(pos > 0){
    parent = (pos - 1) >>> 1;

    if(this.cmp(this.data[pos], this.data[parent]) < 0) {
      x = this.data[parent];
      this.data[parent] = this.data[pos];
      this.data[pos] = x;
      pos = parent;
    } else break;
  }
  return ++this.length;
};

HeapQueue.prototype.pop = function(){
  var ret = this.data[0];
  var last_val = this.data.pop();

  this.length--;
  if(this.data.length > 0){
    this.data[0] = last_val;
    var pos = 0;
    var last = this.data.length - 1;
    var left;
    var right;
    var minIndex;
    var x;

    while(1){
      left = (pos << 1) + 1;
      right = left + 1;
      minIndex = pos;

      if(left <= last && this.cmp(this.data[left], this.data[minIndex]) < 0) minIndex = left;
      if(right <= last && this.cmp(this.data[right], this.data[minIndex]) < 0) minIndex = right;
      if(minIndex !== pos){
        x = this.data[minIndex];
        this.data[minIndex] = this.data[pos];
        this.data[pos] = x;
        pos = minIndex;
      } else break;
    }
  }
  return ret;
};

export default HeapQueue;
