(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DiceView = undefined;

var _DecisionListState = require('./Models/DecisionListState');

var _ComponentState = require('./Models/ComponentState');

var _constants = require('./Utils/constants');

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create the home page
// control fetching lists of decision dice and input as html
var DiceView = function DiceView(ctx) {
  var id = ctx.params.id;
  console.log('dice view');
  console.log(id);
  // Promise.all([getDiceById(id), getComponent('decision-page'), getComponent('decision-option')])
  //   .then((payload) => {
  //     payload[0].forEach(dice => {
  //       createDecisionPage(dice, payload[1]);
  //     })
  //   })
  //   .catch(err => console.log(err));
};

var createDecisionPage = function createDecisionPage() {};

exports.default = DiceView;
exports.DiceView = DiceView;

},{"./Models/ComponentState":4,"./Models/DecisionListState":5,"./Utils/StringReplacer":8,"./Utils/constants":9}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDecisionCard = exports.viewHome = undefined;

var _DecisionListState = require('./Models/DecisionListState');

var _ComponentState = require('./Models/ComponentState');

var _constants = require('./Utils/constants');

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create the home page
// control fetching lists of decision dice and input as html
var viewHome = function viewHome() {
  console.log('viewHome');
  var diceArray = void 0;
  Promise.all([(0, _DecisionListState.getDice)(), (0, _ComponentState.getComponent)('decision-card')]).then(function (payload) {
    if (payload[0].length === 0) {
      console.log('there is no data');
    } else {
      payload[0].forEach(function (dice) {
        createDecisionCard(dice, payload[1]);
      });
    }
  }).catch(function (err) {
    return console.log(err);
  });
};

// get template for each decision and display it
function createDecisionCard(dice, component) {
  var map = {
    '@title': dice.decision,
    '@description': 'to be determined'
  };
  var card = (0, _StringReplacer2.default)(component, map);
  $('.js-main-content').append(card);
  $('.js-roll').click(function (e) {
    e.stopImmediatePropagation();
    dice.roll().then(function (result) {
      return alert(result.content);
    });
  });
};

// Home = viewHome;
exports.viewHome = viewHome;
exports.createDecisionCard = createDecisionCard;

},{"./Models/ComponentState":4,"./Models/DecisionListState":5,"./Utils/StringReplacer":8,"./Utils/constants":9}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getComponent = undefined;

var _constants = require('../Utils/constants');

var COMPONENTS_OBJ = {};

// add component to COMPONENTS_OBJ for caching
var addComponentToState = function addComponentToState(key, component) {
  COMPONENTS_OBJ[key] = component;
  return;
};

// return a COMPONENT by key from in-memory
var getComponent = function getComponent(key) {
  return new Promise(function (res) {
    if (COMPONENTS_OBJ[key]) {
      res(COMPONENTS_OBJ[key]);
    } else {
      getComponentAPI(key).then(function () {
        return res(COMPONENTS_OBJ[key]);
      });
    }
  });
};

// get component templates from api
var getComponentAPI = function getComponentAPI(name) {
  return new Promise(function (res, rej) {
    var target = '/static/' + name + '.html';
    var urlString = '' + target;
    $.ajax({ url: urlString }).done(function (component) {
      addComponentToState(name, component);
      res(component);
      return;
    }).fail(function (err) {
      rej('cannot get component - Error: ' + err);
    });
  });
};

exports.getComponent = getComponent;

},{"../Utils/constants":9}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDiceById = exports.getDice = undefined;

var _DiceModel = require('./DiceModel');

var _DiceModel2 = _interopRequireDefault(_DiceModel);

var _constants = require('../Utils/constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DECISION_LIST = [];

// add dice to decision list
var addDiceToState = function addDiceToState(decision) {
  var dice = new _DiceModel2.default(decision);
  console.log(dice);
  DECISION_LIST.push(dice);
  return;
};

// return a list of dice from in-memory
var getDice = function getDice(decision_id) {
  return new Promise(function (res) {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST);
    } else {
      getDecisionListApi().then(function () {
        return res(DECISION_LIST);
      });
    }
  });
};

// return a single dice from in-memory
var getDiceById = function getDiceById(decision_id) {
  return new Promise(function (res) {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST.find(function (dice) {
        return dice._id === decision_id;
      }));
    } else {
      getDecisionListApi().then(function () {
        return res(DECISION_LIST.find(function (dice) {
          return dice_id === decision_id;
        }));
      });
    }
  });
};

// get lists of decision dice from api
var getDecisionListApi = function getDecisionListApi() {
  return new Promise(function (res, rej) {
    var target = '/decisions';
    var urlString = '' + target;
    $.ajax({ url: urlString }).done(function (allDiceInfo) {
      allDiceInfo.forEach(function (decision) {
        return addDiceToState(decision);
      });
      res();
      return;
    }).fail(function (err) {
      rej('cannot get dice - Error: ' + err);
    });
  });
};

exports.getDice = getDice;
exports.getDiceById = getDiceById;

},{"../Utils/constants":9,"./DiceModel":6}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RandomNGenerator = require('../Utils/RandomNGenerator');

var _RandomNGenerator2 = _interopRequireDefault(_RandomNGenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Dice = function () {
  function Dice(decision) {
    var _this = this;

    _classCallCheck(this, Dice);

    ;['_id', 'decision', 'options'].forEach(function (key) {
      if (!decision.hasOwnProperty(key)) {
        throw new Error('Parameter ' + key + ' is  required.');
      }

      _this[key] = decision[key];
    });
  }

  _createClass(Dice, [{
    key: 'roll',
    value: function roll() {
      var _this2 = this;

      return (0, _RandomNGenerator2.default)(1, this.options.length).then(function (chosenOption) {
        return _this2.options[chosenOption];
      });
    }
  }], [{
    key: 'load',
    value: function load(diceId) {
      // get dice somehow from API and return a promise that resolves with a Dice
      // instance
      return jQuery.ajax('asdf', {
        data: {
          id: diceId
        }
      }).then(function (payload) {
        return new Dice(payload);
      });
    }
  }, {
    key: 'save',
    value: function save(dice) {}
  }, {
    key: 'delete',
    value: function _delete(dice) {}
  }, {
    key: 'find',
    value: function find(params) {}
  }]);

  return Dice;
}();
//
// Dice.load(1)
//   .then(dice => console.log(dice._id))
//   .catch(console.error)


exports.default = Dice;

},{"../Utils/RandomNGenerator":7}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getRandomNumber;
function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Promise.resolve(Math.floor(Math.random() * (max - min)) + min);
};

// provided by:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = replaceAll;
function replaceAll(str, mapObj) {
  var re = new RegExp(Object.keys(mapObj).join("|"), "gi");

  return str.replace(re, function (matched) {
    return mapObj[matched.toLowerCase()];
  });
}

// provided by:
// https://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings

},{}],9:[function(require,module,exports){
(function (process){
'use strict';

exports.PORT = process.env.PORT || 8080;

exports.BASE_URL = 'localhost';

}).call(this,require('_process'))

},{"_process":1}],10:[function(require,module,exports){
'use strict';

var _RandomNGenerator = require('./Utils/RandomNGenerator');

var RandomNGenerator = _interopRequireWildcard(_RandomNGenerator);

var _constants = require('./Utils/constants');

var Constant = _interopRequireWildcard(_constants);

var _DiceModel = require('./Models/DiceModel');

var Dice = _interopRequireWildcard(_DiceModel);

var _DecisionListState = require('./Models/DecisionListState');

var DecisionList = _interopRequireWildcard(_DecisionListState);

var _HomeViewManager = require('./HomeViewManager');

var _DicePageViewManager = require('./DicePageViewManager');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// import page from 'page';

// initialize page.js for routing in the front-end
console.log('Home inside index.js:', _HomeViewManager.viewHome);
console.log('DiceView inside index.js:', _DicePageViewManager.DiceView);

// page.base('/');
page('/', _HomeViewManager.viewHome);
// page('/', () => console.log('Hooome!'));
// page('/dice', DiceView);
// page('/dice', () => console.log('Im at /dice! \o/'));
page('*', function () {
  return console.log('fallback cb');
});
// page('/about', viewAbout);
// page('/sign-up', signUp);
// page('/sign-in', signIn);
// page('/sign-out', signOut);
// page('/new', createDice);
// page('/dice/:decisionId', viewDice);
// page('/:username', userPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);
//
page({ hashbang: false });

},{"./DicePageViewManager":2,"./HomeViewManager":3,"./Models/DecisionListState":5,"./Models/DiceModel":6,"./Utils/RandomNGenerator":7,"./Utils/constants":9}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL3NwYS9qcy9EaWNlUGFnZVZpZXdNYW5hZ2VyLmpzIiwic3JjL3NwYS9qcy9Ib21lVmlld01hbmFnZXIuanMiLCJzcmMvc3BhL2pzL01vZGVscy9Db21wb25lbnRTdGF0ZS5qcyIsInNyYy9zcGEvanMvTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlLmpzIiwic3JjL3NwYS9qcy9Nb2RlbHMvRGljZU1vZGVsLmpzIiwic3JjL3NwYS9qcy9VdGlscy9SYW5kb21OR2VuZXJhdG9yLmpzIiwic3JjL3NwYS9qcy9VdGlscy9TdHJpbmdSZXBsYWNlci5qcyIsInNyYy9zcGEvanMvVXRpbHMvY29uc3RhbnRzLmpzIiwic3JjL3NwYS9qcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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SUFBMEMsR0FBMUQsQ0FBUDtBQUNEOztBQUVEO0FBQ0E7Ozs7Ozs7O2tCQ1B3QixVO0FBQVQsU0FBUyxVQUFULENBQW9CLEdBQXBCLEVBQXlCLE1BQXpCLEVBQWdDO0FBQzdDLE1BQUksS0FBSyxJQUFJLE1BQUosQ0FBVyxPQUFPLElBQVAsQ0FBWSxNQUFaLEVBQW9CLElBQXBCLENBQXlCLEdBQXpCLENBQVgsRUFBeUMsSUFBekMsQ0FBVDs7QUFFQSxTQUFPLElBQUksT0FBSixDQUFZLEVBQVosRUFBZ0IsVUFBUyxPQUFULEVBQWlCO0FBQ3RDLFdBQU8sT0FBTyxRQUFRLFdBQVIsRUFBUCxDQUFQO0FBQ0QsR0FGTSxDQUFQO0FBR0Q7O0FBRUQ7QUFDQTs7Ozs7O0FDVEEsUUFBUSxJQUFSLEdBQWUsUUFBUSxHQUFSLENBQVksSUFBWixJQUFvQixJQUFuQzs7QUFFQSxRQUFRLFFBQVIsR0FBbUIsV0FBbkI7Ozs7Ozs7QUNGQTs7SUFBWSxnQjs7QUFDWjs7SUFBWSxROztBQUNaOztJQUFZLEk7O0FBQ1o7O0lBQVksWTs7QUFDWjs7QUFDQTs7OztBQUNBOztBQUVBO0FBQ0EsUUFBUSxHQUFSLENBQVksdUJBQVo7QUFDQSxRQUFRLEdBQVIsQ0FBWSwyQkFBWjs7QUFFQTtBQUNBLEtBQUssR0FBTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUssR0FBTCxFQUFVO0FBQUEsU0FBTSxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQU47QUFBQSxDQUFWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUssRUFBRSxVQUFVLEtBQVosRUFBTCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaW1wb3J0IHtnZXREaWNlQnlJZH0gZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQge2dldENvbXBvbmVudH0gZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuL1V0aWxzL2NvbnN0YW50cydcbmltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IERpY2VWaWV3ID0gZnVuY3Rpb24oY3R4KSB7XG4gIGNvbnN0IGlkID0gY3R4LnBhcmFtcy5pZDtcbiAgY29uc29sZS5sb2coJ2RpY2UgdmlldycpO1xuICBjb25zb2xlLmxvZyhpZCk7XG4gIC8vIFByb21pc2UuYWxsKFtnZXREaWNlQnlJZChpZCksIGdldENvbXBvbmVudCgnZGVjaXNpb24tcGFnZScpLCBnZXRDb21wb25lbnQoJ2RlY2lzaW9uLW9wdGlvbicpXSlcbiAgLy8gICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAvLyAgICAgcGF5bG9hZFswXS5mb3JFYWNoKGRpY2UgPT4ge1xuICAvLyAgICAgICBjcmVhdGVEZWNpc2lvblBhZ2UoZGljZSwgcGF5bG9hZFsxXSk7XG4gIC8vICAgICB9KVxuICAvLyAgIH0pXG4gIC8vICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbn07XG5cbmNvbnN0IGNyZWF0ZURlY2lzaW9uUGFnZSA9IGZ1bmN0aW9uKCkge1xuXG59XG5cbmV4cG9ydCBkZWZhdWx0IERpY2VWaWV3XG5leHBvcnQge0RpY2VWaWV3fVxuIiwiaW1wb3J0IHtnZXREaWNlfSBmcm9tICcuL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZSdcbmltcG9ydCB7Z2V0Q29tcG9uZW50fSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCB7QkFTRV9VUkwsIFBPUlR9IGZyb20gJy4vVXRpbHMvY29uc3RhbnRzJ1xuaW1wb3J0IHJlcGxhY2VBbGwgZnJvbSAnLi9VdGlscy9TdHJpbmdSZXBsYWNlcidcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3Qgdmlld0hvbWUgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ3ZpZXdIb21lJyk7XG4gIGxldCBkaWNlQXJyYXk7XG4gIFByb21pc2UuYWxsKFtnZXREaWNlKCksIGdldENvbXBvbmVudCgnZGVjaXNpb24tY2FyZCcpXSlcbiAgICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKHBheWxvYWRbMF0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aGVyZSBpcyBubyBkYXRhJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXlsb2FkWzBdLmZvckVhY2goZGljZSA9PiB7XG4gICAgICAgICAgY3JlYXRlRGVjaXNpb25DYXJkKGRpY2UsIHBheWxvYWRbMV0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbn07XG5cbi8vIGdldCB0ZW1wbGF0ZSBmb3IgZWFjaCBkZWNpc2lvbiBhbmQgZGlzcGxheSBpdFxuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25DYXJkKGRpY2UsIGNvbXBvbmVudCkge1xuICBjb25zdCBtYXAgPSB7XG4gICAgJ0B0aXRsZSc6IGRpY2UuZGVjaXNpb24sXG4gICAgJ0BkZXNjcmlwdGlvbic6ICd0byBiZSBkZXRlcm1pbmVkJ1xuICB9XG4gIGNvbnN0IGNhcmQgPSByZXBsYWNlQWxsKGNvbXBvbmVudCwgbWFwKTtcbiAgJCgnLmpzLW1haW4tY29udGVudCcpLmFwcGVuZChjYXJkKTtcbiAgJCgnLmpzLXJvbGwnKS5jbGljaygoZSkgPT4ge1xuICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgZGljZS5yb2xsKCkudGhlbihyZXN1bHQgPT4gYWxlcnQocmVzdWx0LmNvbnRlbnQpKTtcbiAgfSk7XG59O1xuXG4vLyBIb21lID0gdmlld0hvbWU7XG5leHBvcnQge3ZpZXdIb21lLCBjcmVhdGVEZWNpc2lvbkNhcmR9XG4iLCJpbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuLi9VdGlscy9jb25zdGFudHMnXG5cbmNvbnN0IENPTVBPTkVOVFNfT0JKID0ge307XG5cbi8vIGFkZCBjb21wb25lbnQgdG8gQ09NUE9ORU5UU19PQkogZm9yIGNhY2hpbmdcbmNvbnN0IGFkZENvbXBvbmVudFRvU3RhdGUgPSBmdW5jdGlvbihrZXksIGNvbXBvbmVudCkge1xuICBDT01QT05FTlRTX09CSltrZXldID0gY29tcG9uZW50O1xuICByZXR1cm47XG59XG5cbi8vIHJldHVybiBhIENPTVBPTkVOVCBieSBrZXkgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldENvbXBvbmVudCA9IGZ1bmN0aW9uKGtleSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChDT01QT05FTlRTX09CSltrZXldKSB7XG4gICAgICByZXMoQ09NUE9ORU5UU19PQkpba2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldENvbXBvbmVudEFQSShrZXkpLnRoZW4oKCkgPT4gcmVzKENPTVBPTkVOVFNfT0JKW2tleV0pKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBnZXQgY29tcG9uZW50IHRlbXBsYXRlcyBmcm9tIGFwaVxuY29uc3QgZ2V0Q29tcG9uZW50QVBJID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzLCByZWopIHtcbiAgICBjb25zdCB0YXJnZXQgPSBgL3N0YXRpYy8ke25hbWV9Lmh0bWxgO1xuICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICQuYWpheCh7dXJsOiB1cmxTdHJpbmd9KVxuICAgICAgLmRvbmUoZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgIGFkZENvbXBvbmVudFRvU3RhdGUobmFtZSwgY29tcG9uZW50KTtcbiAgICAgICAgcmVzKGNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0pXG4gICAgICAuZmFpbChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgcmVqKGBjYW5ub3QgZ2V0IGNvbXBvbmVudCAtIEVycm9yOiAke2Vycn1gKTtcbiAgICB9KTtcbiAgfSlcbn07XG5cbmV4cG9ydCB7Z2V0Q29tcG9uZW50fTtcbiIsImltcG9ydCBEaWNlIGZyb20gJy4vRGljZU1vZGVsJ1xuaW1wb3J0IHtCQVNFX1VSTCwgUE9SVH0gZnJvbSAnLi4vVXRpbHMvY29uc3RhbnRzJ1xuXG5jb25zdCBERUNJU0lPTl9MSVNUID0gW107XG5cbi8vIGFkZCBkaWNlIHRvIGRlY2lzaW9uIGxpc3RcbmNvbnN0IGFkZERpY2VUb1N0YXRlID0gZnVuY3Rpb24oZGVjaXNpb24pIHtcbiAgY29uc3QgZGljZSA9IG5ldyBEaWNlKGRlY2lzaW9uKTtcbiAgY29uc29sZS5sb2coZGljZSk7XG4gIERFQ0lTSU9OX0xJU1QucHVzaChkaWNlKTtcbiAgcmV0dXJuO1xufVxuXG4vLyByZXR1cm4gYSBsaXN0IG9mIGRpY2UgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldERpY2UgPSBmdW5jdGlvbihkZWNpc2lvbl9pZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChERUNJU0lPTl9MSVNULmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmVzKERFQ0lTSU9OX0xJU1QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZXREZWNpc2lvbkxpc3RBcGkoKS50aGVuKCgpID0+IHJlcyhERUNJU0lPTl9MSVNUKSk7XG4gICAgfVxuICB9KVxufVxuXG4vLyByZXR1cm4gYSBzaW5nbGUgZGljZSBmcm9tIGluLW1lbW9yeVxuY29uc3QgZ2V0RGljZUJ5SWQgPSBmdW5jdGlvbihkZWNpc2lvbl9pZCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChERUNJU0lPTl9MSVNULmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmVzKERFQ0lTSU9OX0xJU1QuZmluZChkaWNlID0+IGRpY2UuX2lkID09PSBkZWNpc2lvbl9pZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZXREZWNpc2lvbkxpc3RBcGkoKS50aGVuKCgpID0+IHJlcyhERUNJU0lPTl9MSVNULmZpbmQoZGljZSA9PiBkaWNlX2lkID09PSBkZWNpc2lvbl9pZCkpKTtcbiAgICB9XG4gIH0pXG59XG5cbi8vIGdldCBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGZyb20gYXBpXG5jb25zdCBnZXREZWNpc2lvbkxpc3RBcGkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlcywgcmVqKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gJy9kZWNpc2lvbnMnO1xuICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICQuYWpheCh7dXJsOiB1cmxTdHJpbmd9KVxuICAgICAgLmRvbmUoZnVuY3Rpb24oYWxsRGljZUluZm8pIHtcbiAgICAgICAgYWxsRGljZUluZm8uZm9yRWFjaChkZWNpc2lvbiA9PiBhZGREaWNlVG9TdGF0ZShkZWNpc2lvbikpXG4gICAgICAgIHJlcygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHJlaihgY2Fubm90IGdldCBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApO1xuICAgIH0pO1xuICB9KVxufTtcblxuZXhwb3J0IHtnZXREaWNlLCBnZXREaWNlQnlJZH07XG4iLCJpbXBvcnQgZ2V0UmFuZG9tTnVtYmVyIGZyb20gJy4uL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3InO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEaWNlIHtcblxuICBjb25zdHJ1Y3RvciAoZGVjaXNpb24pIHtcbiAgICA7WydfaWQnLCAnZGVjaXNpb24nLCAnb3B0aW9ucyddLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmICghZGVjaXNpb24uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmFtZXRlciAke2tleX0gaXMgIHJlcXVpcmVkLmApO1xuICAgICAgfVxuXG4gICAgICB0aGlzW2tleV0gPSBkZWNpc2lvbltrZXldO1xuICAgIH0pXG4gIH1cblxuICByb2xsICgpIHtcbiAgICByZXR1cm4gZ2V0UmFuZG9tTnVtYmVyKDEsIHRoaXMub3B0aW9ucy5sZW5ndGgpXG4gICAgICAudGhlbihjaG9zZW5PcHRpb24gPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zW2Nob3Nlbk9wdGlvbl07XG4gICAgICB9KVxuICB9XG5cbiAgc3RhdGljIGxvYWQgKGRpY2VJZCkge1xuICAgIC8vIGdldCBkaWNlIHNvbWVob3cgZnJvbSBBUEkgYW5kIHJldHVybiBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIGEgRGljZVxuICAgIC8vIGluc3RhbmNlXG4gICAgcmV0dXJuIGpRdWVyeS5hamF4KCdhc2RmJywge1xuICAgICAgZGF0YToge1xuICAgICAgICBpZDogZGljZUlkXG4gICAgICB9XG4gICAgfSlcbiAgICAgIC50aGVuKHBheWxvYWQgPT4gbmV3IERpY2UocGF5bG9hZCkpXG4gIH1cblxuICBzdGF0aWMgc2F2ZSAoZGljZSkge31cblxuICBzdGF0aWMgZGVsZXRlIChkaWNlKSB7fVxuXG4gIHN0YXRpYyBmaW5kIChwYXJhbXMpIHt9XG5cbn1cbi8vXG4vLyBEaWNlLmxvYWQoMSlcbi8vICAgLnRoZW4oZGljZSA9PiBjb25zb2xlLmxvZyhkaWNlLl9pZCkpXG4vLyAgIC5jYXRjaChjb25zb2xlLmVycm9yKVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0UmFuZG9tTnVtYmVyKG1pbiwgbWF4KSB7XG4gIG1pbiA9IE1hdGguY2VpbChtaW4pO1xuICBtYXggPSBNYXRoLmZsb29yKG1heCk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluKTtcbn07XG5cbi8vIHByb3ZpZGVkIGJ5OlxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWF0aC9yYW5kb21cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlcGxhY2VBbGwoc3RyLCBtYXBPYmope1xuICB2YXIgcmUgPSBuZXcgUmVnRXhwKE9iamVjdC5rZXlzKG1hcE9iaikuam9pbihcInxcIiksXCJnaVwiKTtcblxuICByZXR1cm4gc3RyLnJlcGxhY2UocmUsIGZ1bmN0aW9uKG1hdGNoZWQpe1xuICAgIHJldHVybiBtYXBPYmpbbWF0Y2hlZC50b0xvd2VyQ2FzZSgpXTtcbiAgfSk7XG59XG5cbi8vIHByb3ZpZGVkIGJ5OlxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTU2MDQxNDAvcmVwbGFjZS1tdWx0aXBsZS1zdHJpbmdzLXdpdGgtbXVsdGlwbGUtb3RoZXItc3RyaW5nc1xuIiwiZXhwb3J0cy5QT1JUID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCA4MDgwO1xuXG5leHBvcnRzLkJBU0VfVVJMID0gJ2xvY2FsaG9zdCc7XG4iLCJpbXBvcnQgKiBhcyBSYW5kb21OR2VuZXJhdG9yIGZyb20gJy4vVXRpbHMvUmFuZG9tTkdlbmVyYXRvcidcbmltcG9ydCAqIGFzIENvbnN0YW50IGZyb20gJy4vVXRpbHMvY29uc3RhbnRzJ1xuaW1wb3J0ICogYXMgRGljZSBmcm9tICcuL01vZGVscy9EaWNlTW9kZWwnXG5pbXBvcnQgKiBhcyBEZWNpc2lvbkxpc3QgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQge3ZpZXdIb21lfSBmcm9tICcuL0hvbWVWaWV3TWFuYWdlcic7XG5pbXBvcnQge0RpY2VWaWV3fSBmcm9tICcuL0RpY2VQYWdlVmlld01hbmFnZXInO1xuLy8gaW1wb3J0IHBhZ2UgZnJvbSAncGFnZSc7XG5cbi8vIGluaXRpYWxpemUgcGFnZS5qcyBmb3Igcm91dGluZyBpbiB0aGUgZnJvbnQtZW5kXG5jb25zb2xlLmxvZygnSG9tZSBpbnNpZGUgaW5kZXguanM6Jywgdmlld0hvbWUpO1xuY29uc29sZS5sb2coJ0RpY2VWaWV3IGluc2lkZSBpbmRleC5qczonLCBEaWNlVmlldyk7XG5cbi8vIHBhZ2UuYmFzZSgnLycpO1xucGFnZSgnLycsIHZpZXdIb21lKTtcbi8vIHBhZ2UoJy8nLCAoKSA9PiBjb25zb2xlLmxvZygnSG9vb21lIScpKTtcbi8vIHBhZ2UoJy9kaWNlJywgRGljZVZpZXcpO1xuLy8gcGFnZSgnL2RpY2UnLCAoKSA9PiBjb25zb2xlLmxvZygnSW0gYXQgL2RpY2UhIFxcby8nKSk7XG5wYWdlKCcqJywgKCkgPT4gY29uc29sZS5sb2coJ2ZhbGxiYWNrIGNiJykpO1xuLy8gcGFnZSgnL2Fib3V0Jywgdmlld0Fib3V0KTtcbi8vIHBhZ2UoJy9zaWduLXVwJywgc2lnblVwKTtcbi8vIHBhZ2UoJy9zaWduLWluJywgc2lnbkluKTtcbi8vIHBhZ2UoJy9zaWduLW91dCcsIHNpZ25PdXQpO1xuLy8gcGFnZSgnL25ldycsIGNyZWF0ZURpY2UpO1xuLy8gcGFnZSgnL2RpY2UvOmRlY2lzaW9uSWQnLCB2aWV3RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lJywgdXNlclBhZ2UpO1xuLy8gcGFnZSgnLzp1c2VybmFtZS86ZGVjaXNpb25JZCcsIHZpZXdEaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZWRpdCcsIGVkaXREaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZGVsZXRlJywgZGVsZXRlRGljZSk7XG4vL1xucGFnZSh7IGhhc2hiYW5nOiBmYWxzZSB9KTtcbiJdfQ==
