import {getDice} from './Models/DecisionListState'
import {getComponent} from './Models/ComponentState'
import {createDecisionCard} from './DecisionCardView'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = function() {
  console.log('viewHome starting');
  let diceArray;
  createDecisionCard(1, 'test');
  Promise.all([getDice(), getComponent('decision-card')])
    .then((payload) => {
      console.log('Promise has been called');
      console.log(payload);

      if (payload[0].length === 0) {
        console.log('there is no data');
      }
      else {
        payload[0].forEach(dice => {
          createDecisionCard(dice, payload[1]);
        })
        return 'test';
      }
    })
    .catch(err => console.log(err));
};

// Home = viewHome;
export {viewHome}
