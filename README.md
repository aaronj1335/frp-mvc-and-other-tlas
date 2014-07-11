# frp, mvc, and other tla's

this repo shows an example of a simon-says game using frp (via [RxJS][]), and then the same implementation but with an mvc-driven separation of concerns.

### running

    # `npm install -g grunt-cli` if you don't already have it
    $ npm install
    $ grunt serve # could also just statically serve the repo dir

then visit:

- [http://localhost:1336/spaghetti/][]: just frp without mvc-driven separation of concerns
- [http://localhost:1336/vanilla-js-views/][]: frp with an mvc-driven separation of concerns, but no ui-framework
- [http://localhost:1336/react/][]: same as above, but using [react][] to give a more concrete example

for the latter two, the data model can be found in `lib/common.js`.

## motivation

functional reactive programming (frp) demos are impressive. two of my favorites are:

- the [flapjax paper][flapjax]'s [example of drag and drop][flapjax-dnd]
- [jafar husain][]'s example of [an auto-complete widget][netflix-autocomplete]

it's surprising that such succinct code can accomplish such messy tasks with so few abstractions. but when the elegance combines with unfamiliarity, it's easy to forget that wisdom we've learned through hard years on the front lines of app development:

- components need to be composable, decoupled, and testable
- isolate your application state
- don't repeat yourself

frp should be combined with the solid design patterns we know from mvc<a href=#footnote-0><sup>0</sup></a>. while those little demos seem to imply that frp supplants mvc, the two quite different. frp proposes a small set of primitives for managing state with data flow, whereas mvc separates application concerns.

in a good mvc app the state is in the model, so let's look at how we can use frp for the "M" and keep that separate from the "V".

## spaghetti

we'll start with an example of a simon-says game<a href=#footnote-1><sup>1</sup></a>, implemented in RxJS, but without any separation of concerns.

the game will show the user a sequence of numbers and a set of numbered buttons. the player pushes the buttons in the order of the numbers. they win if they get them all correct, otherwise it's a loss. they can restart the game at any time. here's an example:

<iframe src="http://aaronstacy.com/frp-mvc-and-other-tlas/spaghetti" width=150 height=165></iframe>

i know, i'm horrible at making games.

the code can be found in [`spaghetti/index.js`][spaghetti-index], but i've extracted the relevant part below. it reads top to bottom, so i've just explained the code inline.

    // this is a stream of click events
    var newGameClicks = Rx.Observable.fromEvent($newGameButton, 'click');

    // this ends up being a stream of game results, which emits every time a game
    // completes, but the road to get there is a bit complex, so it's explained
    // below
    newGameClicks
      // generate an array of numbers on every click
      .map(arrayOfRandomNumbers)

      // use the array of numbers as the data to render the game and pass it through
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
          .scan({order: order, pressed: []}, function(state, event) {
            var val = +$(event.target).val();
            return {
              order: state.order,
              pressed: state.pressed.concat([val])
            };
          })

          // we have 2 termination conditions:
          //
          // - wrong button press
          // - the player got them all correct
          //
          // so we make the stream of game-states end on either of the above
          // conditions. note this uses a helper function defined in lib/common.js
          // that acts the same as RxJS's `takeWhile`, except it includes the last
          // item.
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
      // flattened stream of the final game-states, so the call below takes out the
      // *inner* streams
      .concatAll()

      .do(renderResultAndHideGame)

      // in RxJS, these event streams aren't active til you call something like
      // subscribe or forEach
      .subscribe();

true to form this implements the game succinctly using common frp idioms, all built on one abstraction: the event stream (or `Observer` in RxJS parlance). it doesn't have the familiar looking class or view definitions we're used to seeing in popular mvc frameworks, but it's got all those side-effect free functions&hellip; surely this code that would garner a nod of approval from functional purists, right? this code doesn't feel right though. it's mixing our application's data model (the order of the numbers, the results of the games) with displaying the data.

it's the jquery spaghetti of functional javascript.

## what's wrong

we want to be able to evolve this app without changing the above code, but it's easy to think of features that would trip us up:

- adding keyboard shortcuts for pushing the number buttons
- reporting scores to a backend on wins/losses
- introducing alternative ways to start a new game, for instance by navigating via `pushState`

more generally, there are questions we can ask as a litmus test of whether our UI components are maintainable:

- can we create multiple views that act on the same data?
- are these views conducive to unit testing?
- could we automate the control of this app from the dev tools console?

the code above doesn't meet any of these.

## the underlying data model

the underlying data model of this application could look something like this:

- a stream of "new games" which are represented by an array of numbers in order that the player must match
- a stream of results, which include both the original order and the buttons the player pressed

the new game stream can't just be hard-coded to come from a single button's clicks though. we need a level of indirection where any event stream can be connected or disconnected from the new game stream dynamically.

## a decoupled approach

to accomplish this we'll have to introduce a new abstraction, something RxJS calls a `Subject` that both consumes and produces events.

    var subject = new Rx.Subject();
    subject.subscribe(console.log);
    subject.onNext('foo');
    // => 'foo'

we need to produce arrays of random numbers though, regardless of what is passed into the `onNext` call.

    var subject = new Rx.Subject()
    subject.map(createArrayOfRandomNumbers)
      .subscribe(console.log);
    subject.onNext('foo');
    // => [1, 3, 1, 0]

but now the problem is `map` returns a new observable, and we need a single object that both consumes the `onNext` calls and produces the arrays.

    var subject = new Rx.Subject();
    var observable = subject.map(createArrayOfRandomNumbers);

    var newGameStream = Rx.Subject.create(subject, observable);
    newGameStream.subscribe(console.log);
    newGameStream.onNext();
    // => [2, 2, 0, 3]

there's one more subtlety. the `observable` variable will produce a new value for each _subscription_, not `onNext` call. that means different observers would get different arrays of values, defeating the purpose of using a `Subject` in the first place.

    newGameStream.subscribe(console.log);
    newGameStream.subscribe(console.log.bind(console, 'second subscription:'));
    newGameStream.onNext();
    // => [0, 1, 3, 2]
    // => second subscription: [3, 3, 0, 1]

in cases where the behavior is deterministic, this would be preferable, since it insulates us from accidentally sharing data. however in this case we want every subscription to get the same value, so we'll publish the `Observable`.

    var subject = new Rx.Subject();
    var observable = subject.map(createArrayOfRandomNumbers)
      .publish();
    observable.connect();

    var newGameStream = Rx.Subject.create(subject, observable);
    newGameStream.subscribe(console.log);
    newGameStream.subscribe(console.log.bind(console, 'second subscription:'));
    newGameStream.onNext();
    // => [2, 1, 0, 3]
    // => second subscription: [2, 1, 0, 3]

a similar approach can be applied to the stream of results, allowing us to decouple the reactive data model from the views.

## tight views coupled loosely

the repo has the full listing of an frp-driven model for this game in [`lib/common.js`][model], and examples of using it with [plain js views][vanilla-view] and [react][react-view].

this design enables simple views responsible for nothing beyond converting the data to DOM. the views are modular and testable, and the model doesn't need to be modified for every new feature. we're reaping the benefits of frp while maintaining mvc's separation of concerns.

<a name=footnote-0>[0]</a>: there are different flavors of mvc, and this article is mostly concerned with the model and view, so i'm using "mvc" as a generic term.

<a name=footnote-1>[1]</a>: the idea for the game comes directly from [@lawnsea][]'s [talk][lawnsea-talk], which was kinda the inspiration for the post.

[flapjax-dnd]: http://www.flapjax-lang.org/try/index.html?edit=drag.html
[flapjax]: http://www.cs.brown.edu/~sk/Publications/Papers/Published/mgbcgbk-flapjax/
[Jafar Husain]: https://twitter.com/jhusain
[netflix-autocomplete]: https://www.youtube.com/watch?v=XRYN2xt11Ek#t=1243
[RxJS]: https://github.com/Reactive-Extensions/RxJS
[react]: http://facebook.github.io/react/
[http://localhost:1336/spaghetti/]: http://localhost:1336/spaghetti/
[http://localhost:1336/react/]: http://localhost:1336/react/
[http://localhost:1336/vanilla-js-views/]: http://localhost:1336/vanilla-js-views/
[@lawnsea]: https://twitter.com/lawnsea
[lawnsea-talk]: https://www.youtube.com/watch?v=D0N1NdE-9u0
[spaghetti-index]: https://github.com/aaronj1335/frp-mvc-and-other-tlas/blob/master/spaghetti/index.js
[model]: https://github.com/aaronj1335/frp-mvc-and-other-tlas/blob/master/lib/common.js#L47
[vanilla-view]: https://github.com/aaronj1335/frp-mvc-and-other-tlas/blob/master/vanilla-js-views/index.js
[react-view]: https://github.com/aaronj1335/frp-mvc-and-other-tlas/blob/master/react/index.js
