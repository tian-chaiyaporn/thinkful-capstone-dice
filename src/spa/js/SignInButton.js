import User from './Models/UserModel'
import UserState from './Models/UserState'
import NavigationViewConstructor from './NavigationViewConstructor'

const viewSignInForm = function(signInFormComponent) {
  console.log('add sign up form when clicked');

  $('header').append(signInFormComponent);

  $('.black-out').click(e => {
    $(e.currentTarget).remove();
    $('.js-sign-in-form').remove();
  })

  $('.js-sign-in-form').submit(e => {
    e.preventDefault();

    const username = $('.js-sign-in-form :input[name=username]').val();
    const password = $('.js-sign-in-form :input[name=password]').val();

    if ($('.js-alert-sign-in')) {
      $('.js-alert-sign-in').remove();
    }

    if (!username || !password) {
      $(e.currentTarget).append('<div class="js-alert-sign-in">please input both username and password</div>');
      return;
    }

    console.log(username, password)

    return User.signIn(username, password)
      .then((newUser) => {
        console.log('success');
        $(e.currentTarget).remove();
        $('.black-out').remove();
        return newUser;
      })
      .then((newUser) => {
        UserState.addUser(newUser);
        page('/');
        location.reload(true);
        // $('.js-sign-in-out').text('sign out');
        // $('.js-sign-up').hide();
      })
      // .then(() => {
      //   NavigationViewConstructor.addUserPageToNav()
      // })
      .catch((err) => {
        console.log('fail');
        console.log(err);
        $(e.currentTarget).append('<div>please try again</div>')
      })
  })
}

export default {viewSignInForm}
