import * as DecisionList from './Models_for_caching/Decision-List.js'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = (function() {
  console.log('viewHome');
  getDecisionList()
   .then(res => {
     res.forEach(dice => {
       createDecisionCard(dice);
     })
   })
   .catch(err => console.log(err));
})();

// get lists of decision dice and store in cache
function getDecisionList() {
  console.log('getDecisionList');
  return Promise.resolve(['1','2','3']);
};

// get template for each decision and display it
function createDecisionCard(dice) {
  console.log(`createDecisionCard ${dice}`);
};

// roll Dice - get options, store in cache, and apply random op
function rollDice() {
  // this.foo();
  // this.bar();
};

export default {viewHome}
