var self = {
  createContainerDiv: function (x, y) {
    x = x || 0;
    y = y || 0;

    var container = document.createElement('div');
    document.body.appendChild(container);

    container.style.position="absolute";
    container.style.left = x + "px";
    container.style.top = y + "px";
    container.style.zIndex="1000";

    return container;
  },
  createCanvas: function (width, height, x, y) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    if(x && y) {
      canvas.style.position = 'absolute';
      canvas.style.left = x + 'px';
      canvas.style.top = y + 'px';
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }

    return canvas;
  },
  getOffsetRect: function (element) {
    var box = element.getBoundingClientRect();

    var body = document.body;
    var docElem = document.documentElement;

    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

    var clientTop = docElem.clientTop || body.clientTop || 0;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;

    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return {
      top: Math.round(top),
      left: Math.round(left),
      width: element.width,
      height: element.height
    };
  },
  getMousePosition: function (element, event) {
    var rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  },
  nodeName: function (node, name) {
    return (node.nodeName.toLowerCase() === name);
  }
};

export default self;
