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
exports.DiceView = DiceView = function DiceView(ctx) {
  var id = ctx.params.id;
  console.log('dice view');
  console.log(id);
  Promise.all([(0, _DecisionListState.getDiceById)(id), (0, _ComponentState.getComponent)('decision-page'), (0, _ComponentState.getComponent)('decision-option')]).then(function (payload) {
    payload[0].forEach(function (dice) {
      createDecisionPage(dice, payload[1]);
    });
  }).catch(function (err) {
    return console.log(err);
  });
};

var createDecisionPage = function createDecisionPage() {};

exports.DiceView = DiceView;

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
      createDecisionCard(dice, payload[1]);
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

Home = viewHome;
exports.default = { Home: Home };

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

var Home = _interopRequireWildcard(_HomeViewManager);

var _DicePageViewManager = require('./DicePageViewManager');

var DiceView = _interopRequireWildcard(_DicePageViewManager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

},{"./DicePageViewManager":2,"./HomeViewManager":3,"./Models/DecisionListState":5,"./Models/DiceModel":6,"./Utils/RandomNGenerator":7,"./Utils/constants":9}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL3NwYS9qcy9EaWNlUGFnZVZpZXdNYW5hZ2VyLmpzIiwic3JjL3NwYS9qcy9Ib21lVmlld01hbmFnZXIuanMiLCJzcmMvc3BhL2pzL01vZGVscy9Db21wb25lbnRTdGF0ZS5qcyIsInNyYy9zcGEvanMvTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlLmpzIiwic3JjL3NwYS9qcy9Nb2RlbHMvRGljZU1vZGVsLmpzIiwic3JjL3NwYS9qcy9VdGlscy9SYW5kb21OR2VuZXJhdG9yLmpzIiwic3JjL3NwYS9qcy9VdGlscy9TdHJpbmdSZXBsYWNlci5qcyIsInNyYy9zcGEvanMvVXRpbHMvY29uc3RhbnRzLmpzIiwic3JjL3NwYS9qcy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQ3hMQTs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7O0FBRUE7QUFDQTtBQUNBLFFBaUJRLFFBakJSLGNBQVcsa0JBQVMsR0FBVCxFQUFjO0FBQ3ZCLE1BQU0sS0FBSyxJQUFJLE1BQUosQ0FBVyxFQUF0QjtBQUNBLFVBQVEsR0FBUixDQUFZLFdBQVo7QUFDQSxVQUFRLEdBQVIsQ0FBWSxFQUFaO0FBQ0EsVUFBUSxHQUFSLENBQVksQ0FBQyxvQ0FBWSxFQUFaLENBQUQsRUFBa0Isa0NBQWEsZUFBYixDQUFsQixFQUFpRCxrQ0FBYSxpQkFBYixDQUFqRCxDQUFaLEVBQ0csSUFESCxDQUNRLFVBQUMsT0FBRCxFQUFhO0FBQ2pCLFlBQVEsQ0FBUixFQUFXLE9BQVgsQ0FBbUIsZ0JBQVE7QUFDekIseUJBQW1CLElBQW5CLEVBQXlCLFFBQVEsQ0FBUixDQUF6QjtBQUNELEtBRkQ7QUFHRCxHQUxILEVBTUcsS0FOSCxDQU1TO0FBQUEsV0FBTyxRQUFRLEdBQVIsQ0FBWSxHQUFaLENBQVA7QUFBQSxHQU5UO0FBT0QsQ0FYRDs7QUFhQSxJQUFNLHFCQUFxQixTQUFyQixrQkFBcUIsR0FBVyxDQUVyQyxDQUZEOztRQUlRLFEsR0FBQSxROzs7Ozs7Ozs7QUN4QlI7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0E7QUFDQSxJQUFNLFdBQVcsU0FBWCxRQUFXLEdBQVc7QUFDMUIsVUFBUSxHQUFSLENBQVksVUFBWjtBQUNBLE1BQUksa0JBQUo7QUFDQSxVQUFRLEdBQVIsQ0FBWSxDQUFDLGlDQUFELEVBQVksa0NBQWEsZUFBYixDQUFaLENBQVosRUFDRyxJQURILENBQ1EsVUFBQyxPQUFELEVBQWE7QUFDakIsWUFBUSxDQUFSLEVBQVcsT0FBWCxDQUFtQixnQkFBUTtBQUN6Qix5QkFBbUIsSUFBbkIsRUFBeUIsUUFBUSxDQUFSLENBQXpCO0FBQ0QsS0FGRDtBQUdELEdBTEgsRUFNRyxLQU5ILENBTVM7QUFBQSxXQUFPLFFBQVEsR0FBUixDQUFZLEdBQVosQ0FBUDtBQUFBLEdBTlQ7QUFPRCxDQVZEOztBQVlBO0FBQ0EsU0FBUyxrQkFBVCxDQUE0QixJQUE1QixFQUFrQyxTQUFsQyxFQUE2QztBQUMzQyxNQUFNLE1BQU07QUFDVixjQUFVLEtBQUssUUFETDtBQUVWLG9CQUFnQjtBQUZOLEdBQVo7QUFJQSxNQUFNLE9BQU8sOEJBQVcsU0FBWCxFQUFzQixHQUF0QixDQUFiO0FBQ0EsSUFBRSxrQkFBRixFQUFzQixNQUF0QixDQUE2QixJQUE3QjtBQUNBLElBQUUsVUFBRixFQUFjLEtBQWQsQ0FBb0IsVUFBQyxDQUFELEVBQU87QUFDekIsTUFBRSx3QkFBRjtBQUNBLFNBQUssSUFBTCxHQUFZLElBQVosQ0FBaUI7QUFBQSxhQUFVLE1BQU0sT0FBTyxPQUFiLENBQVY7QUFBQSxLQUFqQjtBQUNELEdBSEQ7QUFJRDs7QUFFRCxPQUFPLFFBQVA7a0JBQ2UsRUFBQyxVQUFELEU7Ozs7Ozs7Ozs7QUNsQ2Y7O0FBRUEsSUFBTSxpQkFBaUIsRUFBdkI7O0FBRUE7QUFDQSxJQUFNLHNCQUFzQixTQUF0QixtQkFBc0IsQ0FBUyxHQUFULEVBQWMsU0FBZCxFQUF5QjtBQUNuRCxpQkFBZSxHQUFmLElBQXNCLFNBQXRCO0FBQ0E7QUFDRCxDQUhEOztBQUtBO0FBQ0EsSUFBTSxlQUFlLFNBQWYsWUFBZSxDQUFTLEdBQVQsRUFBYztBQUNqQyxTQUFPLElBQUksT0FBSixDQUFZLFVBQUMsR0FBRCxFQUFTO0FBQzFCLFFBQUksZUFBZSxHQUFmLENBQUosRUFBeUI7QUFDdkIsVUFBSSxlQUFlLEdBQWYsQ0FBSjtBQUNELEtBRkQsTUFFTztBQUNMLHNCQUFnQixHQUFoQixFQUFxQixJQUFyQixDQUEwQjtBQUFBLGVBQU0sSUFBSSxlQUFlLEdBQWYsQ0FBSixDQUFOO0FBQUEsT0FBMUI7QUFDRDtBQUNGLEdBTk0sQ0FBUDtBQU9ELENBUkQ7O0FBVUE7QUFDQSxJQUFNLGtCQUFrQixTQUFsQixlQUFrQixDQUFTLElBQVQsRUFBZTtBQUNyQyxTQUFPLElBQUksT0FBSixDQUFZLFVBQVMsR0FBVCxFQUFjLEdBQWQsRUFBbUI7QUFDcEMsUUFBTSxzQkFBb0IsSUFBcEIsVUFBTjtBQUNBLFFBQU0sc0VBQXlDLE1BQS9DO0FBQ0EsTUFBRSxJQUFGLENBQU8sRUFBQyxLQUFLLFNBQU4sRUFBUCxFQUNHLElBREgsQ0FDUSxVQUFTLFNBQVQsRUFBb0I7QUFDeEIsMEJBQW9CLElBQXBCLEVBQTBCLFNBQTFCO0FBQ0EsVUFBSSxTQUFKO0FBQ0E7QUFDRCxLQUxILEVBTUcsSUFOSCxDQU1RLFVBQVMsR0FBVCxFQUFjO0FBQ2xCLDZDQUFxQyxHQUFyQztBQUNILEtBUkQ7QUFTRCxHQVpNLENBQVA7QUFhRCxDQWREOztRQWdCUSxZLEdBQUEsWTs7Ozs7Ozs7OztBQ3RDUjs7OztBQUNBOzs7O0FBRUEsSUFBTSxnQkFBZ0IsRUFBdEI7O0FBRUE7QUFDQSxJQUFNLGlCQUFpQixTQUFqQixjQUFpQixDQUFTLFFBQVQsRUFBbUI7QUFDeEMsTUFBTSxPQUFPLHdCQUFTLFFBQVQsQ0FBYjtBQUNBLFVBQVEsR0FBUixDQUFZLElBQVo7QUFDQSxnQkFBYyxJQUFkLENBQW1CLElBQW5CO0FBQ0E7QUFDRCxDQUxEOztBQU9BO0FBQ0EsSUFBTSxVQUFVLFNBQVYsT0FBVSxDQUFTLFdBQVQsRUFBc0I7QUFDcEMsU0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLEdBQUQsRUFBUztBQUMxQixRQUFJLGNBQWMsTUFBZCxLQUF5QixDQUE3QixFQUFnQztBQUM5QixVQUFJLGFBQUo7QUFDRCxLQUZELE1BRU87QUFDTCwyQkFBcUIsSUFBckIsQ0FBMEI7QUFBQSxlQUFNLElBQUksYUFBSixDQUFOO0FBQUEsT0FBMUI7QUFDRDtBQUNGLEdBTk0sQ0FBUDtBQU9ELENBUkQ7O0FBVUE7QUFDQSxJQUFNLGNBQWMsU0FBZCxXQUFjLENBQVMsV0FBVCxFQUFzQjtBQUN4QyxTQUFPLElBQUksT0FBSixDQUFZLFVBQUMsR0FBRCxFQUFTO0FBQzFCLFFBQUksY0FBYyxNQUFkLEtBQXlCLENBQTdCLEVBQWdDO0FBQzlCLFVBQUksY0FBYyxJQUFkLENBQW1CO0FBQUEsZUFBUSxLQUFLLEdBQUwsS0FBYSxXQUFyQjtBQUFBLE9BQW5CLENBQUo7QUFDRCxLQUZELE1BRU87QUFDTCwyQkFBcUIsSUFBckIsQ0FBMEI7QUFBQSxlQUFNLElBQUksY0FBYyxJQUFkLENBQW1CO0FBQUEsaUJBQVEsWUFBWSxXQUFwQjtBQUFBLFNBQW5CLENBQUosQ0FBTjtBQUFBLE9BQTFCO0FBQ0Q7QUFDRixHQU5NLENBQVA7QUFPRCxDQVJEOztBQVVBO0FBQ0EsSUFBTSxxQkFBcUIsU0FBckIsa0JBQXFCLEdBQVc7QUFDcEMsU0FBTyxJQUFJLE9BQUosQ0FBWSxVQUFTLEdBQVQsRUFBYyxHQUFkLEVBQW1CO0FBQ3BDLFFBQU0sU0FBUyxZQUFmO0FBQ0EsUUFBTSxzRUFBeUMsTUFBL0M7QUFDQSxNQUFFLElBQUYsQ0FBTyxFQUFDLEtBQUssU0FBTixFQUFQLEVBQ0csSUFESCxDQUNRLFVBQVMsV0FBVCxFQUFzQjtBQUMxQixrQkFBWSxPQUFaLENBQW9CO0FBQUEsZUFBWSxlQUFlLFFBQWYsQ0FBWjtBQUFBLE9BQXBCO0FBQ0E7QUFDQTtBQUNELEtBTEgsRUFNRyxJQU5ILENBTVEsVUFBUyxHQUFULEVBQWM7QUFDbEIsd0NBQWdDLEdBQWhDO0FBQ0gsS0FSRDtBQVNELEdBWk0sQ0FBUDtBQWFELENBZEQ7O1FBZ0JRLE8sR0FBQSxPO1FBQVMsVyxHQUFBLFc7Ozs7Ozs7Ozs7O0FDcERqQjs7Ozs7Ozs7SUFFcUIsSTtBQUVuQixnQkFBYSxRQUFiLEVBQXVCO0FBQUE7O0FBQUE7O0FBQ3JCLEtBQUMsQ0FBQyxLQUFELEVBQVEsVUFBUixFQUFvQixTQUFwQixFQUErQixPQUEvQixDQUF1QyxlQUFPO0FBQzdDLFVBQUksQ0FBQyxTQUFTLGNBQVQsQ0FBd0IsR0FBeEIsQ0FBTCxFQUFtQztBQUNqQyxjQUFNLElBQUksS0FBSixnQkFBdUIsR0FBdkIsb0JBQU47QUFDRDs7QUFFRCxZQUFLLEdBQUwsSUFBWSxTQUFTLEdBQVQsQ0FBWjtBQUNELEtBTkE7QUFPRjs7OzsyQkFFTztBQUFBOztBQUNOLGFBQU8sZ0NBQWdCLENBQWhCLEVBQW1CLEtBQUssT0FBTCxDQUFhLE1BQWhDLEVBQ0osSUFESSxDQUNDLHdCQUFnQjtBQUNwQixlQUFPLE9BQUssT0FBTCxDQUFhLFlBQWIsQ0FBUDtBQUNELE9BSEksQ0FBUDtBQUlEOzs7eUJBRVksTSxFQUFRO0FBQ25CO0FBQ0E7QUFDQSxhQUFPLE9BQU8sSUFBUCxDQUFZLE1BQVosRUFBb0I7QUFDekIsY0FBTTtBQUNKLGNBQUk7QUFEQTtBQURtQixPQUFwQixFQUtKLElBTEksQ0FLQztBQUFBLGVBQVcsSUFBSSxJQUFKLENBQVMsT0FBVCxDQUFYO0FBQUEsT0FMRCxDQUFQO0FBTUQ7Ozt5QkFFWSxJLEVBQU0sQ0FBRTs7OzRCQUVOLEksRUFBTSxDQUFFOzs7eUJBRVYsTSxFQUFRLENBQUU7Ozs7O0FBR3pCO0FBQ0E7QUFDQTtBQUNBOzs7a0JBeENxQixJOzs7Ozs7OztrQkNGRyxlO0FBQVQsU0FBUyxlQUFULENBQXlCLEdBQXpCLEVBQThCLEdBQTlCLEVBQW1DO0FBQ2hELFFBQU0sS0FBSyxJQUFMLENBQVUsR0FBVixDQUFOO0FBQ0EsUUFBTSxLQUFLLEtBQUwsQ0FBVyxHQUFYLENBQU47QUFDQSxTQUFPLFFBQVEsT0FBUixDQUFnQixLQUFLLEtBQUwsQ0FBVyxLQUFLLE1BQUwsTUFBaUIsTUFBTSxHQUF2QixDQUFYLElBQTBDLEdBQTFELENBQVA7QUFDRDs7QUFFRDtBQUNBOzs7Ozs7OztrQkNQd0IsVTtBQUFULFNBQVMsVUFBVCxDQUFvQixHQUFwQixFQUF5QixNQUF6QixFQUFnQztBQUM3QyxNQUFJLEtBQUssSUFBSSxNQUFKLENBQVcsT0FBTyxJQUFQLENBQVksTUFBWixFQUFvQixJQUFwQixDQUF5QixHQUF6QixDQUFYLEVBQXlDLElBQXpDLENBQVQ7O0FBRUEsU0FBTyxJQUFJLE9BQUosQ0FBWSxFQUFaLEVBQWdCLFVBQVMsT0FBVCxFQUFpQjtBQUN0QyxXQUFPLE9BQU8sUUFBUSxXQUFSLEVBQVAsQ0FBUDtBQUNELEdBRk0sQ0FBUDtBQUdEOztBQUVEO0FBQ0E7Ozs7OztBQ1RBLFFBQVEsSUFBUixHQUFlLFFBQVEsR0FBUixDQUFZLElBQVosSUFBb0IsSUFBbkM7O0FBRUEsUUFBUSxRQUFSLEdBQW1CLFdBQW5COzs7Ozs7O0FDRkE7O0lBQVksZ0I7O0FBQ1o7O0lBQVksUTs7QUFDWjs7SUFBWSxJOztBQUNaOztJQUFZLFk7O0FBQ1o7O0lBQVksSTs7QUFDWjs7SUFBWSxRIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJpbXBvcnQge2dldERpY2VCeUlkfSBmcm9tICcuL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZSdcbmltcG9ydCB7Z2V0Q29tcG9uZW50fSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCB7QkFTRV9VUkwsIFBPUlR9IGZyb20gJy4vVXRpbHMvY29uc3RhbnRzJ1xuaW1wb3J0IHJlcGxhY2VBbGwgZnJvbSAnLi9VdGlscy9TdHJpbmdSZXBsYWNlcidcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuRGljZVZpZXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgY29uc3QgaWQgPSBjdHgucGFyYW1zLmlkO1xuICBjb25zb2xlLmxvZygnZGljZSB2aWV3Jyk7XG4gIGNvbnNvbGUubG9nKGlkKTtcbiAgUHJvbWlzZS5hbGwoW2dldERpY2VCeUlkKGlkKSwgZ2V0Q29tcG9uZW50KCdkZWNpc2lvbi1wYWdlJyksIGdldENvbXBvbmVudCgnZGVjaXNpb24tb3B0aW9uJyldKVxuICAgIC50aGVuKChwYXlsb2FkKSA9PiB7XG4gICAgICBwYXlsb2FkWzBdLmZvckVhY2goZGljZSA9PiB7XG4gICAgICAgIGNyZWF0ZURlY2lzaW9uUGFnZShkaWNlLCBwYXlsb2FkWzFdKTtcbiAgICAgIH0pXG4gICAgfSlcbiAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xufTtcblxuY29uc3QgY3JlYXRlRGVjaXNpb25QYWdlID0gZnVuY3Rpb24oKSB7XG5cbn1cblxuZXhwb3J0IHtEaWNlVmlld31cbiIsImltcG9ydCB7Z2V0RGljZX0gZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQge2dldENvbXBvbmVudH0gZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuL1V0aWxzL2NvbnN0YW50cydcbmltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IHZpZXdIb21lID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCd2aWV3SG9tZScpO1xuICBsZXQgZGljZUFycmF5O1xuICBQcm9taXNlLmFsbChbZ2V0RGljZSgpLCBnZXRDb21wb25lbnQoJ2RlY2lzaW9uLWNhcmQnKV0pXG4gICAgLnRoZW4oKHBheWxvYWQpID0+IHtcbiAgICAgIHBheWxvYWRbMF0uZm9yRWFjaChkaWNlID0+IHtcbiAgICAgICAgY3JlYXRlRGVjaXNpb25DYXJkKGRpY2UsIHBheWxvYWRbMV0pO1xuICAgICAgfSlcbiAgICB9KVxuICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG59O1xuXG4vLyBnZXQgdGVtcGxhdGUgZm9yIGVhY2ggZGVjaXNpb24gYW5kIGRpc3BsYXkgaXRcbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uQ2FyZChkaWNlLCBjb21wb25lbnQpIHtcbiAgY29uc3QgbWFwID0ge1xuICAgICdAdGl0bGUnOiBkaWNlLmRlY2lzaW9uLFxuICAgICdAZGVzY3JpcHRpb24nOiAndG8gYmUgZGV0ZXJtaW5lZCdcbiAgfVxuICBjb25zdCBjYXJkID0gcmVwbGFjZUFsbChjb21wb25lbnQsIG1hcCk7XG4gICQoJy5qcy1tYWluLWNvbnRlbnQnKS5hcHBlbmQoY2FyZCk7XG4gICQoJy5qcy1yb2xsJykuY2xpY2soKGUpID0+IHtcbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgIGRpY2Uucm9sbCgpLnRoZW4ocmVzdWx0ID0+IGFsZXJ0KHJlc3VsdC5jb250ZW50KSk7XG4gIH0pO1xufTtcblxuSG9tZSA9IHZpZXdIb21lO1xuZXhwb3J0IGRlZmF1bHQge0hvbWV9XG4iLCJpbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuLi9VdGlscy9jb25zdGFudHMnXG5cbmNvbnN0IENPTVBPTkVOVFNfT0JKID0ge307XG5cbi8vIGFkZCBjb21wb25lbnQgdG8gQ09NUE9ORU5UU19PQkogZm9yIGNhY2hpbmdcbmNvbnN0IGFkZENvbXBvbmVudFRvU3RhdGUgPSBmdW5jdGlvbihrZXksIGNvbXBvbmVudCkge1xuICBDT01QT05FTlRTX09CSltrZXldID0gY29tcG9uZW50O1xuICByZXR1cm47XG59XG5cbi8vIHJldHVybiBhIENPTVBPTkVOVCBieSBrZXkgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldENvbXBvbmVudCA9IGZ1bmN0aW9uKGtleSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChDT01QT05FTlRTX09CSltrZXldKSB7XG4gICAgICByZXMoQ09NUE9ORU5UU19PQkpba2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldENvbXBvbmVudEFQSShrZXkpLnRoZW4oKCkgPT4gcmVzKENPTVBPTkVOVFNfT0JKW2tleV0pKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBnZXQgY29tcG9uZW50IHRlbXBsYXRlcyBmcm9tIGFwaVxuY29uc3QgZ2V0Q29tcG9uZW50QVBJID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzLCByZWopIHtcbiAgICBjb25zdCB0YXJnZXQgPSBgL3N0YXRpYy8ke25hbWV9Lmh0bWxgO1xuICAgIGNvbnN0IHVybFN0cmluZyA9IGBodHRwOi8vJHtCQVNFX1VSTH06JHtQT1JUfSR7dGFyZ2V0fWA7XG4gICAgJC5hamF4KHt1cmw6IHVybFN0cmluZ30pXG4gICAgICAuZG9uZShmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgYWRkQ29tcG9uZW50VG9TdGF0ZShuYW1lLCBjb21wb25lbnQpO1xuICAgICAgICByZXMoY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKGVycikge1xuICAgICAgICByZWooYGNhbm5vdCBnZXQgY29tcG9uZW50IC0gRXJyb3I6ICR7ZXJyfWApO1xuICAgIH0pO1xuICB9KVxufTtcblxuZXhwb3J0IHtnZXRDb21wb25lbnR9O1xuIiwiaW1wb3J0IERpY2UgZnJvbSAnLi9EaWNlTW9kZWwnXG5pbXBvcnQge0JBU0VfVVJMLCBQT1JUfSBmcm9tICcuLi9VdGlscy9jb25zdGFudHMnXG5cbmNvbnN0IERFQ0lTSU9OX0xJU1QgPSBbXTtcblxuLy8gYWRkIGRpY2UgdG8gZGVjaXNpb24gbGlzdFxuY29uc3QgYWRkRGljZVRvU3RhdGUgPSBmdW5jdGlvbihkZWNpc2lvbikge1xuICBjb25zdCBkaWNlID0gbmV3IERpY2UoZGVjaXNpb24pO1xuICBjb25zb2xlLmxvZyhkaWNlKTtcbiAgREVDSVNJT05fTElTVC5wdXNoKGRpY2UpO1xuICByZXR1cm47XG59XG5cbi8vIHJldHVybiBhIGxpc3Qgb2YgZGljZSBmcm9tIGluLW1lbW9yeVxuY29uc3QgZ2V0RGljZSA9IGZ1bmN0aW9uKGRlY2lzaW9uX2lkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKERFQ0lTSU9OX0xJU1QubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXMoREVDSVNJT05fTElTVCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldERlY2lzaW9uTGlzdEFwaSgpLnRoZW4oKCkgPT4gcmVzKERFQ0lTSU9OX0xJU1QpKTtcbiAgICB9XG4gIH0pXG59XG5cbi8vIHJldHVybiBhIHNpbmdsZSBkaWNlIGZyb20gaW4tbWVtb3J5XG5jb25zdCBnZXREaWNlQnlJZCA9IGZ1bmN0aW9uKGRlY2lzaW9uX2lkKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKERFQ0lTSU9OX0xJU1QubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXMoREVDSVNJT05fTElTVC5maW5kKGRpY2UgPT4gZGljZS5faWQgPT09IGRlY2lzaW9uX2lkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldERlY2lzaW9uTGlzdEFwaSgpLnRoZW4oKCkgPT4gcmVzKERFQ0lTSU9OX0xJU1QuZmluZChkaWNlID0+IGRpY2VfaWQgPT09IGRlY2lzaW9uX2lkKSkpO1xuICAgIH1cbiAgfSlcbn1cblxuLy8gZ2V0IGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgZnJvbSBhcGlcbmNvbnN0IGdldERlY2lzaW9uTGlzdEFwaSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzLCByZWopIHtcbiAgICBjb25zdCB0YXJnZXQgPSAnL2RlY2lzaW9ucyc7XG4gICAgY29uc3QgdXJsU3RyaW5nID0gYGh0dHA6Ly8ke0JBU0VfVVJMfToke1BPUlR9JHt0YXJnZXR9YDtcbiAgICAkLmFqYXgoe3VybDogdXJsU3RyaW5nfSlcbiAgICAgIC5kb25lKGZ1bmN0aW9uKGFsbERpY2VJbmZvKSB7XG4gICAgICAgIGFsbERpY2VJbmZvLmZvckVhY2goZGVjaXNpb24gPT4gYWRkRGljZVRvU3RhdGUoZGVjaXNpb24pKVxuICAgICAgICByZXMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGZ1bmN0aW9uKGVycikge1xuICAgICAgICByZWooYGNhbm5vdCBnZXQgZGljZSAtIEVycm9yOiAke2Vycn1gKTtcbiAgICB9KTtcbiAgfSlcbn07XG5cbmV4cG9ydCB7Z2V0RGljZSwgZ2V0RGljZUJ5SWR9O1xuIiwiaW1wb3J0IGdldFJhbmRvbU51bWJlciBmcm9tICcuLi9VdGlscy9SYW5kb21OR2VuZXJhdG9yJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGljZSB7XG5cbiAgY29uc3RydWN0b3IgKGRlY2lzaW9uKSB7XG4gICAgO1snX2lkJywgJ2RlY2lzaW9uJywgJ29wdGlvbnMnXS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoIWRlY2lzaW9uLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJhbWV0ZXIgJHtrZXl9IGlzICByZXF1aXJlZC5gKTtcbiAgICAgIH1cblxuICAgICAgdGhpc1trZXldID0gZGVjaXNpb25ba2V5XTtcbiAgICB9KVxuICB9XG5cbiAgcm9sbCAoKSB7XG4gICAgcmV0dXJuIGdldFJhbmRvbU51bWJlcigxLCB0aGlzLm9wdGlvbnMubGVuZ3RoKVxuICAgICAgLnRoZW4oY2hvc2VuT3B0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1tjaG9zZW5PcHRpb25dO1xuICAgICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBsb2FkIChkaWNlSWQpIHtcbiAgICAvLyBnZXQgZGljZSBzb21laG93IGZyb20gQVBJIGFuZCByZXR1cm4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIERpY2VcbiAgICAvLyBpbnN0YW5jZVxuICAgIHJldHVybiBqUXVlcnkuYWpheCgnYXNkZicsIHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgaWQ6IGRpY2VJZFxuICAgICAgfVxuICAgIH0pXG4gICAgICAudGhlbihwYXlsb2FkID0+IG5ldyBEaWNlKHBheWxvYWQpKVxuICB9XG5cbiAgc3RhdGljIHNhdmUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGRlbGV0ZSAoZGljZSkge31cblxuICBzdGF0aWMgZmluZCAocGFyYW1zKSB7fVxuXG59XG4vL1xuLy8gRGljZS5sb2FkKDEpXG4vLyAgIC50aGVuKGRpY2UgPT4gY29uc29sZS5sb2coZGljZS5faWQpKVxuLy8gICAuY2F0Y2goY29uc29sZS5lcnJvcilcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldFJhbmRvbU51bWJlcihtaW4sIG1heCkge1xuICBtaW4gPSBNYXRoLmNlaWwobWluKTtcbiAgbWF4ID0gTWF0aC5mbG9vcihtYXgpO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbik7XG59O1xuXG4vLyBwcm92aWRlZCBieTpcbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL01hdGgvcmFuZG9tXG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXBsYWNlQWxsKHN0ciwgbWFwT2JqKXtcbiAgdmFyIHJlID0gbmV3IFJlZ0V4cChPYmplY3Qua2V5cyhtYXBPYmopLmpvaW4oXCJ8XCIpLFwiZ2lcIik7XG5cbiAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlLCBmdW5jdGlvbihtYXRjaGVkKXtcbiAgICByZXR1cm4gbWFwT2JqW21hdGNoZWQudG9Mb3dlckNhc2UoKV07XG4gIH0pO1xufVxuXG4vLyBwcm92aWRlZCBieTpcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE1NjA0MTQwL3JlcGxhY2UtbXVsdGlwbGUtc3RyaW5ncy13aXRoLW11bHRpcGxlLW90aGVyLXN0cmluZ3NcbiIsImV4cG9ydHMuUE9SVCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgODA4MDtcblxuZXhwb3J0cy5CQVNFX1VSTCA9ICdsb2NhbGhvc3QnO1xuIiwiaW1wb3J0ICogYXMgUmFuZG9tTkdlbmVyYXRvciBmcm9tICcuL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3InXG5pbXBvcnQgKiBhcyBDb25zdGFudCBmcm9tICcuL1V0aWxzL2NvbnN0YW50cydcbmltcG9ydCAqIGFzIERpY2UgZnJvbSAnLi9Nb2RlbHMvRGljZU1vZGVsJ1xuaW1wb3J0ICogYXMgRGVjaXNpb25MaXN0IGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0ICogYXMgSG9tZSBmcm9tICcuL0hvbWVWaWV3TWFuYWdlcic7XG5pbXBvcnQgKiBhcyBEaWNlVmlldyBmcm9tICcuL0RpY2VQYWdlVmlld01hbmFnZXInO1xuXG4vLyBpbml0aWFsaXplIHBhZ2UuanMgZm9yIHJvdXRpbmcgaW4gdGhlIGZyb250LWVuZFxuLy8gcGFnZSgnLycsIHZpZXdIb21lKTtcbi8vIHBhZ2UoJy9kaWNlJywgdmlld0RpY2UpO1xuLy8gcGFnZSgnL2Fib3V0Jywgdmlld0Fib3V0KTtcbi8vIHBhZ2UoJy9zaWduLXVwJywgc2lnblVwKTtcbi8vIHBhZ2UoJy9zaWduLWluJywgc2lnbkluKTtcbi8vIHBhZ2UoJy9zaWduLW91dCcsIHNpZ25PdXQpO1xuLy8gcGFnZSgnL25ldycsIGNyZWF0ZURpY2UpO1xuLy8gcGFnZSgnL2RpY2UvOmRlY2lzaW9uSWQnLCB2aWV3RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lJywgdXNlclBhZ2UpO1xuLy8gcGFnZSgnLzp1c2VybmFtZS86ZGVjaXNpb25JZCcsIHZpZXdEaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZWRpdCcsIGVkaXREaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZGVsZXRlJywgZGVsZXRlRGljZSk7XG4vL1xuLy8gcGFnZSgpO1xuIl19
