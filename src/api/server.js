const express = require('express');
const path    = require('path');
const mongoose = require('mongoose');

const {PORT, DATABASE_URL} = require('../config');
const {Decision} = require('./Models/Decision');
const decisions = require('./Routers/decisions-router');
const decisionIdRoute = require('./Routers/decision-id-router');

const app = express();
mongoose.Promise = global.Promise;

app.use('/static', express.static(path.join(__dirname, '../..', '/build')))
app.use('/decisions', decisionIdRoute);

/********* HOME HANDLER ********************/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'))
})

/********* APP SERVER CONTROL **********************/

let server;

function runServer(databaseUrl=DATABASE_URL, port=PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, {
      useMongoClient: true,
    }, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
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
     return new Promise((resolve, reject) => {
       console.log('Closing server');
       server.close(err => {
           if (err) {
               return reject(err);
           }
           resolve();
       });
     });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = {app, runServer, closeServer};
