import * as RandomNGenerator from './Utils/RandomNGenerator'
import * as Constant from './Utils/constants'
import * as Dice from './Models/DiceModel'
import * as DecisionList from './Models/DecisionListState'
import {viewHome} from './HomeViewManager';
import {DiceView} from './DicePageViewManager';
// import page from 'page';

// initialize page.js for routing in the front-end
console.log('Home inside index.js:', viewHome);
console.log('DiceView inside index.js:', DiceView);

// page.base('/');
page('/', viewHome);
// page('/', () => console.log('Hooome!'));
// page('/dice', DiceView);
// page('/dice', () => console.log('Im at /dice! \o/'));
page('*', () => console.log('fallback cb'));
// page('/about', viewAbout);
// page('/sign-up', signUp);
// page('/sign-in', signIn);
// page('/sign-out', signOut);
// page('/new', createDice);
// page('/dice/:decisionId', viewDice);
// page('/:username', userPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);
//
page({ hashbang: false });
