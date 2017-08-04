import 'babel-polyfill';
const chai = require('chai');
const sinon = require('sinon');
const Home = require('../src/spa/js/HomeViewManager');
const DecisionCard = require('../src/spa/js/DecisionCardView');
const DecisionListState = require('../src/spa/js/Models/DecisionListState');
const ComponentState = require('../src/spa/js/Models/ComponentState');
const should = chai.should();
const expect = chai.expect;

describe('viewHome', function() {

  var createCard;
  var loadDice;
  var loadComponent;

  beforeEach(function() {
    createCard = sinon.stub(DecisionCard, 'createDecisionCard');
    loadDice = sinon.stub(DecisionListState, 'getDice');
    loadComponent = sinon.stub(ComponentState, 'getComponent');
  })

  afterEach(function() {
    loadDice.restore();
    loadComponent.restore();
    createCard.restore();
  });

  it('should call getDice() and getComponent()', function(done) {
    loadDice.resolves([1, 2, 3]);
    loadComponent.resolves('template');
    Home.viewHome.call()

    sinon.assert.calledOnce(loadDice);
    sinon.assert.calledOnce(loadComponent);
    sinon.assert.called(createCard);
    done();
  });

  it('should call createDecisionCard if there is data', function() {

  });

  it('should log no data if there is no data', function() {

  });

  it('should catch error if there data or component cannot be retrieved', function() {

  });

});
