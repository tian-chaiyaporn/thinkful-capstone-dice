import DecisionListState from './Models/DecisionListState'

const deleteDice = function(dice) {
  dice.deleteFromDb()
    .then(() => deleteDiceFromCache(dice))
    .then(() => page('/'))
    .catch((err) => alert('cannot delete dice at this time'))
}

const deleteDiceFromCache = (dice) => DecisionListState.removeDiceById(dice._id);

export default {deleteDice}
