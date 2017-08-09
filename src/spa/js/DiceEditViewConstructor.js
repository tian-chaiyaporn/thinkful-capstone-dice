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
      ComponentState.getComponent('decision-edit-option'),
      ComponentState.getComponent('save-button'),
      ComponentState.getComponent('delete-button')
    ])
    .then((data) => {
      console.log(data);
      if (!data[0]) {
        console.log('there is no dice data');
        throw new Error('There is no data');
      } else {
        UtilFunc.clearHtml('js-main-content')
        DiceEditView.createDiceEditPage(data[0], data[1], data[2], data[3], data[4], data[5]);
      }
    });
};

// export default DiceView
export default {diceEditView}
