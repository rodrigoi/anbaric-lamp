import domUtils from 'dom-utils';
import lineUtils from 'line-utils';
import letterUtils from 'letter-utils';
import utils from 'utils';
import selectionUtils from 'selection';

import params from 'constants';

function Illuminator(){
  
}

var me = this;

var canvas;
var context;
var selection = {};
var isMouseDown = false;

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
        if(isMouseDown && selection.start && selection.end) {
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
      if(selection.start && selection.end) {
        me.selectionCallback(selection);
      }
    }, true);

    selection = {
      start: {
        line: 0,
        letter: 1
      },
      end: {
        line: 1,
        letter: 15
      }
    };
    selectionCallback(selection);
  }
};

export default self;
