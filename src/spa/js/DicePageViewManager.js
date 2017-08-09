import DecisionListState from './Models/DecisionListState'
import ComponentState from './Models/ComponentState'
import DicePageView from './DicePageView'
import UtilFunc from './Utils/ClearHTML'

// create the home page
// control fetching lists of decision dice and input as html
const diceView = function(ctx) {
  const id = ctx.params.decisionId;
  console.log(`id = ${id}`);
  return Promise.all([
      DecisionListState.getDiceById(ctx.params.decisionId),
      ComponentState.getComponent('decision-page'),
      ComponentState.getComponent('decision-face'),
      ComponentState.getComponent('decision-option')
    ])
    .then((payload) => {
      if (!payload[0]) {
        console.log('there is no dice data');
        throw new Error('There is no data');
      } else {
        UtilFunc.clearHtml('js-main-content');
        DicePageView.createDicePage(payload[0], payload[1], payload[2], payload[3]);
      }
    });
};

// export default DiceView
export default {diceView}
