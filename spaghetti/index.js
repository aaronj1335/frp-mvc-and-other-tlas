$(function() {
  'use strict';

  var makeGameState = window.makeGameState;
  var $newGameButton = $('[name=new-game]');
  var $game = $('.game');
  var $result = $('.result');
  var gameTemplate = _.template($('#game-template').text());
  var resultTemplate = _.template($('#result-template').text());

  function renderGameAndHideResult(order) {
    $result.empty();
    $game.html(gameTemplate({data: order}));
  }

  function showResult(result) {
    $result.html(resultTemplate({
      data: _.isEqual(result.order, result.pressed)
    }));
    $game.empty();
  }

  function randomSequenceOfNumbers() {
      return _.range(4).map(function() {
        return Math.floor(Math.random() * 4);
      });
  }

  // this is a stream of click events
  var newGameClicks = Rx.Observable.fromEvent($newGameButton, 'click');

  // this ends up being a stream of game results, which emits every time a game
  // completes, but the road to get there is a bit complex, so it's explained
  // below
  newGameClicks
    // generate an array of numbers on every click
    .map(randomSequenceOfNumbers)

    // use the array of numbers as the data to render the game
    .do(renderGameAndHideResult)

    .map(function(order) {
      // for each array of numbers, return an event stream of button-clicks
      return Rx.Observable.fromEvent($game.find('.number-buttons'), 'click')

        // on each click, given the previous state, we pass along the new
        // `gameState`, which contains 2 peices of information:
        //
        // - the original order
        // - the buttons pressed so far
        //
        // so after this call we get a stream of game-states which emits every
        // time the user clicks a number button
        .scan(makeGameState(order), function(state, event) {
          var val = +$(event.target).val();
          return makeGameState(state.order, state.pressed.concat([val]));
        })

        // we have 2 termination conditions:
        //
        // - wrong button press
        // - the player got them all correct
        //
        // so we make the stream of game-states end on either of the above
        // conditions. note this uses a helper function defined in
        // lib/common.js that acts the same as RxJS's `takeWhile`, except it
        // includes the last item.
        .takeWhileInclusive(function(state) {
          var prefix = state.order.slice(0, state.pressed.length);
          return _.isEqual(prefix, state.pressed);
        })
        .take(order.length)

        // we only want to concern ourselves with the state of things when the
        // game ends, so this returns a stream of only one game-state, which
        // emits on the last click
        .last()

        // also end the stream if the user requests a new game. this still
        // returns a stream of only one game-state
        .takeUntil(newGameClicks);
    })

    // now we've got a stream of streams of single game-states, analogous to a
    // nested array of objects -- `[[{}], [{}], ...]`. we really just want a
    // flattened stream of the final game-states, so the call below takes out
    // the *inner* streams
    .concatAll()

    .do(showResult)

    // in RxJS, these event streams aren't active til you call something like
    // subscribe or forEach
    .subscribe();
});

