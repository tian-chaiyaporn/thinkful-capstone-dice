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
exports.viewDice = undefined;

var _DecisionListState = require('./Models/DecisionListState');

var _ComponentState = require('./Models/ComponentState');

var _constants = require('./Utils/constants');

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create the home page
// control fetching lists of decision dice and input as html
var viewDice = function viewDice() {
  // var id = ctx.params.decisionId;
  console.log('id');
  // let diceArray;
  // Promise.all([getDice(), getComponent('decision-card')])
  //   .then((payload) => {
  //     payload[0].forEach(dice => createDecisionCard(dice, payload[1]))
  //   })
  //   .catch(err => console.log(err));
};

exports.viewDice = viewDice;

},{"./Models/ComponentState":4,"./Models/DecisionListState":5,"./Utils/StringReplacer":8,"./Utils/constants":9}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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
    payload[0].forEach(function (dice) {
      return createDecisionCard(dice, payload[1]);
    });
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

exports.default = { viewHome: viewHome };

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
    var urlString = 'http://' + _constants.BASE_URL + ':' + _constants.PORT + target;
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
exports.getDice = undefined;

var _DiceModel = require('./DiceModel');

var _DiceModel2 = _interopRequireDefault(_DiceModel);

var _constants = require('../Utils/constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DECISION_LIST = [];

// add dice to decision list
var addDiceToState = function addDiceToState(decision) {
  var dice = new _DiceModel2.default(decision);
  DECISION_LIST.push(dice);
  return;
};

// return a list of dice from in-memory
var getDice = function getDice(decision) {
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

// get lists of decision dice from api
var getDecisionListApi = function getDecisionListApi() {
  return new Promise(function (res, rej) {
    var target = '/decisions';
    var urlString = 'http://' + _constants.BASE_URL + ':' + _constants.PORT + target;
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

var viewHome = _interopRequireWildcard(_HomeViewManager);

var _DicePageViewManager = require('./DicePageViewManager');

var viewDice = _interopRequireWildcard(_DicePageViewManager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// initialize page.js for routing in the front-end
// import * as appRouters from './routers';

page('/', viewHome);
// page('/dice', viewDice);
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
// page();

},{"./DicePageViewManager":2,"./HomeViewManager":3,"./Models/DecisionListState":5,"./Models/DiceModel":6,"./Utils/RandomNGenerator":7,"./Utils/constants":9}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL3NwYS9qcy9EaWNlUGFnZVZpZXdNYW5hZ2VyLmpzIiwic3JjL3NwYS9qcy9Ib21lVmlld01hbmFnZXIuanMiLCJzcmMvc3BhL2pzL01vZGVscy9Db21wb25lbnRTdGF0ZS5qcyIsInNyYy9zcGEvanMvTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlLmpzIiwic3JjL3NwYS9qcy9Nb2RlbHMvRGljZU1vZGVsLmpzIiwic3JjL3NwYS9qcy9VdGlscy9SYW5kb21OR2VuZXJhdG9yLmpzIiwic3JjL3NwYS9qcy9VdGlscy9TdHJpbmdSZXBsYWNlci5qcyIsInNyYy9zcGEvanMvVXRpbHMvY29uc3RhbnRzLmpzIiwic3JjL3NwYS9qcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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InNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImltcG9ydCB7Z2V0RGljZX0gZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQge2dldENvbXBvbmVudH0gZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuL1V0aWxzL2NvbnN0YW50cydcbmltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IHZpZXdEaWNlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHZhciBpZCA9IGN0eC5wYXJhbXMuZGVjaXNpb25JZDtcbiAgY29uc29sZS5sb2coJ2lkJyk7XG4gIC8vIGxldCBkaWNlQXJyYXk7XG4gIC8vIFByb21pc2UuYWxsKFtnZXREaWNlKCksIGdldENvbXBvbmVudCgnZGVjaXNpb24tY2FyZCcpXSlcbiAgLy8gICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAvLyAgICAgcGF5bG9hZFswXS5mb3JFYWNoKGRpY2UgPT4gY3JlYXRlRGVjaXNpb25DYXJkKGRpY2UsIHBheWxvYWRbMV0pKVxuICAvLyAgIH0pXG4gIC8vICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbn07XG5cbmV4cG9ydCB7dmlld0RpY2V9XG4iLCJpbXBvcnQge2dldERpY2V9IGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0IHtnZXRDb21wb25lbnR9IGZyb20gJy4vTW9kZWxzL0NvbXBvbmVudFN0YXRlJ1xuaW1wb3J0IHtCQVNFX1VSTCwgUE9SVH0gZnJvbSAnLi9VdGlscy9jb25zdGFudHMnXG5pbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuXG4vLyBjcmVhdGUgdGhlIGhvbWUgcGFnZVxuLy8gY29udHJvbCBmZXRjaGluZyBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGFuZCBpbnB1dCBhcyBodG1sXG5jb25zdCB2aWV3SG9tZSA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygndmlld0hvbWUnKTtcbiAgbGV0IGRpY2VBcnJheTtcbiAgUHJvbWlzZS5hbGwoW2dldERpY2UoKSwgZ2V0Q29tcG9uZW50KCdkZWNpc2lvbi1jYXJkJyldKVxuICAgIC50aGVuKChwYXlsb2FkKSA9PiB7XG4gICAgICBwYXlsb2FkWzBdLmZvckVhY2goZGljZSA9PiBjcmVhdGVEZWNpc2lvbkNhcmQoZGljZSwgcGF5bG9hZFsxXSkpXG4gICAgfSlcbiAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xufTtcblxuLy8gZ2V0IHRlbXBsYXRlIGZvciBlYWNoIGRlY2lzaW9uIGFuZCBkaXNwbGF5IGl0XG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbkNhcmQoZGljZSwgY29tcG9uZW50KSB7XG4gIGNvbnN0IG1hcCA9IHtcbiAgICAnQHRpdGxlJzogZGljZS5kZWNpc2lvbixcbiAgICAnQGRlc2NyaXB0aW9uJzogJ3RvIGJlIGRldGVybWluZWQnXG4gIH1cbiAgY29uc3QgY2FyZCA9IHJlcGxhY2VBbGwoY29tcG9uZW50LCBtYXApO1xuICAkKCcuanMtbWFpbi1jb250ZW50JykuYXBwZW5kKGNhcmQpO1xuICAkKCcuanMtcm9sbCcpLmNsaWNrKChlKSA9PiB7XG4gICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICBkaWNlLnJvbGwoKS50aGVuKHJlc3VsdCA9PiBhbGVydChyZXN1bHQuY29udGVudCkpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHt2aWV3SG9tZX1cbiIsImltcG9ydCB7QkFTRV9VUkwsIFBPUlR9IGZyb20gJy4uL1V0aWxzL2NvbnN0YW50cydcblxuY29uc3QgQ09NUE9ORU5UU19PQkogPSB7fTtcblxuLy8gYWRkIGNvbXBvbmVudCB0byBDT01QT05FTlRTX09CSiBmb3IgY2FjaGluZ1xuY29uc3QgYWRkQ29tcG9uZW50VG9TdGF0ZSA9IGZ1bmN0aW9uKGtleSwgY29tcG9uZW50KSB7XG4gIENPTVBPTkVOVFNfT0JKW2tleV0gPSBjb21wb25lbnQ7XG4gIHJldHVybjtcbn1cblxuLy8gcmV0dXJuIGEgQ09NUE9ORU5UIGJ5IGtleSBmcm9tIGluLW1lbW9yeVxuY29uc3QgZ2V0Q29tcG9uZW50ID0gZnVuY3Rpb24oa2V5KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKENPTVBPTkVOVFNfT0JKW2tleV0pIHtcbiAgICAgIHJlcyhDT01QT05FTlRTX09CSltrZXldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0Q29tcG9uZW50QVBJKGtleSkudGhlbigoKSA9PiByZXMoQ09NUE9ORU5UU19PQkpba2V5XSkpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIGdldCBjb21wb25lbnQgdGVtcGxhdGVzIGZyb20gYXBpXG5jb25zdCBnZXRDb21wb25lbnRBUEkgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXMsIHJlaikge1xuICAgIGNvbnN0IHRhcmdldCA9IGAvc3RhdGljLyR7bmFtZX0uaHRtbGA7XG4gICAgY29uc3QgdXJsU3RyaW5nID0gYGh0dHA6Ly8ke0JBU0VfVVJMfToke1BPUlR9JHt0YXJnZXR9YDtcbiAgICAkLmFqYXgoe3VybDogdXJsU3RyaW5nfSlcbiAgICAgIC5kb25lKGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICBhZGRDb21wb25lbnRUb1N0YXRlKG5hbWUsIGNvbXBvbmVudCk7XG4gICAgICAgIHJlcyhjb21wb25lbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHJlaihgY2Fubm90IGdldCBjb21wb25lbnQgLSBFcnJvcjogJHtlcnJ9YCk7XG4gICAgfSk7XG4gIH0pXG59O1xuXG5leHBvcnQge2dldENvbXBvbmVudH07XG4iLCJpbXBvcnQgRGljZSBmcm9tICcuL0RpY2VNb2RlbCdcbmltcG9ydCB7QkFTRV9VUkwsIFBPUlR9IGZyb20gJy4uL1V0aWxzL2NvbnN0YW50cydcblxuY29uc3QgREVDSVNJT05fTElTVCA9IFtdO1xuXG4vLyBhZGQgZGljZSB0byBkZWNpc2lvbiBsaXN0XG5jb25zdCBhZGREaWNlVG9TdGF0ZSA9IGZ1bmN0aW9uKGRlY2lzaW9uKSB7XG4gIGNvbnN0IGRpY2UgPSBuZXcgRGljZShkZWNpc2lvbik7XG4gIERFQ0lTSU9OX0xJU1QucHVzaChkaWNlKTtcbiAgcmV0dXJuO1xufVxuXG4vLyByZXR1cm4gYSBsaXN0IG9mIGRpY2UgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldERpY2UgPSBmdW5jdGlvbihkZWNpc2lvbikge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChERUNJU0lPTl9MSVNULmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmVzKERFQ0lTSU9OX0xJU1QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZXREZWNpc2lvbkxpc3RBcGkoKS50aGVuKCgpID0+IHJlcyhERUNJU0lPTl9MSVNUKSk7XG4gICAgfVxuICB9KVxufVxuXG4vLyBnZXQgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBmcm9tIGFwaVxuY29uc3QgZ2V0RGVjaXNpb25MaXN0QXBpID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXMsIHJlaikge1xuICAgIGNvbnN0IHRhcmdldCA9ICcvZGVjaXNpb25zJztcbiAgICBjb25zdCB1cmxTdHJpbmcgPSBgaHR0cDovLyR7QkFTRV9VUkx9OiR7UE9SVH0ke3RhcmdldH1gO1xuICAgICQuYWpheCh7dXJsOiB1cmxTdHJpbmd9KVxuICAgICAgLmRvbmUoZnVuY3Rpb24oYWxsRGljZUluZm8pIHtcbiAgICAgICAgYWxsRGljZUluZm8uZm9yRWFjaChkZWNpc2lvbiA9PiBhZGREaWNlVG9TdGF0ZShkZWNpc2lvbikpXG4gICAgICAgIHJlcygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9KVxuICAgICAgLmZhaWwoZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHJlaihgY2Fubm90IGdldCBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApO1xuICAgIH0pO1xuICB9KVxufTtcblxuZXhwb3J0IHtnZXREaWNlfTtcbiIsImltcG9ydCBnZXRSYW5kb21OdW1iZXIgZnJvbSAnLi4vVXRpbHMvUmFuZG9tTkdlbmVyYXRvcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERpY2Uge1xuXG4gIGNvbnN0cnVjdG9yIChkZWNpc2lvbikge1xuICAgIDtbJ19pZCcsICdkZWNpc2lvbicsICdvcHRpb25zJ10uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKCFkZWNpc2lvbi5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUGFyYW1ldGVyICR7a2V5fSBpcyAgcmVxdWlyZWQuYCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXNba2V5XSA9IGRlY2lzaW9uW2tleV07XG4gICAgfSlcbiAgfVxuXG4gIHJvbGwgKCkge1xuICAgIHJldHVybiBnZXRSYW5kb21OdW1iZXIoMSwgdGhpcy5vcHRpb25zLmxlbmd0aClcbiAgICAgIC50aGVuKGNob3Nlbk9wdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnNbY2hvc2VuT3B0aW9uXTtcbiAgICAgIH0pXG4gIH1cblxuICBzdGF0aWMgbG9hZCAoZGljZUlkKSB7XG4gICAgLy8gZ2V0IGRpY2Ugc29tZWhvdyBmcm9tIEFQSSBhbmQgcmV0dXJuIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggYSBEaWNlXG4gICAgLy8gaW5zdGFuY2VcbiAgICByZXR1cm4galF1ZXJ5LmFqYXgoJ2FzZGYnLCB7XG4gICAgICBkYXRhOiB7XG4gICAgICAgIGlkOiBkaWNlSWRcbiAgICAgIH1cbiAgICB9KVxuICAgICAgLnRoZW4ocGF5bG9hZCA9PiBuZXcgRGljZShwYXlsb2FkKSlcbiAgfVxuXG4gIHN0YXRpYyBzYXZlIChkaWNlKSB7fVxuXG4gIHN0YXRpYyBkZWxldGUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGZpbmQgKHBhcmFtcykge31cblxufVxuLy9cbi8vIERpY2UubG9hZCgxKVxuLy8gICAudGhlbihkaWNlID0+IGNvbnNvbGUubG9nKGRpY2UuX2lkKSlcbi8vICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpXG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRSYW5kb21OdW1iZXIobWluLCBtYXgpIHtcbiAgbWluID0gTWF0aC5jZWlsKG1pbik7XG4gIG1heCA9IE1hdGguZmxvb3IobWF4KTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW4pO1xufTtcblxuLy8gcHJvdmlkZWQgYnk6XG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9NYXRoL3JhbmRvbVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVwbGFjZUFsbChzdHIsIG1hcE9iail7XG4gIHZhciByZSA9IG5ldyBSZWdFeHAoT2JqZWN0LmtleXMobWFwT2JqKS5qb2luKFwifFwiKSxcImdpXCIpO1xuXG4gIHJldHVybiBzdHIucmVwbGFjZShyZSwgZnVuY3Rpb24obWF0Y2hlZCl7XG4gICAgcmV0dXJuIG1hcE9ialttYXRjaGVkLnRvTG93ZXJDYXNlKCldO1xuICB9KTtcbn1cblxuLy8gcHJvdmlkZWQgYnk6XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNTYwNDE0MC9yZXBsYWNlLW11bHRpcGxlLXN0cmluZ3Mtd2l0aC1tdWx0aXBsZS1vdGhlci1zdHJpbmdzXG4iLCJleHBvcnRzLlBPUlQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDgwODA7XG5cbmV4cG9ydHMuQkFTRV9VUkwgPSAnbG9jYWxob3N0JztcbiIsIi8vIGltcG9ydCAqIGFzIGFwcFJvdXRlcnMgZnJvbSAnLi9yb3V0ZXJzJztcblxuaW1wb3J0ICogYXMgUmFuZG9tTkdlbmVyYXRvciBmcm9tICcuL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3InXG5pbXBvcnQgKiBhcyBDb25zdGFudCBmcm9tICcuL1V0aWxzL2NvbnN0YW50cydcbmltcG9ydCAqIGFzIERpY2UgZnJvbSAnLi9Nb2RlbHMvRGljZU1vZGVsJ1xuaW1wb3J0ICogYXMgRGVjaXNpb25MaXN0IGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0ICogYXMgdmlld0hvbWUgZnJvbSAnLi9Ib21lVmlld01hbmFnZXInO1xuaW1wb3J0ICogYXMgdmlld0RpY2UgZnJvbSAnLi9EaWNlUGFnZVZpZXdNYW5hZ2VyJztcblxuLy8gaW5pdGlhbGl6ZSBwYWdlLmpzIGZvciByb3V0aW5nIGluIHRoZSBmcm9udC1lbmRcbnBhZ2UoJy8nLCB2aWV3SG9tZSk7XG4vLyBwYWdlKCcvZGljZScsIHZpZXdEaWNlKTtcbi8vIHBhZ2UoJy9hYm91dCcsIHZpZXdBYm91dCk7XG4vLyBwYWdlKCcvc2lnbi11cCcsIHNpZ25VcCk7XG4vLyBwYWdlKCcvc2lnbi1pbicsIHNpZ25Jbik7XG4vLyBwYWdlKCcvc2lnbi1vdXQnLCBzaWduT3V0KTtcbi8vIHBhZ2UoJy9uZXcnLCBjcmVhdGVEaWNlKTtcbi8vIHBhZ2UoJy9kaWNlLzpkZWNpc2lvbklkJywgdmlld0RpY2UpO1xuLy8gcGFnZSgnLzp1c2VybmFtZScsIHVzZXJQYWdlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQnLCB2aWV3RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lLzpkZWNpc2lvbklkL2VkaXQnLCBlZGl0RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lLzpkZWNpc2lvbklkL2RlbGV0ZScsIGRlbGV0ZURpY2UpO1xuLy9cbi8vIHBhZ2UoKTtcbiJdfQ==
