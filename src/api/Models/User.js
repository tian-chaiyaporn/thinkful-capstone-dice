const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// this is our schema to represent a restaurant
const userSchema = mongoose.Schema({
  username: {type: String, required: true},
  password: {type: String, required: true},
  decision_id: [
    {type: String}
  ]
});

userSchema.virtual('castId').get(function() {
  return this._id;
});

userSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
}

userSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 10);
}

const User = mongoose.model('User', userSchema);

module.exports = {User};
// export {User};
