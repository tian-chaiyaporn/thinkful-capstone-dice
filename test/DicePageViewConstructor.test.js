import 'babel-polyfill';
import DecisionListState from '../src/spa/js/Models/DecisionListState';
import ComponentState from '../src/spa/js/Models/ComponentState'
import DicePageViewConstructor from '../src/spa/js/DicePageViewConstructor';
import DicePageView from '../src/spa/js/DicePageView';
import Util from '../src/spa/js/Utils/ClearHTML';

const chai = require('chai');
const sinon = require('sinon');

const should = chai.should();

describe('DicePageViewConstructor', function() {

  const seedData = {
    '_id': 12345,
    decision: "which face should I get 1?",
    options: [
      {face: 1, content: "cont 1"},
      {face: 2, content: "cont 2"},
      {face: 3, content: "cont 3"}
    ]
  }

  let testObj;
  let createDecisionPage;
  let loadDiceById;
  let loadComponent;
  let clearHTML;

  before(function() {
    testObj = {
      'params': {
        'decisionId': 12345
      }
    };
    createDecisionPage = sinon.stub(DicePageView, 'createDicePage');
    loadDiceById = sinon.stub(DecisionListState, 'getDiceById');
    loadComponent = sinon.stub(ComponentState, 'getComponent');
    clearHTML = sinon.stub(Util, 'clearHtml');
  })

  after(function() {
    createDecisionPage.restore();
    loadDiceById.restore();
    loadComponent.restore();
    clearHTML.restore();
  })

  it('should create decision page if there is data', function() {
    loadDiceById.resolves(seedData);

    return DicePageViewConstructor.diceView(testObj)
      .then(function(payload) {
        sinon.assert.calledOnce(loadDiceById);
        sinon.assert.calledThrice(loadComponent);
        sinon.assert.calledOnce(createDecisionPage);
      })
      .catch(err => console.log(err));
  });
});
