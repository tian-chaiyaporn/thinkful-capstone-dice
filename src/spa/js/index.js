import NavigationViewConstructor from './NavigationViewConstructor';
import HomeViewConstructor from './HomeViewConstructor';
import DiceViewConstructor from './DicePageViewConstructor';
import DiceEditViewConstructor from './DiceEditViewConstructor';
import DiceCreateViewConstructor from './DiceCreateViewConstructor';
import UserState from './Models/UserState';
import User from './Models/UserModel';
import page from 'page';

if (userAuth === 'authed') {
  User.checkAuth()
    .then((userObject) => {
      UserState.removeUser();
      UserState.addUser(userObject);
    })
    .catch(() => {
      userAuth = unauthed
      window.location.reload(true);
    })
}

NavigationViewConstructor.addNavBarFunctions();

// initialize page.js for routing in the front-end
page('/', HomeViewConstructor.viewHome);
page('/dice/new', DiceCreateViewConstructor.newDice);
page('/dice/:decisionId', DiceViewConstructor.diceView);
page('/dice/edit/:decisionId', DiceEditViewConstructor.diceEditView);
// page('/about', viewAbout);
// page('/new', createDice);
// page('/:username', userPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);

page();

console.log(userAuth)
