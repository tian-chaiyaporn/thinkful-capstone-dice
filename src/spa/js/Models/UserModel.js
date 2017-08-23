export default class User {

  constructor (user) {
    ;['_id', 'username', 'decision_id'].forEach(key => {
      if (!user.hasOwnProperty(key)) {
        throw new Error(`Parameter ${key} is  required.`);
      }
      this[key] = user[key];
    })
  }

  saveDiceIdToDb (diceId) {
    return new Promise((res, rej) => {
      this.decision_id.push(diceId);
      const target = `/user/add-dice`;
      const urlString = `${target}`;
      console.log('saving dice id to db');
      $.ajax({
          url: urlString,
          method: 'PATCH',
          data: JSON.stringify({
            "_id": this._id,
            "decision_id": this.decision_id
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        })
        .done(() => res())
        .fail(err => rej(err));
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
        .fail(err => rej(`cannot create user - Error: ${err}`));
      })
  }

  static signIn (username, password) {
    return new Promise((res, rej) => {
      const target = `/user/login`;
      const urlString = `${target}`;
      // console.log(`singIn with ${username}`)
      // const formData = new FormData();
      // formData.append('username', username);
      // formData.append('password', password);
      // console.log(formData);

      // _createFormData(username, password)
      //   .then((formData) => {
      //     // return _sendSignInAjax(formData)
      //     res(_sendSignInAjax(formData, urlString));
      //   })
      //
      const dataString = 'username='+ username + '&password=' + password;
      console.log(dataString)
      console.log($("#sign-in-form").serialize())

      $.ajax({
          url: urlString,
          type: 'POST',
          username: username,
          password: password,
          data: dataString
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
        .fail(err => rej(`cannot sign in - Error: ${err}`));
    })
  }


  static logOut () {
    return new Promise((res, rej) => {
      const target = `/user/logout`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'GET'
        })
        .done((payload) => {
          console.log('signout successful')
          res()
          return;
        })
        .fail(err => rej(`cannot log out - Error: ${err}`));
      })
  }

  static checkAuth () {
    console.log('user model is called')
    return new Promise((res, rej) => {
      const target = `/user/check-authentication`;
      const urlString = `${target}`;
      $.ajax({
          url: urlString,
          method: 'GET'
        })
        .done((payload) => {
          console.log('user authentication is successful')
          res(payload)
          return;
        })
        .fail(err => rej(`user is not authenticated - Error: ${err}`));
      })
  }

  static save (dice) {}

  static delete (dice) {}

  static find (params) {}

}

const  _createFormData = (username, password) => {
    return new Promise((res, rej) => {
      const target = `/user/login`;
      const urlString = `${target}`;
      console.log(`singIn with ${username}`)
      var f = document.getElementById('#sign-in-form')
      var formData = new FormData(f);
      // formData.append('username', username);
      // formData.append('password', password);
      console.log(formData);

      Promise.all([
        _appendUsernameToFormData(formData, username),
        _appendPasswordToFormData(formData, password)
      ]).then((payload) => {
        console.log(payload)
      })

      // _appendUsernameToFormData(formData, username)
      //   .then((form) => {
      //     console.log(form)
      //     return _appendPasswordToFormData(form, password)
      //   })
      //   .then((form) => {
      //     console.log(form)
      //     res(form)
      //   })
    })
  }

const  _appendUsernameToFormData = (form, username) => {
    return new Promise((res, rej) => {
      console.log(form)
      console.log(username)
      console.log(form.append('username', username))
      res(form)
    })
  }

const  _appendPasswordToFormData = (form, password) => {
    return new Promise((res, rej) => {
      res(form.set('password', password))
    })
  }

const  _sendSignInAjax = (formData, urlString) => {
    return new Promise((res, rej) => {
      $.ajax({
          url: urlString,
          method: 'POST',
          data: formData,
          contentType: false,
          processData: false
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
        .fail(err => rej(`cannot sign in - Error: ${err}`));
    })
  }
