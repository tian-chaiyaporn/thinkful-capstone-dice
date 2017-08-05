import replaceAll from './Utils/StringReplacer'

// get template for each decision and display it
const createDecisionCard = function(dice, component) {
  console.log('createDecisionCard was called');
  const map = {
    '@title': dice.decision,
    '@description': 'to be determined'
  }
  const card = replaceAll(component, map);
  $('.js-main-content').append(card);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });
};

export default {createDecisionCard}
