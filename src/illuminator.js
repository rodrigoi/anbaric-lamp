import domUtils from 'dom-utils';

var me = this;

var rst;
var lines;
var img;
var canvas;
var context;
var cbk;
var selection = {};
var isMouseDown = false;

var params = {
  alpha: 0.8,       //selection box alpha
  color: '#CBDDF5', //selection box color
  padding: 3        //padding in percentage of line height for selection box
};

function isBetweenBounds(x, y, x0, x1, y0, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function findClosestLine(x, y, lines) {
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if(isBetweenBounds(x, y, line.x0, line.x1, line.y0, line.y1)) {
      return {
        index: i,
        line: line
      };
    }
  };
}

function findClosestLetter(x, y, lines) {
  var closestLine = findClosestLine(x, y, lines);

  if(!closestLine) {
    return null;
  }

  var letters = closestLine.line.letters;

  for (var i = 0; i < letters.length; i++) {
    var letter = letters[i];
    if(isBetweenBounds(x, y, letter.x0, letter.x1, letter.y0, letter.y1)) {
      return {
        index: i,
        letter: letter,
        line: closestLine
      };
    }
  };
}

function mousemove(e){
  if(lines){
    var position = domUtils.getMousePosition(canvas, e);

    var closestLine = findClosestLine(position.x, position.y, lines);
    var closestLetter = findClosestLetter(position.x, position.y, lines);

    if(closestLine){
      setCursor(closestLetter ? 'text' : 'default');
    }

    if(closestLetter) {
      cbk(closestLetter.line.index, closestLetter.index, rst);
      selection.end = {
        lineIndex: closestLetter.line.index,
        line: closestLetter.line.line,
        letterIndex: closestLetter.index,
        letter: closestLetter.letter
      }
      if(isMouseDown) {
        drawSelection();
      }
    }
  }
}

function mousedown(e){
  var position = domUtils.getMousePosition(canvas, e);

  var closestLetter = findClosestLetter(position.x, position.y, lines);
  if(closestLetter) {
    selection.start = {
      lineIndex: closestLetter.line.index,
      line: closestLetter.line.line,
      letterIndex: closestLetter.index,
      letter: closestLetter.letter
    };
  }

  isMouseDown = true;
}

function mouseup(e){
  isMouseDown = false;
}

function setCursor(cursor){
  canvas.style.cursor = cursor;
}

function createContainerDiv(x, y) {
  x = x || 0;
  y = y || 0;

  var container = document.createElement('div');
  document.body.appendChild(container);
  container.id = 'anbaric_selection_container';
  container.style.position="absolute";
  container.style.left = x + "px";
  container.style.top = y + "px";
  container.style.zIndex="1000";

  return container;
}

function createCanvas(x, y, width, height) {
  canvas = document.createElement('canvas');

  canvas.style.position = 'absolute';
  canvas.style.left = x + 'px';
  canvas.style.top = y + 'px';
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

function drawSelection() {
  canvas.width = canvas.width;
  var context = canvas.getContext('2d');
  context.globalAlpha = params.alpha;
  context.fillStyle = params.color;
  context.beginPath();

  var paddingTop = params.padding * selection.start.line.height / 100;
  var paddingBottom = params.padding * selection.end.line.height / 100;

  if(selection.start && selection.end) {
    var lineGap = Math.abs(selection.start.lineIndex - selection.end.lineIndex);

    //we stay on the same line
    if(lineGap === 0) {
      context.moveTo(selection.start.letter.x0, selection.start.line.y0 - paddingTop);
      context.lineTo(selection.end.letter.x1, selection.end.line.y0 - paddingTop);
      context.lineTo(selection.end.letter.x1, selection.end.line.y1 + paddingBottom);
      context.lineTo(selection.start.letter.x0, selection.start.line.y1 + paddingBottom);
    } else { //we jump up or down to another line.
      if(selection.start.lineIndex > selection.end.lineIndex) { //we are going up

        context.moveTo(selection.start.letter.x1, selection.start.line.y1 + paddingBottom);
        context.lineTo(selection.start.line.x0,   selection.start.line.y1 + paddingBottom);
        context.lineTo(selection.start.line.x0,   selection.start.line.y0 - paddingTop);
        context.lineTo(selection.end.letter.x0,   selection.end.line.y1   + paddingBottom);
        context.lineTo(selection.end.letter.x0,   selection.end.line.y0   - paddingTop);
        context.lineTo(selection.end.line.x1,     selection.end.line.y0   - paddingTop);
        context.lineTo(selection.end.line.x1,     selection.end.line.y1   + paddingBottom);
        context.lineTo(selection.start.letter.x1, selection.start.line.y0 - paddingTop);
        context.lineTo(selection.start.letter.x1, selection.start.line.y1 + paddingBottom);

      } else { //we are going down

        context.moveTo(selection.start.letter.x0, selection.start.line.y0 - paddingTop);
        context.lineTo(selection.start.line.x1,   selection.start.line.y0 - paddingTop);
        context.lineTo(selection.start.line.x1,   selection.start.line.y1 + paddingBottom);
        context.lineTo(selection.end.letter.x1,   selection.end.line.y0   - paddingTop);
        context.lineTo(selection.end.letter.x1,   selection.end.line.y1   + paddingBottom);
        context.lineTo(selection.end.line.x0,     selection.end.line.y1   + paddingBottom);
        context.lineTo(selection.end.line.x0,     selection.end.line.y0   - paddingTop);
        context.lineTo(selection.start.letter.x0, selection.start.line.y1 + paddingBottom);
        context.lineTo(selection.start.letter.x0, selection.start.line.y0 - paddingTop);
      }
    }
    context.fill();
  }
}

var self = {
  foo: function (image, result, callback) {
    rst = result;
    lines = result.lines;
    img = image;
    cbk = callback;

    var container = createContainerDiv();
    var imageClientRect = domUtils.getOffsetRect(image);

    canvas = createCanvas(
      imageClientRect.left,
      imageClientRect.top,
      imageClientRect.width,
      imageClientRect.height
    );
    container.appendChild(canvas);

    canvas.addEventListener('mousemove', mousemove, true);
    canvas.addEventListener('mousedown', mousedown, true);
    canvas.addEventListener('mouseup', mouseup, true);
  }
};

export default self;
