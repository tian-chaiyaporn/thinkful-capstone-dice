import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import DecisionCardView from './DecisionCardView'
import UtilFunc from './Utils/ClearHTML'
import UserState from './Models/UserState'

const debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = function() {
  debug('viewHome starting');

  return Promise.all([
      DecisionListState.getDice(),
      ComponentState.getComponent('decision-card'),
      ComponentState.getComponent('dice-animation')
    ])
    .then((payload) => {
      debug(payload);
      if (payload[0].length === 0) {
        debug('there is no data');
        throw new Error('There is no data');
      }
      else {
        UtilFunc.clearHtml('js-main-content');
        payload[0].forEach(dice => {
          DecisionCardView.createDecisionCard(dice, payload[1], payload[2]);
        })
      }
    });
};

export default {viewHome}
