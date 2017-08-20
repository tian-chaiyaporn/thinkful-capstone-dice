import SignUpButton from './SignUpButton'
import SignInButton from './SignInButton'
import SignOutButton from './SignOutButton'
import ComponentState from './Models/ComponentState'

const debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
const addNavBarFunctions = function() {
  debug('equip nav bar with functionalities /sign-up /sign-in /sign-out');

  if($('.js-sign-up')) {
    $('.js-sign-up').click((e) => {
      ComponentState.getComponent('sign-up-form')
        .then(payload => SignUpButton.viewSignUpForm(payload))
    });
  }

  $('.js-sign-in-out').click((e) => {
    if ($(e.currentTarget).text() === 'SIGN IN') {
      ComponentState.getComponent('sign-in-form')
        .then(payload => SignInButton.viewSignInForm(payload))
    }
    else {
      SignOutButton.signOut();
    }
  });
};

export default {addNavBarFunctions}
