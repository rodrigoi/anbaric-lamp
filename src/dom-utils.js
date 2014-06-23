var self = {
  getOffsetRect: function getOffsetRect (element) {
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
  getMousePosition: function getMousePosition(element, event) {
    var rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  },
  nodeName: function nodeName(node, name) {
    return !!(node.nodeName.toLowerCase() === name);
  }
};

export default self;
