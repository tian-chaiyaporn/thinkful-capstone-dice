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
const basicStrategy = require('../Middlewares/basic-auth-strategy')

router.use(jsonParser);
router.use(urlParser);

// create new user
router.post('/', (req, res) => {
  console.log('posting')
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
    req.user.password = '';
    res.status(201).json(req.user);
});

// log user in
router.get('/logout', function(req, res) {
  req.logOut();
  req.session.destroy(function (err) {
    res.clearCookie('connect.sid');
    res.status(200);
  });
});

// log user in
router.get('/check-authentication', (req, res) => {
  debug('checking authentication in api');
  debug(req.session);

  if (req.session.passport) {
    debug("session stored by passport");
    User.findById(req.session.passport.user)
      .then(payload => {
        res.json({
          '_id': payload._id,
          'username': payload.username,
          'decision_id': payload.decision_id
        })
      });
  } else {
    console.log('rejecting authentication');
    res.status(401).redirect('/');
  }
});

// log user in
router.patch('/add-dice',
  (req, res) => {
    debug('/add-dice is called')
    debug(req.session)
    debug(req.body)
    if (!req.session.passport.user) {
      console.log("no req.session param, thus no log in");
      res.status(500).json({message: 'User not logged in'})
    } else {
      const toUpdate = {};
    	const updateableFields = ['decision_id'];
    	updateableFields.forEach(field => {
    		if (field in req.body) {
    			toUpdate[field] = req.body[field];
    		}
    	});
      return User
        .findByIdAndUpdate(req.body._id, {$set: toUpdate})
        .exec()
        .then(() => {
          User.findById(req.body._id).exec().then((user) => console.log(user))
        })
        .catch(err => {
          res.status(500).json({message: `Internal server error for /user/add-dice : ${err}`})
        });
    }
});

// middleware (params: dice_id -> checks if the dice_id is valid)
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
