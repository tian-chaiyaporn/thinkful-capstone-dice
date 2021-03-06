import getRandomNumber from '../Utils/RandomNGenerator';

export default class Dice {

  constructor (decision) {
    ;['_id', 'decision', 'description', 'options'].forEach(key => {
      if (!decision.hasOwnProperty(key)) {
        throw new Error(`Parameter ${key} is  required.`);
      }
      this[key] = decision[key];
    })
  }

  roll () {
    return getRandomNumber(0, this.options.length)
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

  saveToDb (newTitle, newDescription) {
    return new Promise((res, rej) => {
      this.decision = newTitle;
      this.description = newDescription;
      const target = `/decisions/${this._id}`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'PATCH',
          data: JSON.stringify({
            "decision": newTitle,
            "description": newDescription,
            "options": this.options
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        })
        .done(() => res())
        .fail(err => rej(`cannot update dice - Error: ${err}`));
    })
  }

  deleteFromDb () {
    return new Promise((res, rej) => {
      const target = `/decisions/${this._id}`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'DELETE'
        })
        .done(() => res())
        .fail(err => rej(`cannot delete dice - Error: ${err}`));
    })
  }

  static createMock (diceInfo) {
    return new Promise((res, rej) => {
      res( new Dice({
        _id: 10000001,
        decision: diceInfo.decision,
        description: diceInfo.description,
        options: diceInfo.options
      }))
    })
  }

  static create (diceInfo) {
    return new Promise((res, rej) => {
      const target = `/decisions/new`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify(diceInfo),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        })
        .done((payload) => {
          res(new Dice(payload))
          return;
        })
        .fail(err => rej(`cannot create dice - Error: ${err}`));
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
