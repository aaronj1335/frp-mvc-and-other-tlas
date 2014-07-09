(function(global) {
  'use strict';

  function View(opts) {
    this.$ = $(opts.el);
    this.template = _.template($(opts.template).text());
  }

  View.prototype.render = function(data) {
    this.$.html(this.template({data: data}));
  };

  function GameView(opts) {
    View.apply(this, arguments);

    Rx.Observable.fromEvent(this.$, 'click')
      .filter(function(event) {
        return $(event.target).is('.number-buttons button');
      })
      .map(function(event) {
        return +$(event.target).val();
      })
      .subscribe(opts.results);

    opts.games.subscribe(this.render.bind(this));
    opts.results.subscribe(this.$.empty.bind(this.$));
  }

  GameView.prototype = Object.create(View.prototype);

  function ResultView(opts) {
    View.apply(this, arguments);

    opts.games.subscribe(this.$.empty.bind(this.$));
    opts.results
      .map(function(result) {
        return _.isEqual(result.pressed, result.order);
      })
      .subscribe(this.render.bind(this));
  }

  ResultView.prototype = Object.create(View.prototype);

  $(function() {
    var games = global.games = global.model.newGameStream();
    var results = global.results = global.model.gameResultStream(games);

    Rx.Observable.fromEvent($('[name=new-game]'), 'click')
      .subscribe(games);

    new GameView({
      el: $('.game'),
      template: '#game-template',
      games: games,
      results: results
    });

    new ResultView({
      el: $('.result'),
      template: '#result-template',
      games: games,
      results: results
    });
  });

})(window);
