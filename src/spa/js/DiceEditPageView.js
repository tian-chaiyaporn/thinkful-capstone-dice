import replaceAll from './Utils/StringReplacer'
const uuidv4 = require('uuid/v4');

const createDiceEditPage = function(dice, pageLayout, diceHeaderComponent, optionComponent) {
  console.log('createDiceEditPage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': 'to be determined'
  }
  const diceHeader = replaceAll(diceHeaderComponent, diceMap);
  $('.js-main-content').append(pageLayout);
  $('.js-edit-decision-face').append(diceHeader);

  dice.options.forEach(option => {
    $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
    $('.js-delete-option').on("click", (e) => {
      e.stopImmediatePropagation();
      $(e.currentTarget).parent().remove();
      dice.deleteOption(option.face)

      console.log('option has been deleted');
      console.log(dice.options);
    });
  })

  $('.js-add-option').focus(() => {
    if (!$('.js-option-text').val().replace(/\s/g, '').length) {
      return;
    }
    const newId = uuidv4();
    const newOption = $('.js-option-text').val();

    $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': newOption}));

    $('.js-delete-option').on("click", (e) => {
      e.stopImmediatePropagation();
      $(e.currentTarget).parent().remove();
      dice.deleteOption(newId)
      console.log('option has been deleted');
      console.log(dice.options);
    });

    $('.js-option-text').val('');
    dice.addOption(newId, newOption);
    console.log(dice.options);
  })

  $('.js-save-dice').click(() => dice.save())
  $('.js-delete-dice').click(() => dice.delete())
}

export default {createDiceEditPage}
