import User from './UserModel'
const debug = require('debug')('dice');

const USER_STATE = {};

// add user to state
const addUser = (user) => {
  console.log(user);
  ;['_id', 'username', 'decision_id'].forEach((key) => {USER_STATE[key] = user[key]});
  console.log('USER_STATE');
  console.log(USER_STATE);
};

const removeUser = () => {
  for (var key in USER_STATE) {
    delete USER_STATE[key];
  }
  console.log('USER_STATE');
  console.log(USER_STATE);
};

// add dice_id to user decision_id list
const addDiceId = (diceId) => {USER_STATE.diceId.push(diceId)};

export default {addUser, removeUser, addDiceId};
