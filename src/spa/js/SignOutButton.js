import User from './Models/UserModel'
import UserState from './Models/UserState'

const signOut = function() {
  console.log('sign user out when clicked');

  UserState.removeUser();
  User.logOut();
  location.reload(true)
  page('/');
  return Promise.resolve();
}

export default {signOut}
