import DecisionListState from './Models/DecisionListState'
import User from './Models/UserModel'

const deleteDice = function(dice) {
  User.checkAuth()
    .then(() => dice.deleteFromDb())
    .then(() => deleteDiceFromCache(dice))
    .then(() => page('/'))
    .catch((err) => alert('cannot delete dice at this time'))
}

const deleteDiceFromCache = (dice) => DecisionListState.removeDiceById(dice._id);

export default {deleteDice}
