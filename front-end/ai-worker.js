// ai-worker.js
// runs the hard AI in a background thread so the browser doesnt freeze
// the main thread sends us the game state, we pick a move and send it back

importScripts('./engine-bundle.js');

var Engine = self.MorabarabaEngine;

self.onmessage = function(e) {
  var state = e.data.state;
  var difficulty = e.data.difficulty;
  var move = null;

  if (difficulty === 'easy') {
    move = Engine.selectMoveEasy(state);
  } else if (difficulty === 'medium') {
    move = Engine.selectMoveMedium(state);
  } else if (difficulty === 'hard') {
    move = Engine.selectMoveHard(state);
  }

  self.postMessage({ move: move });
};
