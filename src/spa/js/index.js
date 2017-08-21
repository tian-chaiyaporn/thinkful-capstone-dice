import NavigationViewConstructor from './NavigationViewConstructor';
import HomeViewConstructor from './HomeViewConstructor';
import DiceViewConstructor from './DicePageViewConstructor';
import DiceEditViewConstructor from './DiceEditViewConstructor';
import DiceCreateViewConstructor from './DiceCreateViewConstructor';
import UserPageViewConstructor from './UserPageViewConstructor';
import UserState from './Models/UserState';
import User from './Models/UserModel';
import page from 'page';

if (userAuth === 'auth') {
  console.log('checking user authentication')
  User.checkAuth()
    .then((userObject) => {
      UserState.removeUser();
      UserState.addUser(new User(userObject));
    })
    .then(() => {
      console.log('calling navigational view constructor again')
      NavigationViewConstructor.addUserPageToNav()
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
page('/profile', UserPageViewConstructor.viewUserPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);

page();

console.log(userAuth)
