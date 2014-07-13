import domUtils from 'dom-utils';
import lineUtils from 'line-utils';
import letterUtils from 'letter-utils';
import utils from 'utils';

var me = this;

var canvas;
var context;
var selection = {};
var isMouseDown = false;

var params = {
  alpha: 0.8,       //selection box alpha
  color: '#CBDDF5', //selection box color
  padding: 20       //padding in percentage of line height for selection box
};

function setCursor(cursor){
  canvas.style.cursor = cursor;
}

function drawSelection(lines) {
  if(!selection.start && !selection.end) {
    return;
  }

  canvas.width = canvas.width;
  var context = canvas.getContext('2d');

  context.globalAlpha = params.alpha;
  context.fillStyle = params.color;
  context.beginPath();

  var start = lines[selection.start.line];
  var end = lines[selection.end.line];

  var padding = Math.max(
    params.padding * start.dimensions.height / 100,
    params.padding * end.dimensions.height / 100
    );

  //we need the letters
  var startLetter = start.letters[selection.start.letter];
  var endLetter = end.letters[selection.end.letter];

  //we have a selection on the same line
  if(selection.start.line === selection.end.line) {
    //since we are on the same line, we need to order the points left to right
    var left  = startLetter.bounds.x1 > endLetter.bounds.x1 ? endLetter : startLetter;
    var right = startLetter.bounds.x1 > endLetter.bounds.x1 ? startLetter : endLetter;

    context.rect(
      left.bounds.x0 - padding,
      start.bounds.y0 - padding,
      right.bounds.x1 - left.bounds.x0 + 2 * padding,
      end.bounds.y1 - start.bounds.y0 + 2 * padding
    );
    context.fill();
  } else {
    //we are on different lines, left and right no matter, only top and bottom
    //top always select to the end of the line, while bottom selects
    //from the start, for ltr languages.
    var top    = Math.min(selection.start.line, selection.end.line);
    var bottom = Math.max(selection.start.line, selection.end.line);

    var topLine    = lines[top];
    var bottomLine = lines[bottom];

    var topLetter    = startLetter.bounds.y0 > endLetter.bounds.y0 ? endLetter : startLetter;
    var bottomLetter = startLetter.bounds.y0 > endLetter.bounds.y0 ? startLetter : endLetter;

    //top
    context.rect(
      topLetter.bounds.x0 - padding,
      topLine.bounds.y0 - padding,
      topLine.bounds.x1 - topLetter.bounds.x0 + 2 * padding,
      topLine.bounds.y1 - topLine.bounds.y0 + 2 * padding
    );

    //bottom
    context.rect(
      bottomLine.bounds.x0 - padding,
      bottomLine.bounds.y0 - padding,
      bottomLetter.bounds.x1 - bottomLine.bounds.x0 + 2 * padding,
      bottomLine.bounds.y1 - bottomLine.bounds.y0 + 2 * padding
    );

    //fill the gap
    for(var l = top + 1; l <= bottom - 1; l++) {
      var line = lines[l];
      context.rect(
        line.bounds.x0 - padding,
        line.bounds.y0 - padding,
        line.bounds.x1 - line.bounds.x0 + 2 * padding,
        line.bounds.y1 - line.bounds.y0 + 2 * padding
      );
    }

    context.fill();
  }
}

var self = {
  foo: function (image, lines, moveCallback, selectionCallback) {
    me.lines = lines;
    me.moveCallback = moveCallback;
    me.selectionCallback = selectionCallback;

    var container = domUtils.createContainerDiv();
    var imageClientRect = domUtils.getOffsetRect(image);

    canvas = domUtils.createCanvas(
      imageClientRect.width,
      imageClientRect.height,
      imageClientRect.left,
      imageClientRect.top
    );
    container.appendChild(canvas);

    canvas.addEventListener('mousemove', function (e) {
      var position = domUtils.getMousePosition(canvas, e);

      var closestLine = lineUtils.closestLine(position.x, position.y, lines);
      var closestLetter;

      if(closestLine){
        setCursor(closestLine ? 'text' : 'default');
        closestLetter =  letterUtils.closestLetter(position.x, position.y, closestLine.line);
      }

      if(closestLetter) {
        me.moveCallback(closestLine.index, closestLetter.index);
        selection.end = {
          line:   closestLine.index,
          letter: closestLetter.index
        }
        if(isMouseDown) {
          drawSelection(lines);
        }
      }
    }, true);

    canvas.addEventListener('mousedown', function (e) {
      var position = domUtils.getMousePosition(canvas, e);

      var closestLine = lineUtils.closestLine(position.x, position.y, lines);
      var closestLetter;

      if(closestLine){
        closestLetter =  letterUtils.closestLetter(position.x, position.y, closestLine.line);
      }

      if(closestLetter) {
        selection.start = {
          line:   closestLine.index,
          letter: closestLetter.index
        };
      }

      isMouseDown = true;
    }, true);

    canvas.addEventListener('mouseup', function (e) {
      isMouseDown = false;
      me.selectionCallback(selection);
    }, true);

    // selection = {
    //   start: {
    //     line: 0,
    //     letter: 1
    //   },
    //   end: {
    //     line: 0,
    //     letter: 15
    //   }
    // };
    // selectionCallback(selection);
  }
};

export default self;
