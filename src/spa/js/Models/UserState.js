import User from './UserModel'
const debug = require('debug')('dice');

const USER_STATE = [];

const addUser = (user) => {
  debug(user);
  USER_STATE.push(user)
  debug('USER_STATE added');
  debug(USER_STATE);
};

const removeUser = () => {
  USER_STATE.length = 0;
  debug('USER_STATE removed');
  debug(USER_STATE);
};

// add dice_id to user decision_id list
const addDiceId = (diceId) => {
  debug('adding dice id to user state')
  USER_STATE[0].decision_id.push(diceId)
};

const getState = () => USER_STATE[0];

const getStateArray = () => USER_STATE;

export default {addUser, removeUser, addDiceId, getState, getStateArray};
