import domUtils from 'dom-utils';
import utils from 'utils';

var me = this;

var rst;
//var lines;
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

function findClosestLine(x, y, lines) {
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if(utils.isBetweenBounds(x, y, line.bounds.x0, line.bounds.x1, line.bounds.y0, line.bounds.y1)) {
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
    if(utils.isBetweenBounds(x, y, letter.bounds.x0, letter.bounds.x1, letter.bounds.y0, letter.bounds.y1)) {
      return {
        index: i,
        letter: letter,
        line: closestLine
      };
    }
  };
}

function getSelectionText() {
  var selectionText = [];
  if(lines && selection) {
    for(var l = selection.start.lineIndex; l <= selection.end.lineIndex; l++) {
      var line = lines[l];

      var selectionStarts = l === selection.start.lineIndex ?
        selection.start.letterIndex : 0;
      var selectionEnds   = l === selection.end.lineIndex ?
        selection.end.letterIndex : line.letters.length - 1;

      var lineText = [];
      for(var c = selectionStarts; c <= selectionEnds; c++) {
        lineText.push(line.letters[c].OCR);
      }
      selectionText.push(lineText.join(''));
    }
  }

  return selectionText.join('\n');
}

function mousemove(e){
  var position = domUtils.getMousePosition(canvas, e);

  if(me.lines){

    var closestLine = findClosestLine(position.x, position.y, lines);
    var closestLetter = findClosestLetter(position.x, position.y, lines);

    if(closestLine){
      setCursor(closestLetter ? 'text' : 'default');
    }

    if(closestLetter) {
      me.moveCallback(closestLetter.line.index, closestLetter.index);
      selection.end = {
        lineIndex: closestLetter.line.index,
        line: closestLetter.line.line,
        letterIndex: closestLetter.index,
        letter: closestLetter.letter
      }

      if(isMouseDown) {
        drawSelection();
        // clipboard.setClipboard(getSelectionText());
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
  me.selectionCallback();
}

function setCursor(cursor){
  canvas.style.cursor = cursor;
}

function drawSelection() {
  canvas.width = canvas.width;
  var context = canvas.getContext('2d');
  context.globalAlpha = params.alpha;
  context.fillStyle = params.color;
  context.beginPath();

  var paddingTop    = params.padding * selection.start.line.dimensions.height / 100;
  var paddingBottom = params.padding * selection.end.line.dimensions.height / 100;

  if(selection.start && selection.end) {
    var lineGap = Math.abs(selection.start.lineIndex - selection.end.lineIndex);

    //we stay on the same line
    if(lineGap === 0) {
      context.moveTo(selection.start.letter.bounds.x0, selection.start.line.bounds.y0 - paddingTop);
      context.lineTo(selection.end.letter.bounds.x1, selection.end.line.bounds.y0 - paddingTop);
      context.lineTo(selection.end.letter.bounds.x1, selection.end.line.bounds.y1 + paddingBottom);
      context.lineTo(selection.start.letter.bounds.x0, selection.start.line.bounds.y1 + paddingBottom);
    } else { //we jump up or down to another line.
      if(selection.start.lineIndex > selection.end.lineIndex) { //we are going up

        context.moveTo(selection.start.letter.bounds.x1, selection.start.line.bounds.y1 + paddingBottom);
        context.lineTo(selection.start.line.bounds.x0,   selection.start.line.bounds.y1 + paddingBottom);
        context.lineTo(selection.start.line.bounds.x0,   selection.start.line.bounds.y0 - paddingTop);
        context.lineTo(selection.end.letter.bounds.x0,   selection.end.line.bounds.y1   + paddingBottom);
        context.lineTo(selection.end.letter.bounds.x0,   selection.end.line.bounds.y0   - paddingTop);
        context.lineTo(selection.end.line.bounds.x1,     selection.end.line.bounds.y0   - paddingTop);
        context.lineTo(selection.end.line.bounds.x1,     selection.end.line.bounds.y1   + paddingBottom);
        context.lineTo(selection.start.letter.bounds.x1, selection.start.line.bounds.y0 - paddingTop);
        context.lineTo(selection.start.letter.bounds.x1, selection.start.line.bounds.y1 + paddingBottom);

      } else { //we are going down

        context.moveTo(selection.start.letter.bounds.x0, selection.start.line.bounds.y0 - paddingTop);
        context.lineTo(selection.start.line.bounds.x1,   selection.start.line.bounds.y0 - paddingTop);
        context.lineTo(selection.start.line.bounds.x1,   selection.start.line.bounds.y1 + paddingBottom);
        context.lineTo(selection.end.letter.bounds.x1,   selection.end.line.bounds.y0   - paddingTop);
        context.lineTo(selection.end.letter.bounds.x1,   selection.end.line.bounds.y1   + paddingBottom);
        context.lineTo(selection.end.line.bounds.x0,     selection.end.line.bounds.y1   + paddingBottom);
        context.lineTo(selection.end.line.bounds.x0,     selection.end.line.bounds.y0   - paddingTop);
        context.lineTo(selection.start.letter.bounds.x0, selection.start.line.bounds.y1 + paddingBottom);
        context.lineTo(selection.start.letter.bounds.x0, selection.start.line.bounds.y0 - paddingTop);

      }
    }
    context.fill();
  }
}

var self = {
  foo: function (image, lines, moveCallback, selectionCallback) {
    me.lines = lines;
    img = image;
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

    canvas.addEventListener('mousemove', mousemove, true);
    canvas.addEventListener('mousedown', mousedown, true);
    canvas.addEventListener('mouseup', mouseup, true);
  }
};

export default self;
