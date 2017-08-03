import {getDice} from './Models/DecisionListState'
import {getComponent} from './Models/ComponentState'
import {BASE_URL, PORT} from './Utils/constants'
import replaceAll from './Utils/StringReplacer'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = function() {
  console.log('viewHome');
  let diceArray;
  Promise.all([getDice(), getComponent('decision-card')])
    .then((payload) => {
      if (payload[0].length === 0) {
        console.log('there is no data');
      } else {
        payload[0].forEach(dice => {
          createDecisionCard(dice, payload[1]);
        })
      }
    })
    .catch(err => console.log(err));
};

// get template for each decision and display it
function createDecisionCard(dice, component) {
  const map = {
    '@title': dice.decision,
    '@description': 'to be determined'
  }
  const card = replaceAll(component, map);
  $('.js-main-content').append(card);
  $('.js-roll').click((e) => {
    e.stopImmediatePropagation();
    dice.roll().then(result => alert(result.content));
  });
};

// Home = viewHome;
export {viewHome, createDecisionCard}
