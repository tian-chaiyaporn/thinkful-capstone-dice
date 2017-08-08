import replaceAll from './Utils/StringReplacer'

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
    });
  })

  $('.js-add-option').focus(() => {
    if (!$('.js-option-text').val().replace(/\s/g, '').length) {
      return;
    }
    const newOption = $('.js-option-text').val();
    $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': newOption}));
    $('.js-option-text').val('');
    dice.options.push({
      face: dice.options.length + 1,
      content: newOption
    })
    console.log('now dice has new option');
    console.log(dice.options);
  })

  $('.js-save-dice').click(() => dice.save())
  $('.js-delete-dice')
}

export default {createDiceEditPage}
