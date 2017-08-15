import User from './Models/UserModel'
import UserState from './Models/UserState'

const viewSignUpForm = function(signUpFormComponent) {
  console.log('add sign up form when clicked');

  $('body').append(signUpFormComponent);

  $('.js-sign-up-form').submit(e => {
    e.preventDefault();

    const username = $('.js-sign-up-form :input[name=username]').val();
    const password = $('.js-sign-up-form :input[name=password]').val();

    if ($('.js-alert-sign-up')) {
      $('.js-alert-sign-up').remove();
    }

    if (!username || !password) {
      $(e.currentTarget).append('<div class="js-alert-sign-up">please input both username and password</div>');
      return;
    }

    console.log(username, password)

    return User.create(username, password)
      .then((newUser) => {
        console.log('success');
        $(e.currentTarget).remove();
        return newUser;
      })
      .then((newUser) => {
        UserState.addUser(newUser);
      })
      .catch((err) => {
        console.log('fail');
        console.log(err);
        $(e.currentTarget).append('<div>please try again</div>')
      })
  })
}

export default {viewSignUpForm}
