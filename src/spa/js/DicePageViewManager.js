import {getDiceById} from './Models/DecisionListState'
import {getComponent} from './Models/ComponentState'
import {BASE_URL, PORT} from './Utils/constants'
import replaceAll from './Utils/StringReplacer'

// create the home page
// control fetching lists of decision dice and input as html
DiceView = function(ctx) {
  const id = ctx.params.id;
  console.log('dice view');
  console.log(id);
  Promise.all([getDiceById(id), getComponent('decision-page'), getComponent('decision-option')])
    .then((payload) => {
      payload[0].forEach(dice => {
        createDecisionPage(dice, payload[1]);
      })
    })
    .catch(err => console.log(err));
};

const createDecisionPage = function() {

}

export {DiceView}
