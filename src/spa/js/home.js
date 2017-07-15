import {DecisionList} from './Models_for_caching/Decision-List.js'

// create the home page
const Home = {
  // control fetching lists of decision dice and input as html
  viewHome: () => {
    console.log('foo');
    this.getDecisionList()
     .then(res => {
       res.forEach(dice => {
         this.createDecisionCard(dice);
       })
     })
     .catch(err => console.log(err));
  },
  // get lists of decision dice and store in cache
  getDecisionList: () => {
    console.log('bar')
  },
  // get template for each decision and display it
  createDecisionCard: () => {
    console.log('bar')
  },
  // roll Dice - get options, store in cache, and apply random op
  rollDice: () => {
    this.foo();
    this.bar();
  }
};

export default Home
