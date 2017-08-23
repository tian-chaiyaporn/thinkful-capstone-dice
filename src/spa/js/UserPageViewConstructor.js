import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import DecisionCardView from './DecisionCardView'
import UtilFunc from './Utils/ClearHTML'
import UserState from './Models/UserState'

const debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
const viewUserPage = function(ctx) {
  const name = ctx.params.username;
  const user = UserState.getState();
  debug('UserPageViewConstructor starting');

  return Promise.all([
      DecisionListState.getDice(user.decision_id),
      ComponentState.getComponent('decision-card')
    ])
    .then((payload) => {
      if (payload[0].length === 0) {
        console.log('there is no data');
        alert(`You havn't made any dice yet`)
      }
      else {
        UtilFunc.clearHtml('js-main-content');
        payload[0].forEach(dice => {
          DecisionCardView.createDecisionCard(dice, payload[1]);
        })
      }
    });
};

export default {viewUserPage}
