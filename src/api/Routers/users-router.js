const {BasicStrategy} = require('passport-http');
const express = require('express');
const session = require('express-session');
const jsonParser = require('body-parser').json();
const urlParser = require('body-parser').urlencoded({     // to support URL-encoded bodies
  extended: true
});
const passport = require('passport');

const router = express.Router();
const {User} = require('../Models/User');
const {Decision} = require('../Models/Decision');

const debug = require('debug')('dice');

const basicStrategy = new BasicStrategy((username, password, callback) => {
  let user;

  // callback(null, { id: 1, user: 'root' });
  // return;

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
const secretString = Buffer('super-secret-string').toString('base64')
router.use(session({
  secret: secretString,
  resave: false,
  saveUninitialized: false
}));
router.use(passport.session());
router.use(jsonParser);
router.use(urlParser);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

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
    .then(user => res.status(201).json({userId: user._id}))
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

// log user in
router.post('/login',
  passport.authenticate('basic', {session: true}),
  (req, res) => {
    res.status(201).json(req.user);
});

// sends json for all the dice created/saved by the user
router.get('/:id',
  // passport.authenticate('basic', {session: false}),
  (req, res) => {
    debug(req.session.passport.user)
    debug(req.params.id)
    if (!req.session.passport.user) {
      console.log("no req.session param, thus no log in");
      res.status(500).json({message: 'User not logged in'})
    } else {
      const decisions = [];
      const DecisionFetchPromises = [];
      return User
        .findById(req.params.id)
        .exec()
        .then((users) => {
          users.decision_id.forEach((id) => {
            DecisionFetchPromises.push(
              Decision
                .findById(id)
                .exec()
                .then(decision => decisions.push(decision)))
          })
        })
        .then(() => Promise.all(DecisionFetchPromises))
        .then(() =>
          decisions.length !== 0 ? res.json(decisions) : res.json({message: 'no decision data'}))
        .catch(err => {
          res.status(500).json({message: `Internal server error for /user/:id : ${err}`})
        });
    }
});

module.exports = router;
