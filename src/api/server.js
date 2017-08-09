require('dotenv').config()

const express = require('express');
const fallback = require('express-history-api-fallback')
const path    = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const debug = require('debug')('dice');

// const {PORT, DATABASE_URL} = require('../config');
const {Decision} = require('./Models/Decision');
const decisionRoute = require('./Routers/decision-router');
const userRoute = require('./Routers/users-router');

const app = express();
mongoose.Promise = global.Promise;

app.use('/static', express.static(path.join(__dirname, '../..', '/build')))

app.use('/decisions', decisionRoute);
app.use('/user', userRoute);

const root = path.join(__dirname, '../..', '/build');
app.use(fallback('index.html', { root }))

/********* HOME HANDLER ********************/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'))
})
//
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../build/index.html'))
// })

/********* APP SERVER CONTROL **********************/

// mongoose.connect(DATABASE_URL, {
//   useMongoClient: true
// }).catch(err => {
//     if (err) {
//       // We should crash the process beause there's no database connection for us
//       console.error('Unable to connect to MongoDB. Check your database credentials.');
//       process.exit(1);
//     }
//   })
//
// let server = app.listen(PORT, () => {
//   console.log(`Your app is listening on port ${PORT}`);
// })
// .on('error', err => {
//   mongoose.disconnect();
// });

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
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    debug('Closing server');

     return new Promise((res, rej) => server.close(err => err ? rej(err) : res()));
  });
}

if (require.main === module) {
  runServer().catch(console.error.bind(console));
}

module.exports = {app, runServer, closeServer};
