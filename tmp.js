function myFunctionThatReturnsAPromise () {
  return new Promise((res, rej) => {
    setTimeout(res, 1000)
  })
    .then(() => {
      console.log('First then() called.');
    })
    .then(() => {
      console.log('Second then() called. Something will get wrong.');

      throw new Error('Ops!');
    })
    .catch(err => {
      console.log('Something went wrong!');

      throw err;
    })
}

myFunctionThatReturnsAPromise()
  .then(() => {
    console.log('Outside then() called.');
  })
  .catch(err => {
    console.log('Something went wrong while using this promises', err);
  })
