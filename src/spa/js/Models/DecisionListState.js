import Dice from './DiceModel'
import {BASE_URL, PORT} from '../Utils/constants'

const DECISION_LIST = [];

// add dice to decision list
const addDice = (dice) => {DECISION_LIST.push(new Dice(dice))};

// remove dice from decision list by ID
const removeDiceById = (dice_id) => {
  DECISION_LIST.splice(DECISION_LIST.indexOf(dice => dice === dice_id), 1);
};

// remove all dice to decision list
const removeAllDice = () => {DECISION_LIST.length = 0};

// return a list of dice from in-memory
const getDice = () => {
  console.log('getDice was called');
  return new Promise((res) => {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST);
    } else {
      getDecisionListApi().then(() => res(DECISION_LIST));
    }
  })
}

// return a single dice from in-memory
const getDiceById = (decisionId) => {
  console.log('getDiceById was called');
  return new Promise((res) => {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST.find(dice => dice._id === decisionId));
    } else {
      getDecisionListApi().then(() => res(DECISION_LIST.find(dice => dice_id === decisionId)));
    }
  })
}

// get lists of decision dice from api
const getDecisionListApi = function() {
  console.log('getDecisionListApi was called');
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

export default {addDice, removeAllDice, getDice, getDiceById, getDecisionListApi};
