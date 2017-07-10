const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../src/api/server');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test static files delivery
describe('static files', function() {
  describe('GET client side index.js in asset', function() {
    it('should not be empty', function() {
      return chai.request(app)
        .get(`/static/assets/index.js`)
        .then(function(res) {
          res.should.have.status(200);
        });
      });
  });
});
