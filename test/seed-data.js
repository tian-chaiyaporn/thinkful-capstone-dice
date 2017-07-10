const mongoose = require('mongoose');
const faker = require('faker');
const {Decision} = require('../src/api/Models/Decision');

function seedDecisionData() {
  console.info('seeding decisions data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push(generateDecisionData());
  }
  return Decision.insertMany(seedData);
}

function generateDecisionData() {
  const optionsArray = [];
  const diceFaces = getRandomIntInclusive(1, 10);
  for (let i=1; i<=diceFaces; i++) {
    let opt = {
      face : i.toString(),
      content: faker.lorem.sentence()};
    optionsArray.push(opt);
  }
  return {
    decision: faker.lorem.sentence(),
    options: optionsArray
  }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {seedDecisionData, generateDecisionData, tearDownDb};
