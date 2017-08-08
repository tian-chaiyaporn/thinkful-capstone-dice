import replaceAll from './Utils/StringReplacer'

const createDicePage = function(dice, pageLayout, diceComponent, optionComponent) {
  console.log('createDicePage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': 'to be determined',
    '@id': dice._id
  }
  const pageMap = {
    '@id': dice._id
  }
  const diceFace = replaceAll(diceComponent, diceMap);
  const page = replaceAll(pageLayout, pageMap);
  $('.js-main-content').append(page);
  $('.js-decision-face').append(diceFace);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });

  dice.options.forEach(option => {
    $('.js-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
  })
}

export default {createDicePage}
