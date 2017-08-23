import replaceAll from './Utils/StringReplacer'
const debug = require('debug')('dice');

const showDialogBox = (diceDOM, message) => {
  diceDOM.removeClass('roll');
  $('.js-dice-result').text(message);
  $('.js-dice-result').addClass('pop');
}

// get template for each decision and display it
const createDecisionCard = (dice, component, diceAnimation) => {
  debug('createDecisionCard was called');
  const map = {
    '@title': dice.decision.toUpperCase(),
    '@id': dice._id,
    '@description': dice.description
  }
  const card = replaceAll(component, map);
  $('.js-main-content').append(card);
  addRollFunctionality(dice);
};

const addRollFunctionality = (dice) => {
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    const $currentDice = $(e.currentTarget).parent().parent().find('#cube')
    const $currentBox = $(e.currentTarget).parent().parent().find('.js-dice-result')
    const $resultMessage = $(e.currentTarget).parent().parent().find('.js-dice-result-message')
    const $closeCurrentBox = $(e.currentTarget).parent().parent().find('.js-close-dice-result')

    dice.roll()
      .then(result => {
        $currentDice.addClass('roll');
        setTimeout(function() {
          $currentDice.removeClass('roll');
          $resultMessage.text(result.content);
          $currentBox.addClass('pop');
        }, 1000)
      })

    $closeCurrentBox.click((e) => {
      e.preventDefault();
      $currentBox.removeClass('pop');
    })
  });
}

export default {createDecisionCard, addRollFunctionality}
