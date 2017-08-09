const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiAsPromised = require("chai-as-promised");
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {User} = require('../src/api/Models/User');

const {seedUserData,
      generateUserData,
      tearDownDb} = require('./seed-data-functions')

const should = chai.should();
const expect = chai.expect;
const agent  = chai.request.agent(app);

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const NEW_USER = {'username': 'test123', 'password': 'password123'};

// test dicisions endpoint
describe('Users router', function() {

  let cookieInfo;

  before(() => runServer(process.env.DATABASE_URL));
  afterEach(tearDownDb);
  after(closeServer);

  xdescribe('root route: `/`', function () {

  })

  xdescribe('sign-in route: `/login`', function () {

  })

  xdescribe('user profile route: `/:id`', function () {

  })

  describe('Sign-up flow', function() {

    it('should respond with a 201 status code', function() {
      this.timeout(1000)

      return chai.request(app)
        .post('/user')
        .send(NEW_USER)
        .then(res => res.should.have.status(201))
    })

    it('should create new user on post', function() {
      return chai.request(app)
        .post('/user')
        .send(NEW_USER)
        .then(res => User.findById(res.body.userId).exec())
        .then(user => {
          expect(user.username).to.equal(NEW_USER.username);
          expect(user.validatePassword(NEW_USER.password)).to.eventually.be.true;
        })
        // .catch(function(err) {console.log(err)})
    });
  });

  describe('test sign-in flow', function() {

    it('should send user._id as json if login is successful', function() {
      const agent = chai.request.agent(app);
      let responseUserId;
      let user;

      return chai.request(app)
        .post('/user')
        .send(NEW_USER)
        .then(() => User.findOne({username: NEW_USER.username}))
        .then(foundUser => user = foundUser)
        .then(() => agent
              .post('/user/login')
              .auth(NEW_USER.username, NEW_USER.password)
              // .send(NEW_USER)
              // .send(NEW_USER)
        )
        .then(res => {
          res.should.have.cookie('connect.sid');
          res.should.have.status(201);
          res.body.should.equal(user._id.toString());
        })
        // .catch(function(err) {console.log(err)});
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
        // .catch(function(err) {console.log(`error = ${err}`)});
    });
  });

});
