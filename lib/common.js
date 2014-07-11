(function(global) {
  'use strict';

  /**
   * complete an observable while a predicate is satisified, including last
   *
   * this behaves like `Rx.Observable.prototype.takeWhile`, but it includes the
   * last item from an observable that did not satisfy the predicate
   */
  Rx.Observable.prototype.takeWhileInclusive = function(predicate) {
    return Rx.Observable.create(function(o) {
      this.subscribe(
        function(val) {
          o.onNext(val);

          if (!predicate(val))
            o.onCompleted();
        },
        o.onError.bind(o),
        o.onCompleted.bind(o));
    }.bind(this));
  };

  /**
   * create a game state object
   *
   * @param Array{Number} order the order the player needs to produce
   * @param Array{Number} the keys pressed so far (optional)
   * @returns a game state object
   */
  function makeGameState(order, pressed) {
    return {
      order: order,
      pressed: pressed || []
    };
  }

  global.makeGameState = makeGameState;

  /**
   * the game's model
   *
   * these two functions create `Rx.Subject`'s that form the model for the
   * application. they are intended to be instantiate subjects shared by
   * different views.
   */
  global.model = {

    /**
     * create a subject that produces orderings
     *
     * this subject ignores the parameter given to it in `onNext` calls, and
     * produces orderings, which are just arrays of 4 numbers that the player
     * is required to press.
     */
    newGameStream: function() {
      var subject = new Rx.Subject();
      var observable = subject.map(function() {
          return _.range(4).map(function() {
            return Math.floor(Math.random() * 4);
          });
        })
        .share();

      return Rx.Subject.create(subject, observable);
    },

    /**
     * create a subject that produces game results
     *
     * the subject is created with a reference to the return value of
     * `newGameStream`. it accepts numbers in `onNext` calls, and those are
     * treated as inputs to the ordering derived from the given
     * `newGameStream`.
     */
    gameResultStream: function(newGameStream) {
      var numberSubject = new Rx.Subject();
      var observable = newGameStream
        .map(function(order) {
          return numberSubject
            .scan(makeGameState(order), function(state, value) {
              return makeGameState(state.order, state.pressed.concat([value]));
            })
            .takeWhileInclusive(function(state) {
              var prefix = state.order.slice(0, state.pressed.length);
              return _.isEqual(prefix, state.pressed);
            })
            .take(order.length)
            .last()
            .takeUntil(newGameStream);
        })
        .concatAll()
        .share();

      return Rx.Subject.create(numberSubject, observable);
    }
  };

})(window);
