import 'babel-polyfill';
import DecisionListState from '../src/spa/js/Models/DecisionListState';

const chai = require('chai');
const sinon = require('sinon');

const should = chai.should();
const sandbox = sinon.sandbox.create();

const debug = require('debug')('dice');

describe('DecisionListState Control', function() {

  const seedData = {
    '_id': 12345,
    decision: "which face should I get 1?",
    options: [
      {face: 1, content: "cont 1"},
      {face: 2, content: "cont 2"},
      {face: 3, content: "cont 3"}
    ]
  }

  describe('getDice', function() {
    before(function(done) {
      DecisionListState.addDice(seedData);
      done();
    })

    it('get all dice from DECISION_LIST state if data exists in cache', function() {
      return DecisionListState.getDice()
        .then(function(payload) {
          payload[0]._id.should.deep.equal(seedData._id);
          payload[0].decision.should.deep.equal(seedData.decision);
          payload[0].options.should.deep.equal(seedData.options);
          DecisionListState.removeAllDice();
        })
        .catch(err => console.log(err));
    });

    // let getDecisionListApi;
    //
    // it('call getDecisionListApi if data do not exist in cache', function() {
    //   getDecisionListApi = sinon.stub(DecisionListState, 'getDecisionListApi');
    //
    //   return DecisionListState.getDice()
    //     .then(function(payload) {
    //       console.log(`payload = ${payload}`);
    //       sinon.assert.calledOnce(getDecisionListApi);
    //       getDecisionListApi.restore();
    //     })
    //     .catch(err => console.log(err));
    // });
  })

  describe('getDiceById', function() {
    before(function(done) {
      DecisionListState.addDice(seedData);
      done();
    })

    it('get all dice from DECISION_LIST state if data exists in cache', function() {
      return DecisionListState.getDiceById(seedData._id)
        .then(function(payload) {
          payload._id.should.deep.equal(seedData._id);
          payload.decision.should.deep.equal(seedData.decision);
          payload.options.should.deep.equal(seedData.options);
          DecisionListState.removeAllDice();
        })
        .catch(err => console.log(err));
    });
  })

});
