import domUtils from 'dom-utils';
import lineUtils from 'line-utils';
import letterUtils from 'letter-utils';
import selectionUtils from 'selection';

import params from 'constants';

function setCursor(canvas, cursor){
  canvas.style.cursor = cursor;
}

function drawSelection(canvas, lines, selection) {
  if(!selection.start && !selection.end) {
    return;
  }

  canvas.width = canvas.width;
  var context = canvas.getContext('2d');

  context.globalAlpha = params.alpha;
  context.fillStyle = params.color;
  context.beginPath();

  selectionUtils.applySelection(
    selection,
    lines,
    function (bounds) {
      context.rect(
        bounds.x0,
        bounds.y0,
        bounds.x1 - bounds.x0,
        bounds.y1 - bounds.y0
      );
    }
  );
  context.fill();
}

export default function (image, lines, moveCallback, selectionCallback) {
  var container = domUtils.createContainerDiv();
  var imageClientRect = domUtils.getOffsetRect(image);

  var canvas = domUtils.createCanvas(
    imageClientRect.width,
    imageClientRect.height,
    imageClientRect.left,
    imageClientRect.top
  );
  container.appendChild(canvas);

  var isMouseDown = false;
  var selection = {};

  canvas.addEventListener('mousemove', function (e) {
    var position = domUtils.getMousePosition(canvas, e);

    var closestLine = lineUtils.closestLine(position.x, position.y, lines);
    var closestLetter;

    if(closestLine){
      setCursor(canvas, closestLine ? 'text' : 'default');
      closestLetter =  letterUtils.closestLetter(position.x, position.y, closestLine.line);
    }

    if(closestLetter) {
      moveCallback(closestLine.index, closestLetter.index);
      selection.end = {
        line:   closestLine.index,
        letter: closestLetter.index
      };
      if(isMouseDown && selection.start && selection.end) {
        drawSelection(canvas, lines, selection);
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

  canvas.addEventListener('mouseup', function () {
    isMouseDown = false;
    if(selection.start && selection.end) {
      selectionCallback(selection);
    }
  }, true);

  // selection = {
  //   start: {
  //     line: 0,
  //     letter: 1
  //   },
  //   end: {
  //     line: 1,
  //     letter: 15
  //   }
  // };
  // selectionCallback(selection);

  return {
    container: container,
    canvas: canvas
  };
}
