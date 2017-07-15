'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionList = require('./Models_for_caching/Decision-List.js');

// create the home page
var Home = {
  // control fetching lists of decision dice and input as html
  viewHome: function viewHome() {
    console.log('foo');
    undefined.getDecisionList().then(function (res) {
      res.forEach(function (dice) {
        undefined.createDecisionCard(dice);
      });
    }).catch(function (err) {
      return console.log(err);
    });
  },
  // get lists of decision dice and store in cache
  getDecisionList: function getDecisionList() {
    console.log('bar');
  },
  // get template for each decision and display it
  createDecisionCard: function createDecisionCard() {
    console.log('bar');
  },
  // roll Dice - get options, store in cache, and apply random op
  rollDice: function rollDice() {
    undefined.foo();
    undefined.bar();
  }
};

exports.default = Home;