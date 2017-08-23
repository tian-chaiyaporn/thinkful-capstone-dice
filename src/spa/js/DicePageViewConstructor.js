import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import UserState from './Models/UserState'
import DicePageView from './DicePageView'
import UtilFunc from './Utils/ClearHTML'

const debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
const diceView = function(ctx) {
  const id = ctx.params.decisionId;
  const user = UserState.getState();
  debug(`id = ${id}`);
  const asyncOperations = [
    DecisionListState.getDiceById(ctx.params.decisionId),
    ComponentState.getComponent('dice-page'),
    ComponentState.getComponent('decision-card'),
    ComponentState.getComponent('dice-option')
  ]

  if (user) {
    if (user.decision_id.includes(id)) {
      asyncOperations.push(ComponentState.getComponent('edit-button'))
    }
  }

  return Promise.all(asyncOperations)
    .then((payload) => {
      if (!payload[0]) {
        console.log('there is no dice data');
        throw new Error('There is no data');
      } else {
        UtilFunc.clearHtml('js-main-content');
        DicePageView.createDicePage(payload[0], payload[1], payload[2], payload[3], payload[4]);
      }
    });
};

// export default DiceView
export default {diceView}
