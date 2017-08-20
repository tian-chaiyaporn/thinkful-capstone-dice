import replaceAll from './Utils/StringReplacer'
const debug = require('debug')('dice');

// get template for each decision and display it
const createDecisionCard = (dice, component) => {
  debug('createDecisionCard was called');
  const map = {
    '@title': dice.decision,
    '@id': dice._id,
    '@description': dice.description
  }
  const card = replaceAll(component, map);
  $('.js-main-content').append(card);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });
};

export default {createDecisionCard}
