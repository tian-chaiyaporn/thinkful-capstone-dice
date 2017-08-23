const { BasicStrategy } = require('passport-http');
const { User } = require('../Models/User');

module.exports = new BasicStrategy((username, password, callback) => {
  let user;
  User
    .findOne({username: username})
    .exec()
    .then(_user => {
      user = _user;
      if (!user) {
        return callback(null, false);
      }
      return user.validatePassword(password);
    })
    .then(isValid => {
      if (!isValid) {
        return callback(null, false);
      }
      else {
        console.log(user)
        return callback(null, user);
      }
    })
    .catch(err => callback(err));
});
