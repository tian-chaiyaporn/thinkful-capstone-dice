import replaceAll from './Utils/StringReplacer'
const uuidv4 = require('uuid/v4');

const addOptionToDOM = function(dice, optionComponent) {
  console.log('add button pressed');
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

export default {addOptionToDOM}
