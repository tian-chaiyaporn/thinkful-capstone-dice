import replaceAll from './Utils/StringReplacer'

const createDicePage = function(dice, pageLayout, diceComponent, optionComponent, editBtn) {
  console.log('createDicePage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': dice.description,
    '@id': dice._id
  }
  const diceFace = replaceAll(diceComponent, diceMap);
  $('.js-main-content').append(pageLayout);
  $('.js-dice-face').append(diceFace);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });

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
