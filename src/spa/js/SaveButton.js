const saveDice = function(diceInstance, title, description) {
  if(diceInstance.options.length === 0) {
    alert('please input some options')
    return;
  }
  diceInstance.saveToDb(title, description)
    .then(() => page(`/dice/${diceInstance._id}`))
    .catch((err) => alert('cannot update dice at this time'))
}

export default {saveDice}
