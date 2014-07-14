import params from 'constants';

var self= {
  applySelection: function (selection, lines, callback) {
    if(!selection.start && !selection.end && typeof(callback) !== 'function') {
      return;
    }

    var start = lines[selection.start.line];
    var end = lines[selection.end.line];

    var padding = Math.max(
      params.padding * start.dimensions.height / 100,
      params.padding * end.dimensions.height / 100
    );

    //we need the letters
    var startLetter = start.letters[selection.start.letter];
    var endLetter = end.letters[selection.end.letter];

    if(selection.start.line === selection.end.line) {
      //since we are on the same line, we need to order the points left to right
      var left  = startLetter.bounds.x1 > endLetter.bounds.x1 ? endLetter : startLetter;
      var right = startLetter.bounds.x1 > endLetter.bounds.x1 ? startLetter : endLetter;

      callback({
        x0: Math.floor(left.bounds.x0 - padding),
        y0: Math.floor(start.bounds.y0 - padding),
        x1: Math.floor(right.bounds.x1 + 2 * padding),
        y1: Math.floor(end.bounds.y1 + 2 * padding)
      });
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
      callback({
        x0: Math.floor(topLetter.bounds.x0 - padding),
        y0: Math.floor(topLine.bounds.y0 - padding),
        x1: Math.floor(topLine.bounds.x1 + 2 * padding),
        y1: Math.floor(topLine.bounds.y1 + 2 * padding)
      });

      //fill the gap
      for(var l = top + 1; l <= bottom - 1; l++) {
        var line = lines[l];
        callback({
          x0: Math.floor(line.bounds.x0 - padding),
          y0: Math.floor(line.bounds.y0 - padding),
          x1: Math.floor(line.bounds.x1 + 2 * padding),
          y1: Math.floor(line.bounds.y1 + 2 * padding)
        });
      }

      //bottom
      callback({
        x0: Math.floor(bottomLine.bounds.x0 - padding),
        y0: Math.floor(bottomLine.bounds.y0 - padding),
        x1: Math.floor(bottomLetter.bounds.x1 + 2 * padding),
        y1: Math.floor(bottomLine.bounds.y1 + 2 * padding)
      })
    }
  }
};

export default self;
