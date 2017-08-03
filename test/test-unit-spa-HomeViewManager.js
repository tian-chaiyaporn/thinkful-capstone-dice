const chai = require('chai');
const {viewHome, createDecisionCard} = require('../src/spa/js/HomeViewManager');
const should = chai.should();
const expect = chai.expect;

describe('viewHome', function() {
  it('should get dice and pass on to createDecisionCard', function() {
    viewHome()
  });

  it('should redirect to 404 if no dice is found with error message', function() {

  });
});

describe('createDiceCard', function() {
  it('should accept 2 arguments as objects', function() {

  });

  it('should manipulate DOM', function() {

  });
});
