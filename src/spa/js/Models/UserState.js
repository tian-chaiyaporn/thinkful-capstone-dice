import User from './UserModel'
const debug = require('debug')('dice');

const USER_STATE = [];

// add user to state
const addUser = (user) => {
  console.log(user);
  USER_STATE.push(user)
  console.log('USER_STATE added');
  console.log(USER_STATE);
};

const removeUser = () => {
  USER_STATE.length = 0;
  console.log('USER_STATE removed');
  console.log(USER_STATE);
};

// add dice_id to user decision_id list
const addDiceId = (diceId) => {
  console.log('adding dice id to user state')
  USER_STATE[0].decision_id.push(diceId)
};

const getState = () => USER_STATE[0];
const getStateObject = () => USER_STATE;

export default {addUser, removeUser, addDiceId, getState, getStateObject};
