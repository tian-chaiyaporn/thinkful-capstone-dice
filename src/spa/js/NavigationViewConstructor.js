import SignUpButton from './SignUpButton'
import SignInButton from './SignInButton'
import ComponentState from './Models/ComponentState'

const debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
const addNavBarFunctions = function() {
  debug('equip nav bar with functionalities /sign-up /sign-in /sign-out');

  $('.js-sign-up').click((e) => {
    ComponentState.getComponent('sign-up-form')
      .then(payload => SignUpButton.viewSignUpForm(payload))
  });

  $('.js-sign-in-out').click((e) => {
    if ($(e.currentTarget).text() === 'sign in') {
      ComponentState.getComponent('sign-in-form')
        .then(payload => SignInButton.viewSignInForm(payload))
        .then(() => {
          $(e.currentTarget).text('sign out');
          $('.js-sign-up').remove();
        })
    }
    else {
      SignOutButton.signOut();
      // turn text back to Sign in
    }
  });
};

export default {addNavBarFunctions}
