const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {User} = require('../src/api/Models/User');
const {TEST_DATABASE_URL} = require('../src/config');

const {seedUserData,
      generateUserData,
      tearDownDb} = require('./seed-data-functions')

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// test dicisions endpoint
describe('USER ENDPOINTS', function() {

  let cookieInfo;

  before(() => runServer(TEST_DATABASE_URL));
  // beforeEach(() => {
  //   return seedUserData()
  //     .then(() => {
  //       console.log("seed data successful");
  //     })
  //     .catch(err => console.log(err));
  // });
  afterEach(tearDownDb);
  after(closeServer);

  describe('test sign-up flow', function() {
    it('should create new user on post', function() {
      const newUser = {'username': 'test123', 'password': 'password123'};
      return chai.request(app)
        .post(`/user`)
        .send(newUser)
        .then(function(res) {
          res.should.have.status(201);
          User
            .findById(res.body.userId)
            .exec()
            .then(function(user) {
              user.username.should.equal(newUser.username);
              return user.validatePassword(newUser.password);
            }).then(function(validate) {
              expect(validate).to.be.true;
            })
            .catch(function(err) {console.log(err)});
        });
    });
  });

  describe('test sign-in flow', function() {
    it('should send user._id as json if login is successful', function() {
        const newUser = {'username': 'test123', 'password': 'password123'}
        let responseUserId;
        return chai.request(app)
          .post(`/user`)
          .send(newUser)
          .then(function(res) {
            return chai.request(app)
              .post('/user/login')
              .set(
                'Authorization',
                'Basic ' + new Buffer(newUser.username + ':' + newUser.password).toString('base64')
              )
            .send(newUser)
        })
        .then(function(res) {
          // console.log('res:', res);
          cookieInfo = res.headers['set-cookie'].toString();

          res.should.have.status(201);
          responseUserId = res.body;
          return User.findOne({'username': newUser.username});
        })
        .then(function(user) {
          responseUserId.should.equal(user._id.toString());
          expect(user).to.be.a('object');
        })
        .catch(function(err) {console.log(err)});
    });
  });
  //
  // describe('test /user/:user-id', function() {
  //
  //   before(() => {
  //     return seedUserData()
  //       .then(() => console.log("seed data successful"))
  //       .catch(err => console.log(err));
  //   });
  //
  //   it('should send list of decisions as json if user is logged in', function() {
  //     return User
  //       .findOne()
  //       .exec()
  //       .then(function(user) {
  //         console.log(user);
  //         console.log(`url = /user/${user._id}`);
  //
  //         console.log('session:', cookieInfo);
  //         return chai.request(app)
  //           .get(`/user/${user._id}`)
  //           .set('Cookie', cookieInfo)
  //           .send();
  //       })
  //       .then(function(decisions) {
  //         res.should.have.status(200);
  //         res.should.be.an.array;
  //       })
  //       .catch(function(err) {console.log(`error = ${err}`)});
  //   });
  // });

});
