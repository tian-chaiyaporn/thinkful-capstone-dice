require('dotenv').config();
const debug = require('debug')('dice');

const express = require('express');
const session = require('express-session');
const fallback = require('./Middlewares/fallback-middleware-auth');
const path    = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const {User} = require('./Models/User');

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const {Decision} = require('./Models/Decision');
const decisionRoute = require('./Routers/decision-router');
const userRoute = require('./Routers/users-router');

const app = express();
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));


const passport = require('passport');
const basicStrategy = require('./Middlewares/basic-auth-strategy')

passport.use(basicStrategy);

app.use(passport.initialize());

const secretString = Buffer('super-secret-string').toString('base64')
app.use(session({
  secret: secretString,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
      console.log(user)
    done(err, user);
  });
});

app.use('/static', express.static(path.join(__dirname, '../..', '/build')));

app.use('/decisions', decisionRoute);
app.use('/user', userRoute);

const root = path.join(__dirname, '../..', '/build');
app.use(fallback('index.html', 'index_auth.html', { root }))

/********* HOME HANDLER ********************/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'))
})

let server;

function runServer(databaseUrl = process.env.DATABASE_URL, port = process.env.PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, {
      useMongoClient: true,
    }, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        debug(`Your app is listening on port ${port}`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      });
    });
  })
    .catch(() => {
      debug('Something went wrong while trying to run the server')
      process.exit(1);
    })
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    debug('Closing server');

     return new Promise((res, rej) => server.close(err => err ? rej(err) : res()));
  })
    .catch(() => {
      debug('Something went wrong while trying to stop the server')
      process.exit(1);
    })
}

if (require.main === module) {
  runServer().catch(console.error.bind(console));
}

module.exports = {app, runServer, closeServer};
