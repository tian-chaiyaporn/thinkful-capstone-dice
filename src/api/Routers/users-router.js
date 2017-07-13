const {BasicStrategy} = require('passport-http');
const express = require('express');
const mongoose = require('mongoose');
const jsonParser = require('body-parser').json();
const urlParser = require('body-parser').urlencoded({     // to support URL-encoded bodies
  extended: true
});
const passport = require('passport');

const router = express.Router();
const {User} = require('../Models/User');
const {Decision} = require('../Models/Decision');

router.use(jsonParser);
router.use(urlParser);

mongoose.Promise = global.Promise;

const basicStrategy = new BasicStrategy((username, password, callback) => {
  console.log(`username = ${username}`);
  console.log(`password = ${password}`);

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
        return callback(null, user);
      }
    })
    .catch(err => callback(err));
});

passport.use(basicStrategy);
router.use(passport.initialize());
// router.use(passport.session());

// create new user
router.post('/', (req, res) => {
  if (!req.body) {
    return res.status(400).json({message: 'No request body'});
  }

  let {username, password} = req.body;

  if (!(username)) {
    return res.status(422).json({message: 'Missing field: username'});
  }
  if (typeof username !== 'string') {
    return res.status(422).json({message: 'Incorrect field type: username'});
  }
  username = username.trim();
  if (username === '') {
    return res.status(422).json({message: 'Incorrect field length: username'});
  }

  if (!(password)) {
    return res.status(422).json({message: 'Missing field: password'});
  }
  if (typeof password !== 'string') {
    return res.status(422).json({message: 'Incorrect field type: password'});
  }
  password = password.trim();
  if (password === '') {
    return res.status(422).json({message: 'Incorrect field length: password'});
  }

  // check for existing user
  return User
    .find({username})
    .count()
    .exec()
    .then(count => {
      if (count > 0) {
        return res.status(422).json({message: 'username already taken'});
      }
      return User.hashPassword(password)
    })
    .then(hash => {
      return User
        .create({
          username: username,
          password: hash
        })
    })
    .then(user => {
      return res.status(201).json({userId: user._id});
    })
    .catch(err => {
      res.status(500).json({message: 'Internal server error'})
    });
});

// log user in
router.post('/login',
  passport.authenticate('basic', {session: false}),
  (req, res) => {
    res.status(201).json(req.user.username);
    // res.status(201).json({ Hello: 'World!' });
});
//
// // sends json for all the dice created/saved by the user
// router.get('/:user-id',
//   passport.authenticate('basic', {session: false}),
//   (req, res) => {
//     return User
//       .find(req.body.id)
//       .exec()
//       .then(users => {
//         decisions = [];
//         users.decision_id.forEach(id => {
//           Decision
//             .findById(id)
//             .exec()
//             .then(decision => {
//               decisions.push(decision);
//             })
//         })
//         .then(() => res.json(decisions))
//       })
//       .catch(err => {
//         console.log(err);
//         res.status(500).json({message: 'Internal server error'})
//       });
// });

module.exports = router;
