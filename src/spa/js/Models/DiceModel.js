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

  deleteOption (optionId) {
    this.options.splice(
      this.options.indexOf(
        this.options.find(opt => opt.face === optionId)
      ), 1
    );
    return;
  }

  addOption (optionId, optionContent) {
    this.options.push({
      face: optionId,
      content: optionContent
    })
    return;
  }

  saveToDB (newTitle, newDescription) {
    console.log('save to DB passing');
    return new Promise((res, rej) => {
      this.decision = newTitle;
      this.description = newDescription;
      console.log(this);
      const target = `/decisions/${this._id}`;
      const urlString = `${target}`;
      console.log('ajax calling');
      $.ajax({
          url: urlString,
          method: 'PATCH',
          data: {
            decision: newTitle,
            options: this.options
          }
        })
        .done(() => res())
        .fail(err => rej(`cannot update dice - Error: ${err}`));
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
