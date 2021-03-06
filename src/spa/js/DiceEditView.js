import replaceAll from './Utils/StringReplacer'
import AddButton from './AddButton.js'
import DeleteButton from './DeleteButton.js'
import SaveButton from './SaveButton.js'

const createDiceEditPage = function(dice, pageLayout, diceHeaderComponent, optionComponent, saveBtn, deleteBtn) {
  console.log('createDiceEditPage was called');
  const diceMap = {
    '@title': dice.decision,
    '@description': dice.description
  }
  $('.js-main-content').append(pageLayout);
  $('.js-edit-dice-face').append(replaceAll(diceHeaderComponent, diceMap));
  $('.js-edit-dice-option').append(saveBtn);
  $('.js-edit-dice-option').append(deleteBtn);

  dice.options.forEach(option => {
    $('.js-edit-options-list').append(replaceAll(optionComponent, {'@option': option.content}));
    $('.js-delete-option').click(e => {
      e.stopImmediatePropagation();
      $(e.currentTarget).parent().remove();
      dice.deleteOption(option.face);
    });
  });

  $('.js-add-option').click(() => AddButton.addOptionToDOM(dice, optionComponent));
  $('.js-save-dice').click(() => SaveButton.updateDice(dice, $('.js-input-title').val(), $('.js-input-description').val()));
  $('.js-delete-dice').click(() => DeleteButton.deleteDice(dice))
}

export default {createDiceEditPage}
