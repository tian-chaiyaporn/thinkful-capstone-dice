import HomeViewConstructor from './HomeViewConstructor';
import DiceViewConstructor from './DicePageViewConstructor';
import DiceEditViewConstructor from './DiceEditViewConstructor';
import DiceCreateViewConstructor from './DiceCreateViewConstructor';
import page from 'page';

// initialize page.js for routing in the front-end
page('/', HomeViewConstructor.viewHome);
page('/dice/new', DiceCreateViewConstructor.newDice);
page('/dice/:decisionId', DiceViewConstructor.diceView);
page('/dice/edit/:decisionId', DiceEditViewConstructor.diceEditView);
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
