export default class User {

  constructor (user) {
    ;['_id', 'username', 'decision_id'].forEach(key => {
      if (!user.hasOwnProperty(key)) {
        throw new Error(`Parameter ${key} is  required.`);
      }
      this[key] = user[key];
    })
  }

  static create (username, password) {
    return new Promise((res, rej) => {
      const target = `/user`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify({
            'username': username,
            'password': password
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        })
        .done((user_id) => {
          console.log('signup successful')
          res(User.signIn(username, password));
          return;
        })
        .fail(err => rej(`cannot create dice - Error: ${err}`));
      })
  }

  static signIn (username, password) {
    return new Promise((res, rej) => {
      const target = `/user/login`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify({
            'username': username,
            'password': password
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        })
        .done((payload) => {
          console.log('signin successful')
          console.log(payload)
          res(new User({
            _id: payload._id,
            username: payload.username,
            decision_id: payload.decision_id
          }))
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
      .then(payload => new User(payload))
  }

  static save (dice) {}

  static delete (dice) {}

  static find (params) {}

}
