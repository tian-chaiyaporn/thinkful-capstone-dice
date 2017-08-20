import replaceAll from './Utils/StringReplacer'
import AddButton from './AddButton'
import SaveButton from './SaveButton'
import Dice from './Models/DiceModel'
const debug = require('debug')('dice');

const newDice = [];

const createDiceEditPage = function(pageLayout, diceHeaderComponent, optionComponent, saveBtn) {
  debug('createDiceEditPage was called');
  const diceMap = {
    '@title': '',
    '@description': ''
  }
  $('.js-main-content').append(pageLayout);
  $('.js-edit-dice-face').append(replaceAll(diceHeaderComponent, diceMap));
  $('.js-edit-dice-option').append(saveBtn);

  let newDiceWorkingMemory = {
    'decision': 'new dice',
    'description': 'new description',
    'options': []
  }

  Dice.createMock(newDiceWorkingMemory)
    .then((dice) => {
      newDice.length = 0;
      newDice.push(dice);
      $('.js-add-option').click(() => AddButton.addOptionToDOM(dice, optionComponent));
      $('.js-save-dice').click(() => {
        console.log('save dice clicked')
        SaveButton.saveDice(
          newDice[0],
          $('.js-input-title').val(),
          $('.js-input-description').val()
        )
      }
      );
    })
}

export default {createDiceEditPage}
