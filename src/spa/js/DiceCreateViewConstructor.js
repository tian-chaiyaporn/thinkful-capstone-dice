import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
// import DecisionCardView from './DecisionCardView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = function() {
  console.log('viewHome starting 123');

  return Promise.all([
    ComponentState.getComponent('decision-new-page'),
    ComponentState.getComponent('decision-edit-face'),
    ComponentState.getComponent('decision-edit-option')
    ])
    .then((payload) => {
      console.log(payload);
      if (payload[0].length === 0) {
        console.log('there is no data');
        throw new Error('There is no data');
      }
      else {
        UtilFunc.clearHtml('js-main-content');
        DiceEditView.createDiceEditPage(payload[0], payload[1], payload[2], payload[3]);
      }
    });
};

export default {viewHome}
