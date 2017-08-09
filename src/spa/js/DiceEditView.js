import replaceAll from './Utils/StringReplacer'
import DicePageVM from './DicePageViewManager.js'
import DiceEditVM from './DiceEditViewManager.js'
const uuidv4 = require('uuid/v4');

const createDiceEditPage = function(dice, pageLayout, diceHeaderComponent, optionComponent) {
  console.log('createDiceEditPage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': 'to be determined'
  }
  $('.js-main-content').append(pageLayout);
  $('.js-edit-decision-face').append(replaceAll(diceHeaderComponent, diceMap));

  dice.options.forEach(option => {
    $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
    $('.js-delete-option').click(e => {
      e.stopImmediatePropagation();
      $(e.currentTarget).parent().remove();
      dice.deleteOption(option.face);
    });
  });

  $('.js-add-option').focus(() => addOptionToDOM(dice, optionComponent));
  $('.js-save-dice').click((e) => {
    dice.saveToDb($('.js-input-title').val(), $('.js-input-description').val())
      .then(() => page(`/dice/${dice._id}`))
      .catch((err) => alert('cannot update dice at this time'))
  });
  $('.js-delete-dice').click(() => {
    dice.deleteFromDb()
      .then(() => DiceEditVM.deleteDiceFromCache(dice))
      .then(() => page('/'))
      .catch((err) => alert('cannot delete dice at this time'))     
  })
}

const addOptionToDOM = function(dice, optionComponent) {
  if (!$('.js-option-text').val().replace(/\s/g, '').length) {
    return;
  }
  const newId = uuidv4();
  const newOption = $('.js-option-text').val();

  $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': newOption}));

  $('.js-delete-option').click(e => {
    e.stopImmediatePropagation();
    $(e.currentTarget).parent().remove();
    dice.deleteOption(newId)
  });

  $('.js-option-text').val('');
  dice.addOption(newId, newOption);
}

export default {createDiceEditPage}
