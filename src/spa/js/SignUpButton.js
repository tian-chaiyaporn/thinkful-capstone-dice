import User from './Models/UserModel'
import UserState from './Models/UserState'
import NavigationViewConstructor from './NavigationViewConstructor'

const viewSignUpForm = function(signUpFormComponent) {
  console.log('add sign up form when clicked');

  $('header').append(signUpFormComponent);

  $('.black-out').click(e => {
    $(e.currentTarget).remove();
    $('.js-sign-up-form').remove();
  })

  $('.js-sign-up-form').submit(e => {
    e.preventDefault();

    const username = $('.js-sign-up-form :input[name=username]').val();
    const password = $('.js-sign-up-form :input[name=password]').val();

    if ($('.js-alert-sign-up')) {
      $('.js-alert-sign-up').remove();
    }

    if (!username || !password) {
      $(e.currentTarget).append('<div class="js-alert-sign-up" style="color: red;">please input both username and password</div>');
      return;
    }

    console.log(username, password)

    return User.create(username, password)
      .then((newUser) => {
        console.log('success');
        UserState.addUser(newUser);
        $(e.currentTarget).remove();
        $('.black-out').remove();
      })
      .then(() => {
        page('/');
        location.reload(true);
      })
      .catch((err) => {
        console.log('fail');
        console.log(err);
        if ($('.js-alert-sign-up')) {
          $('.js-alert-sign-up').text('please try again')
        }
        $(e.currentTarget).append('<div class="js-alert-sign-up" style="color: red;">please try a different username</div>')
      })
  })
}

export default {viewSignUpForm}
