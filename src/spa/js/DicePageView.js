import replaceAll from './Utils/StringReplacer'
import DecisionCardView from './DecisionCardView'

const createDicePage = function(dice, pageLayout, decisionCard, optionComponent, editBtn) {
  console.log('createDicePage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': dice.description,
    '@id': dice._id,
    'mdl-cell--4-col': 'mdl-cell--12-col'
  }

  const card = replaceAll(decisionCard, diceMap);
  $('.js-main-content').append(pageLayout);
  $('.js-dice-face').append(card);

  DecisionCardView.addRollFunctionality(dice);

  if(editBtn) {
    const editMap = {
      '@id': dice._id
    }
    const editButton = replaceAll(editBtn, editMap)
    $('.js-dice-option').append(editButton);
  }

  dice.options.forEach(option => {
    $('.js-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
  })
}

export default {createDicePage}
