import 'babel-polyfill';
import Home from '../src/spa/js/HomeViewConstructor';
import DecisionCardView from '../src/spa/js/DecisionCardView';
import DecisionListState from '../src/spa/js/Models/DecisionListState';
import ComponentState from '../src/spa/js/Models/ComponentState';
import Util from '../src/spa/js/Utils/ClearHTML';
import $ from "jquery";

const chai = require('chai');
const sinon = require('sinon');

const should = chai.should();
const expect = chai.expect;

const debug = require('debug')('dice');

describe('viewHome', function() {

  let createCard;
  let loadDice;
  let loadComponent;
  let clearHTML;

  beforeEach(function() {
    createCard = sinon.stub(DecisionCardView, 'createDecisionCard');
    loadDice = sinon.stub(DecisionListState, 'getDice');
    loadComponent = sinon.stub(ComponentState, 'getComponent');
    clearHTML = sinon.stub(Util, 'clearHtml');
  })

  afterEach(function() {
    loadDice.restore();
    loadComponent.restore();
    createCard.restore();
    clearHTML.restore();
  });

  it('should create createDecisionCard() if data exists', function() {
    loadDice.resolves([1, 2, 3]);
    loadComponent.resolves('template');
    createCard.resolves();

    return Home.viewHome.call()
      .then(() => {
        sinon.assert.calledOnce(loadDice);
        sinon.assert.calledTwice(loadComponent);
        sinon.assert.calledThrice(createCard);
      });
  });

  it('should throw error if there is no data', function() {
    loadDice.resolves([]);
    loadComponent.resolves('template');
    return Home.viewHome.call()
      .catch(err => {err.message.should.equal('There is no data')});
  });
});
