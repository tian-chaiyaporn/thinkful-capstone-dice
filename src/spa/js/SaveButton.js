const saveDice = function(diceInstance, title, description) {
  diceInstance.saveToDb(title, description)
    .then(() => page(`/dice/${diceInstance._id}`))
    .catch((err) => alert('cannot update dice at this time'))
}

export default {saveDice}
