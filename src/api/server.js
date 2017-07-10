const express = require('express')
const path    = require('path')
const {PORT, DATABASE_URL} = require('../config');

const users     = require('./middlewares/users-router')
const decisions = require('./middlewares/decisions-router')

const app = express()

app.use('/static', express.static(path.join(__dirname, '../..', '/build')))

/********* HOME HANDLER ********************/

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'))
})

/********* APP SERVER CONTROL **********************/

let server;

function runServer(databaseUrl=DATABASE_URL, port=PORT) {
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`Your app is listening on port ${port}`);
      resolve();
    })
    // mongoose.connect(databaseUrl, err => {
    //   if (err) {
    //     return reject(err);
    //   }
    //   server = app.listen(port, () => {
    //     console.log(`Your app is listening on port ${port}`);
    //     resolve();
    //   })
    //   .on('error', err => {
    //     mongoose.disconnect();
    //     reject(err);
    //   });
    // });
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
