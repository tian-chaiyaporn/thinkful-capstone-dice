const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiAsPromised = require("chai-as-promised");
const mongoose = require('mongoose');

const {app, runServer, closeServer} = require('../src/api/server');
const {Decision} = require('../src/api/Models/Decision');
const {User} = require('../src/api/Models/User');

const {
      seedDecisionData,
      seedUserData,
      generateUserData,
      tearDownDb} = require('./seed-data-functions')

const should = chai.should();
const expect = chai.expect;
const agent  = chai.request.agent(app);

const debug = require('debug')('dice');

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const NEW_USER = {'username': 'test123', 'password': 'password123'};

// test dicisions endpoint
describe('Users router', function() {

  let cookieInfo;

  before(() => runServer(process.env.DATABASE_URL));
  afterEach(tearDownDb);
  after(closeServer);

  xdescribe('root route: `/`', function () {})

  xdescribe('sign-in route: `/login`', function () {})

  xdescribe('user profile route: `/:id`', function () {})

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
        )
        .then(res => {
          res.should.have.cookie('connect.sid');
          res.should.have.status(201);
          res.body._id.should.equal(user._id.toString());
        })
        // .catch(function(err) {console.log(err)});
    });
  });

  before(seedDecisionData);

  describe('test /user/:user-id', function() {

    let loginCredentials;

    before(() => {
      seedDecisionData()
      return seedUserData()
        .then((payload) => {
          loginCredentials = payload;
          debug("seed data successful")
        })
        // .catch(err => console.log(err))
    });

    it('should send list of decisions as json if user is logged in', function() {
      const agent = chai.request.agent(app);
      let cookieInfo;
      debug(loginCredentials)

      return agent
        .post('/user/login')
        .auth(loginCredentials[1][0], loginCredentials[1][1])
        .then(res => {
          debug("authorized")
          debug(res.body._id)
          expect(res).to.have.cookie('connect.sid')
          return agent
            .get(`/user/${res.body._id}`)
            .set({'user': res.body})
        })
        .then(res => {
          res.should.have.status(200);
          debug(res.body)
          // debug('typeof json property', typeof expect(res).to.be.json);
        })
        // .catch(function(err) {console.log(`error = ${err}`)});
    });
  });

});
