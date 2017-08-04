import Dice from './DiceModel'
import {BASE_URL, PORT} from '../Utils/constants'

const DECISION_LIST = [];

// add dice to decision list
const addDiceToState = function(decision) {
  const dice = new Dice(decision);
  console.log(dice);
  DECISION_LIST.push(dice);
  return;
}

// return a list of dice from in-memory
const getDice = function(decision_id) {
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
const getDiceById = function(decision_id) {
  return new Promise((res) => {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST.find(dice => dice._id === decision_id));
    } else {
      getDecisionListApi().then(() => res(DECISION_LIST.find(dice => dice_id === decision_id)));
    }
  })
}

// get lists of decision dice from api
const getDecisionListApi = function() {
  return new Promise(function(res, rej) {
    const target = '/decisions';
    const urlString = `${target}`;
    $.ajax({url: urlString})
      .done(function(allDiceInfo) {
        allDiceInfo.forEach(decision => addDiceToState(decision))
        res();
        return;
      })
      .fail(function(err) {
        rej(`cannot get dice - Error: ${err}`);
    });
  })
};

export {getDice, getDiceById};
