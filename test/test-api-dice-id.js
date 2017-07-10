const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {TEST_DATABASE_URL} = require('../src/config');

const {
  seedDecisionData,
  generateDecisionData,
  tearDownDb} = require('./seed-data')

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test dice-id endpoint
describe('dice-id endpoint', function() {

  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(seedDecisionData);
  afterEach(tearDownDb);
  after(closeServer);

  describe('GET dice by id', function() {
    it('should be successful', function() {
      return Decision
        .findOne()
        .exec()
        .then(function(decision) {
          return chai.request(app)
            .get(`/decisions/${decision._id}`)
            .then(function(res) {
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
