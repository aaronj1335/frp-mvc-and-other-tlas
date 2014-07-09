(function(global) {
  'use strict';

  var gameState = global.gameState;
  var DOM = React.DOM;

  var Game = React.createClass({
    componentWillMount: function() {
      var replaceState = this.replaceState.bind(this);

      this.props.games.subscribe(_.compose(replaceState, gameState));
      this.props.results.subscribe(_.partial(replaceState, {}, null));
    },

    handleClick: function(event) {
      this.props.results.onNext(+event.target.value);
    },

    render: function() {
      if (!this.state || !this.state.order)
        return React.DOM.text();

      return DOM.div(null,
        DOM.h3(null, 'Order'),
        DOM.ul(null,
          this.state.order
            .map(function(num) {
              return DOM.li(null, num);
            })),
        DOM.div({
            className: 'number-buttons',
            onClick: this.handleClick
          },
          this.state.order
            .map(function(num, i) {
              return DOM.button({type: 'button', value: i}, i);
            })));
    }
  });

  var Result = React.createClass({
    componentWillMount: function() {
      var replaceState = this.replaceState.bind(this);
      this.props.games.subscribe(_.compose(replaceState, gameState));
      this.props.results.subscribe(replaceState);
    },

    getInitialState: gameState,

    render: function() {
      if (!this.state.pressed.length)
        return DOM.text();

      var text = _.isEqual(this.state.pressed, this.state.order)?
        'you won' : 'really?';

      return DOM.h1(null, text);
    }
  });

  var games = global.games = global.model.newGameStream();
  var results = global.results = global.model.gameResultStream(games);

  Rx.Observable.fromEvent(document.querySelector('[name=new-game]'), 'click')
    .subscribe(games);

  React.renderComponent(Game({
    games: games,
    results: results
  }), document.getElementsByClassName('game')[0]);

  React.renderComponent(Result({
    games: games,
    results: results
  }), document.getElementsByClassName('result')[0]);

})(window);
