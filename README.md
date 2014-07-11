# reactive programming and mvc

this repo shows an example of a simon-says game using reactive programming (via [RxJS][]), and then the same implementation but with an mvc-driven separation of concerns.

### running

    # `npm install -g grunt-cli` if you don't already have it
    $ npm install
    $ grunt serve # could also just statically serve the repo dir

then visit:

- [http://localhost:1336/spaghetti/][]: just reactive without mvc-driven separation of concerns
- [http://localhost:1336/vanilla-js-views/][]: reactive with an mvc-driven separation of concerns, but no ui-framework
- [http://localhost:1336/react/][]: same as above, but using [react][] to give a more concrete example

for the latter two, the data model can be found in `lib/common.js`.

i wrote up [a post][post] with an in-depth description.

[RxJS]: https://github.com/Reactive-Extensions/RxJS
[post]: http://aaronstacy.com/writings/frp-mvc-and-other-tlas/
[http://localhost:1336/spaghetti/]: http://localhost:1336/spaghetti/
[http://localhost:1336/react/]: http://localhost:1336/react/
[http://localhost:1336/vanilla-js-views/]: http://localhost:1336/vanilla-js-views/
