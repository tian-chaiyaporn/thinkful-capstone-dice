import replaceAll from './Utils/StringReplacer'
import DicePageVM from './DicePageViewManager.js'
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
  $('.js-save-dice').click(() => {
    dice.saveToDB($('.js-input-title').val(), $('.js-input-description').val())
      .then(() => {
        page.redirect(`/dice/${dice._id}`);
        DicePageVM.diceView({params: {decisionId: dice._id}});
      })
      .catch((err) => alert('cannot update dice at this time'))
  });
  $('.js-delete-dice').click(() => dice.delete());
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
