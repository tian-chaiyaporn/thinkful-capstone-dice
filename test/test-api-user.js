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
const agent  = chai.request.agent(app);

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
      const agent = chai.request.agent(app);
      const newUser = {'username': 'test123', 'password': 'password123'}
      let responseUserId;
      let user;

      return chai.request(app)
        .post(`/user`)
        .send(newUser)
        .then(() => User.findOne({username: newUser.username}))
        .then(foundUser => user = foundUser)
        .then(res => agent
              .post('/user/login')
              .auth(newUser.username, newUser.password)
              .send(newUser)
        )
        .then(res => {
          res.should.have.cookie('connect.sid');
          res.should.have.status(201);
          res.body.should.equal(user._id.toString());
        })
        .catch(function(err) {console.log(err)});
    });
  });

  describe('test /user/:user-id', function() {

    before(() => {
      return seedUserData()
        .then(() => console.log("seed data successful"))
        .catch(err => console.log(err))
    });

    it('should send list of decisions as json if user is logged in', function() {
      let cookieInfo;
      // - [x] Get an user from database (usin the User model)
      // - [x] Sign in with this user (store cookie info)
      // - [ ] Get his/her list of decisions

      User.findOne()
        .exec()
        .then(function(user) {
          return agent
            .post('/user/login')
            .auth(user.username, user.password)
            .send()
        })
        .then(res => {
          expect(res).to.have.cookie('connect.sid')

          return agent
            .get(`/user/${user._id}`)
            send()
        })
        .then(res => {
          res.should.have.status(200);
          console.log('typeof json property', typeof expect(res).to.be.json);
        })
        .catch(function(err) {console.log(`error = ${err}`)});
    });
  });

});
