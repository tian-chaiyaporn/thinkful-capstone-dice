import Dice from './DiceModel'
const debug = require('debug')('dice');

const DECISION_LIST = [];

// add dice to decision list
const addDice = (dice) => {DECISION_LIST.push(new Dice(dice))};

// remove dice from decision list by ID
const removeDiceById = (dice_id) => {
  DECISION_LIST.splice(DECISION_LIST.indexOf(DECISION_LIST.find(dice => dice._id === dice_id)), 1);
};

// remove all dice to decision list
const removeAllDice = () => {DECISION_LIST.length = 0};

// return a list of dice from in-memory
const getDice = (idArray) => {
  debug('getDice was called');
  return new Promise((res) => {
    if (DECISION_LIST.length !== 0) {
      res(!idArray ? DECISION_LIST : DECISION_LIST.filter(d => idArray.includes(d._id)));
    } else {
      getDecisionListApi()
        .then(() => res(!idArray ? DECISION_LIST : DECISION_LIST.filter(d => idArray.includes(d._id))));
    }
  })
}

// return a single dice from in-memory
const getDiceById = (decisionId) => {
  debug('getDiceById was called');
  return new Promise((res) => {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST.find(dice => dice._id === decisionId));
    } else {
      getDecisionListApi().then(() => res(DECISION_LIST.find(dice => dice._id === decisionId)));
    }
  })
}

// get lists of decision dice from api
const getDecisionListApi = function() {
  debug('getDecisionListApi was called');
  return new Promise((res, rej) => {
    const target = '/decisions';
    const urlString = `${target}`;
    $.ajax({url: urlString})
      .done(allDiceInfo => {
        allDiceInfo.forEach(decision => addDice(decision))
        res();
        return;
      })
      .fail(err => {rej(`cannot get dice - Error: ${err}`)});
  })
};

export default {addDice, removeAllDice, removeDiceById, getDice, getDiceById, getDecisionListApi};
