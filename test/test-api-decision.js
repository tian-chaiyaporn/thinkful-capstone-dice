const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {TEST_DATABASE_URL} = require('../src/config');

const {seedDecisionData, tearDownDb} = require('./seed-data-functions')

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test dicisions endpoint
describe('decisions endpoint', function() {

  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(seedDecisionData);
  afterEach(tearDownDb);
  after(closeServer);

  describe('GET single dicision by id', function() {
    it('should be successful', function() {
      return Decision
        .findOne()
        .exec()
        .then(function(decision) {
          return chai.request(app)
            .get(`/decisions/${decision._id}`)
            .then(function(res) {
              console.log(res.body);
              res.should.have.status(200);
              res.should.be.a.json;
              const expectedKeys = ['_id', 'decision', 'options'];
              res.body.should.be.a('object');
              res.body.should.include.keys(expectedKeys);
            });
        });
    });
  });
});
