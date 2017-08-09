import RandomNGenerator from './Utils/RandomNGenerator'
import Constant from './Utils/constants'
import Dice from './Models/DiceModel'
import DecisionList from './Models/DecisionListState'
import HomeVM from './HomeViewManager';
import DiceVM from './DicePageViewManager';
import DiceEditVM from './DiceEditViewManager';
// import {DiceView} from './DicePageViewManager';
import page from 'page';

// initialize page.js for routing in the front-end
// page.base('/')
page('/', HomeVM.viewHome);
// page('/dice', DiceVM.diceView);
page('/dice/:decisionId', DiceVM.diceView);
page('/dice/edit/:decisionId', DiceEditVM.diceEditView);
// page('*', () => console.log('fall back'));
// page('/about', viewAbout);
// page('/sign-up', signUp);
// page('/sign-in', signIn);
// page('/sign-out', signOut);
// page('/new', createDice);
// page('/:username', userPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);
//
page();
