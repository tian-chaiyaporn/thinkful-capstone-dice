import replaceAll from './Utils/StringReplacer'
import AddButton from './AddButton'
import SaveButton from './SaveButton'
import Dice from './Models/DiceModel'

const createDiceEditPage = function(pageLayout, diceHeaderComponent, optionComponent, saveBtn) {
  console.log('createDiceEditPage was called');
  const diceMap = {
    '@title': 'input title here',
    '@description': 'describe what it does'
  }
  $('.js-main-content').append(pageLayout);
  $('.js-edit-dice-face').append(replaceAll(diceHeaderComponent, diceMap));
  $('.js-edit-dice-option').append(saveBtn);

  let newDiceWorkingMemory = {
    'decision': 'new dice',
    'options': []
  }

  Dice.create(newDiceWorkingMemory)
    .then((dice) => {
      $('.js-add-option').click(() => AddButton.addOptionToDOM(dice, optionComponent));
      $('.js-save-dice').click(() => SaveButton.saveDice(dice, $('.js-input-title').val(), $('.js-input-description').val()));
      $('.js-delete-dice').click(() => DeleteButton.deleteDice(dice))
    })
}

export default {createDiceEditPage}
