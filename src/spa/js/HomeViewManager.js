import * as DecisionList from './Models/DecisionList.js'
import {BASE_URL, PORT} from './Utils/constants.js'

// create the home page
// control fetching lists of decision dice and input as html
const viewHome = (function() {
  console.log('viewHome');
  getDecisionList()
   .then(res => {
     res.forEach(decision => {
       console.log(decision);
      //  DecisionList.addDice(decision);
     })
   })
  //  .then(() => {
  //    return DecisionList.getDice();
  //  })
  //  .then(diceArray => {
  //    diceArray.forEach(dice => createDecisionCard(dice));
  //  })
   .catch(err => console.log(err));
})();

// get lists of decision dice from api
function getDecisionList() {
  return new Promise(function(res, rej) {
    console.log('getDecisionList');
    const target = '/decisions';
    const urlString = `http://${BASE_URL}:${PORT}${target}`;
    console.log('urlString', urlString);
    console.log(urlString);
    $.ajax({
        url: urlString,
        type: 'GET',
        contentType: 'application/json',
        xhrFields: {
          'withCredentials': false
        },
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      })
      .done(function(allDiceInfo) {
        console.log("get all dice");
        res(allDiceInfo);
        return;
      })
      .fail(function(err) {
        console.log(`cannot get dice with Error: ${err}`);
        console.log(err);
    });
  })
};

// get template for each decision and display it
function createDecisionCard(dice) {
  console.log(`createDecisionCard ${dice}`);
  const target = '/static/assets/app.js';
  const url = `${BASE_URL}:${PORT}${target}`;
  // load DiceCard template from pug static url
  // add Decision card to block main
};

export default {viewHome}
