import {getDice} from './Models/DecisionListState'
import {getComponent} from './Models/ComponentState'
import {BASE_URL, PORT} from './Utils/constants'
import replaceAll from './Utils/StringReplacer'

// create the home page
// control fetching lists of decision dice and input as html
const viewDice = function() {
  // var id = ctx.params.decisionId;
  console.log('id');
  // let diceArray;
  // Promise.all([getDice(), getComponent('decision-card')])
  //   .then((payload) => {
  //     payload[0].forEach(dice => createDecisionCard(dice, payload[1]))
  //   })
  //   .catch(err => console.log(err));
};

export {viewDice}
