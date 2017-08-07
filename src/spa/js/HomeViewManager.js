import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import DecisionCardView from './DecisionCardView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = function() {
  console.log('viewHome starting 123');

  return Promise.all([
      DecisionListState.getDice(),
      ComponentState.getComponent('decision-card')
    ])
    .then((payload) => {
      console.log(payload);
      if (payload[0].length === 0) {
        console.log('there is no data');
        throw new Error('There is no data');
      }
      else {
        // $('.js-main-content').html('');
        UtilFunc.clearHtml('js-main-content');
        payload[0].forEach(dice => {
          DecisionCardView.createDecisionCard(dice, payload[1]);
        })
      }
    });
};

export default {viewHome}
