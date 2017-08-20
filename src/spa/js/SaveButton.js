import DecisionListState from './Models/DecisionListState'
import Dice from './Models/DiceModel'
import UserState from './Models/UserState'

const saveDice = function(diceInstance, title, description) {
  if(diceInstance.options.length === 0) {
    alert('please input some options');
    return;
  }

  if (title === '' || description === '') {
    alert('please input both title and description');
    return;
  }

  const user = UserState.getState();
  Dice.create({
      'decision': title,
      'description': description,
      'options': diceInstance.options
    })
    .then((newDice) => {
      if (user) {
        console.log('user exist')
        console.log(user)
        // UserState.addDiceId(newDice._id);
        user.saveDiceIdToDb(newDice._id);
      }
      // DecisionListState.addDice(newDice);
      page(`/dice/${newDice._id}`);
    })
    .catch((err) => {
      console.log(err)
      alert('cannot update dice at this time')
    })
}

const updateDice = function(diceInstance, title, description) {
  if(diceInstance.options.length === 0) {
    alert('please input some options')
    return;
  }

  if (title === '' || description === '') {
    alert('please input both title and description');
    return;
  }

  diceInstance.saveToDb(title, description)
    .then(() => {
      page(`/dice/${diceInstance._id}`);
    })
    .catch((err) => alert('cannot update dice at this time'))
}

export default {saveDice, updateDice}
