const mongoose = require('mongoose');
const faker = require('faker');
const {Decision} = require('../src/api/Models/Decision');
const {User} = require('../src/api/Models/User');
const debug = require('debug')('dice');

function seedDecisionData() {
  debug('seeding decisions data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push(generateDecisionData());
  }
  return Decision.insertMany(seedData);
}

function seedUserData() {
  debug('seeding users data');
  return new Promise(function(resolve, reject) {
    debug('creating data');
    const generateDataPromises = [];
    const logInCredentials = [];

    let i;
    for (i=1; i<=5; i++) {
      const fakeUsername = faker.name.firstName()
      const fakePassword = faker.name.firstName()
      logInCredentials.push([fakeUsername, fakePassword])
      generateDataPromises.push(generateUserData(fakeUsername, fakePassword))
    }

    Promise.all(generateDataPromises)
      .then(function(payload) {
        return User.create(payload, function(err, data) {
          debug('Users created');
          if (err) {
            reject(err);
          }
          resolve(logInCredentials);
        })
      })
  })
}


function generateUserData(randomUsername, randomPassword) {
  return new Promise(function(res, rej) {
    let hash;
    const diceIds = []

    User
    .hashPassword(randomPassword)
    .then(function(hashPassword) {
      hash = hashPassword;
      return Decision
        .find()
        .limit(3)
        .exec()
    })
    .then(function(diceArray) {
      diceArray.forEach(dice => diceIds.push(dice._id));
    })
    .then(function() {
      res({
          username: randomUsername,
          password: hash,
          "decision_id": diceIds
        })
    });
  });
}

function getOneUserData() {
  console.log('getOneUserData called');
  return new Promise(function(res, rej) {
    User.findOne({}, function(err, data) {
      debug(data);
      res(data);
    })
  })
}


function generateDecisionData() {
  const optionsArray = [];
  const diceFaces = getRandomIntInclusive(1, 10);
  for (let i=1; i<=diceFaces; i++) {
    let opt = {
      face : i.toString(),
      content: faker.lorem.sentence()
    };
    optionsArray.push(opt);
  }
  return {
    decision: faker.lorem.sentence(),
    options: optionsArray
  }
}

function tearDownDb() {
    // console.warn('Deleting database');
    // debug('***********************');
    return mongoose.connection.dropDatabase();
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  seedDecisionData,
  seedUserData,
  generateDecisionData,
  generateUserData,
  tearDownDb,
  getOneUserData
};
