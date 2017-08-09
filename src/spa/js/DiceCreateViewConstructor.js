import ComponentState from './Models/ComponentState'
import DiceCreateView from './DiceCreateView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const newDice = function() {
  return Promise.all([
    ComponentState.getComponent('dice-edit-page'),
    ComponentState.getComponent('dice-edit-face'),
    ComponentState.getComponent('dice-edit-option'),
    ComponentState.getComponent('save-button')
    ])
    .then((payload) => {
      console.log(payload);
      UtilFunc.clearHtml('js-main-content');
      DiceCreateView.createDiceEditPage(payload[0], payload[1], payload[2], payload[3]);
    });
};

export default {newDice}
