import 'babel-polyfill';
import Home from '../src/spa/js/HomeViewManager';
import DecisionCard from '../src/spa/js/DecisionCardView';
import DecisionListState from '../src/spa/js/Models/DecisionListState';
import ComponentState from '../src/spa/js/Models/ComponentState';

const chai = require('chai');
const sinon = require('sinon');

const should = chai.should();
const expect = chai.expect;

describe('viewHome', function() {

  let createCard;
  let loadDice;
  let loadComponent;

  beforeEach(function() {
    createCard = sinon.stub(DecisionCard, 'createDecisionCard').returns(Promise.resolve('createDecisionCard'));
    loadDice = sinon.stub(DecisionListState, 'getDice');
    loadComponent = sinon.stub(ComponentState, 'getComponent');
  })

  afterEach(function() {
    loadDice.restore();
    loadComponent.restore();
    createCard.restore();
  });

  it('should call getDice(), getComponent(), createDecisionCard()', function() {
    loadDice.resolves([1, 2, 3]);
    loadComponent.resolves('template');

    return Home.viewHome.call()
      .then(() => {
        sinon.assert.calledOnce(loadDice);
        sinon.assert.calledOnce(loadComponent);
        sinon.assert.calledThrice(createCard);
      });
  });

  it('should throw error if there is no data', function() {
    // loadDice.resolves([]);
    // loadComponent.resolves('template');
    // expect(function(){
    //   return Home.viewHome.call();
    // }).to.throw('There is no data');
    // done();
  });

  it('should catch error if there data or component cannot be retrieved', function() {

  });

});
