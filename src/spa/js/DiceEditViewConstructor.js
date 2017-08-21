import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import User from './Models/UserModel'
import DiceEditView from './DiceEditView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const diceEditView = (ctx) => {

  User.checkAuth();

  const id = ctx.params.decisionId;
  console.log(`id = ${id}`);
  return Promise.all([
      DecisionListState.getDiceById(ctx.params.decisionId),
      ComponentState.getComponent('dice-edit-page'),
      ComponentState.getComponent('dice-edit-face'),
      ComponentState.getComponent('dice-edit-option'),
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
