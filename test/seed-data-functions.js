const mongoose = require('mongoose');
const faker = require('faker');
const {Decision} = require('../src/api/Models/Decision');
const {User} = require('../src/api/Models/User');

function seedDecisionData() {
  console.info('seeding decisions data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push(generateDecisionData());
  }
  return Decision.insertMany(seedData);
}

function seedUserData() {
  console.info('seeding users data');
  return new Promise(function(resolve, reject) {
    for (let i=1; i<=5; i++) {
      generateUserData()
        .then(function(data) {
          User.create(data);
        })
        .catch(function(err) {console.log(err);});
    }
    resolve()
 });
}

function generateUserData() {
  return User
    .hashPassword(faker.name.firstName())
    .then(function(hash) {
      return {
        username: faker.name.firstName(),
        password: hash,
        "decision_id": [
          faker.random.uuid(),
          faker.random.uuid()
        ]
      }
    });
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
    console.warn('Deleting database');
    console.info('***********************');
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
  tearDownDb
};
