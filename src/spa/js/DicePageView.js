import replaceAll from './Utils/StringReplacer'

const createDicePage = function(dice, pageLayout, diceComponent, optionComponent) {
  console.log('createDicePage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': 'to be determined'
  }
  const card = replaceAll(diceComponent, diceMap);
  $('.js-main-content').append(pageLayout);
  $('.js-decision-face').append(card);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });

  dice.options.forEach(option => {
    $('.js-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
  })
}

export default {createDicePage}
