import replaceAll from './Utils/StringReplacer'
const debug = require('debug')('dice');

// get template for each decision and display it
const createDecisionCard = (dice, component, diceAnimation) => {
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
    const $currentDice = $(e.currentTarget).parent().parent().find('#cube')
    dice.roll()
      .then(result => {
        $currentDice.addClass('roll');
        setTimeout(function(){
          alert(`Your answer to "${dice.decision}" is: ${result.content}`);
          $currentDice.removeClass('roll');
        }, 1000)
      })
  });
};

export default {createDecisionCard}
