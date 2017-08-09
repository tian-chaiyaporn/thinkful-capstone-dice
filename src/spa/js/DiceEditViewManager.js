import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import DiceEditView from './DiceEditView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const diceEditView = (ctx) => {
  const id = ctx.params.decisionId;
  console.log(`id = ${id}`);
  return Promise.all([
      DecisionListState.getDiceById(ctx.params.decisionId),
      ComponentState.getComponent('decision-edit-page'),
      ComponentState.getComponent('decision-edit-face'),
      ComponentState.getComponent('decision-edit-option')
    ])
    .then((payload) => {
      console.log(payload);
      if (!payload[0]) {
        console.log('there is no dice data');
        throw new Error('There is no data');
      } else {
        UtilFunc.clearHtml('js-main-content')
        DiceEditView.createDiceEditPage(payload[0], payload[1], payload[2], payload[3]);
      }
    });
};

const deleteDiceFromCache = (dice) => DecisionListState.removeDiceById(dice._id);

// export default DiceView
export default {diceEditView, deleteDiceFromCache}
