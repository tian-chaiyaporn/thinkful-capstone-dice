(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var DecisionList = {};

exports.default = DecisionList;

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionList = require('./Models_for_caching/Decision-List.js');

var DecisionList = _interopRequireWildcard(_DecisionList);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
      }
    }newObj.default = obj;return newObj;
  }
}

// create the home page
// control fetching lists of decision dice and input as html
var viewHome = function () {
  console.log('viewHome');
  getDecisionList().then(function (res) {
    res.forEach(function (dice) {
      createDecisionCard(dice);
    });
  }).catch(function (err) {
    return console.log(err);
  });
}();

// get lists of decision dice and store in cache
function getDecisionList() {
  console.log('getDecisionList');
  return Promise.resolve(['1', '2', '3']);
};

// get template for each decision and display it
function createDecisionCard(dice) {
  console.log('createDecisionCard ' + dice);
};

// roll Dice - get options, store in cache, and apply random op
function rollDice() {
  // this.foo();
  // this.bar();
};

exports.default = { viewHome: viewHome };

},{"./Models_for_caching/Decision-List.js":1}],3:[function(require,module,exports){
'use strict';

var _home = require('./home.js');

var Home = _interopRequireWildcard(_home);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
      }
    }newObj.default = obj;return newObj;
  }
}

// initialize page.js for routing in the front-end
page('/', Home);
// page('/about', viewAbout);
// page('/sign-up', signUp);
// page('/sign-in', signIn);
// page('/sign-out', signOut);
// page('/new', createDice);
// page('/:decisionId', viewDice)
// page('/:username', userPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);
//
// page();

},{"./home.js":2}]},{},[3]);
