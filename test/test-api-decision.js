const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {TEST_DATABASE_URL} = require('../src/config');

const {seedDecisionData, generateDecisionData, tearDownDb} = require('./seed-data-functions')

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test dicisions endpoint
describe('DECISIONS ENDPOINTS', function() {

  before(() => runServer(TEST_DATABASE_URL));
  beforeEach(seedDecisionData);
  afterEach(tearDownDb);
  after(closeServer);

  describe('GET single dicision by id', function() {
    it('should get a single dice decision', function() {
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

  describe('DELETE single dicision by id', function() {
    it('should delete a single dice decision', function() {
      let decision;
      return Decision
        .findOne()
        .exec()
        .then(function(_decision) {
          decision = _decision;
          return chai.request(app).delete(`/decisions/${decision._id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return Decision.findById(decision.id).exec();
        })
        .then(function(_decision) {
          should.not.exist(_decision);
        });
    });
  });

  describe('PATCH single dicision by id', function() {
    it('should update a single dice decision by id', function() {
      const optionArray = [
        {"face": 1, "content": "updated cont 2.1"},
        {"face": 2, "content": "updated cont 2.2"},
        {"face": 3, "content": "updated cont 2.3"}
      ];
      const updateData = {
        decision: 'futuristic fusion',
        options: optionArray
      };

      return Decision
        .findOne()
        .exec()
        .then(function(decision) {
          updateData.id = decision._id;
          return chai.request(app)
            .patch(`/decisions/${decision._id}`)
            .set('content-type', 'application/json')
            .send(updateData)
        })
        .then(function(res) {
          res.should.have.status(204);
          return Decision.findById(updateData.id).exec();
        })
        .then(function(res) {
          res.decision.should.equal(updateData.decision);
          res.options.forEach(function(opt) {
            const order = opt.face - 1;
            opt.face.should.equal(updateData.options[order].face.toString());
            opt.content.should.equal(updateData.options[order].content);
          })
        });
    });
  });

  describe('POST new decision', function() {
    it('should return true if new decision is created.', function() {
      const newItem = generateDecisionData();
      return chai.request(app)
        .post('/decisions/new')
        .send(newItem)
        .then(function(res) {
          // console.log(res.body);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys('_id', 'decision', 'options');
          res.body._id.should.not.be.null;
          res.body.decision.should.equal(newItem.decision);
          res.body.options.forEach(function(opt) {
            const order = opt.face - 1;
            opt.face.should.equal(newItem.options[order].face.toString());
            opt.content.should.equal(newItem.options[order].content);
          })
        });
      });
  });

});
