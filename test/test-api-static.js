const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../src/api/server');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test static files delivery
describe('HOMEPAGE', function() {
  describe('GET home page', function() {
    it('should be successful', function() {
      return chai.request(app)
        .get(`/`)
        .then(function(res) {
          res.should.have.status(200);
        });
      });
  });
});
