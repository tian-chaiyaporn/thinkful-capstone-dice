const debug = require('debug')('dice');

module.exports = (...args) => (req, res, next) => {
  debug('fallback is being called');
  debug(req.session);

  const unauth = args[0];
  const auth = args[1];
  const params = args.slice(2);

  if (req.session.passport) {
    debug("session stored by passport");
    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
      (res.sendFile || res.sendfile).call(res, auth, ...params, err => err && next())
    } else next()
  } else {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
      (res.sendFile || res.sendfile).call(res, unauth, ...params, err => err && next())
    } else next()
  }
}
