import getRandomNumber from '../Utils/RandomNGenerator';

export default class Dice {

  constructor (decision) {
    ;['_id', 'decision', 'options'].forEach(key => {
      if (!decision.hasOwnProperty(key)) {
        throw new Error(`Parameter ${key} is  required.`);
      }

      this[key] = decision[key];
    })
  }

  roll () {
    return getRandomNumber(1, this.options.length)
      .then(chosenOption => {
        return this.options[chosenOption];
      })
  }

  static load (diceId) {
    // get dice somehow from API and return a promise that resolves with a Dice
    // instance
    return jQuery.ajax('asdf', {
      data: {
        id: diceId
      }
    })
      .then(payload => new Dice(payload))
  }

  static save (dice) {}

  static delete (dice) {}

  static find (params) {}

}
//
// Dice.load(1)
//   .then(dice => console.log(dice._id))
//   .catch(console.error)
