(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))

},{"./debug":2,"_process":7}],2:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":4}],3:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],4:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],5:[function(require,module,exports){
(function (process){
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */
  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    // use shadow dom when available
    var el = e.path ? e.path[0] : e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

}).call(this,require('_process'))

},{"_process":7,"path-to-regexp":6}],6:[function(require,module,exports){
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

},{"isarray":3}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],9:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":8,"./lib/rng":9}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuidv4 = require('uuid/v4');

var addOptionToDOM = function addOptionToDOM(dice, optionComponent) {
  console.log('add button pressed');
  if (!$('.js-option-text').val().replace(/\s/g, '').length) {
    return;
  }
  var newId = uuidv4();
  var newOption = $('.js-option-text').val();

  $('.js-edit-options-list').append((0, _StringReplacer2.default)(optionComponent, { '@option': newOption }));

  $('.js-delete-option').click(function (e) {
    e.stopImmediatePropagation();
    $(e.currentTarget).parent().remove();
    dice.deleteOption(newId);
  });

  $('.js-option-text').val('');
  dice.addOption(newId, newOption);
};

exports.default = { addOptionToDOM: addOptionToDOM };

},{"./Utils/StringReplacer":34,"uuid/v4":10}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

// get template for each decision and display it
var createDecisionCard = function createDecisionCard(dice, component, diceAnimation) {
  debug('createDecisionCard was called');
  var map = {
    '@title': dice.decision,
    '@id': dice._id,
    '@description': dice.description
  };
  var card = (0, _StringReplacer2.default)(component, map);
  $('.js-main-content').append(card);
  $('.js-roll').click(function (e) {
    e.stopImmediatePropagation();
    var $currentDice = $(e.currentTarget).parent().parent().find('#cube');
    dice.roll().then(function (result) {
      $currentDice.addClass('roll');
      setTimeout(function () {
        alert('Your answer to "' + dice.decision + '" is: ' + result.content);
        $currentDice.removeClass('roll');
      }, 1000);
    });
  });
};

exports.default = { createDecisionCard: createDecisionCard };

},{"./Utils/StringReplacer":34,"debug":1}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var deleteDice = function deleteDice(dice) {
  _UserModel2.default.checkAuth().then(function () {
    return dice.deleteFromDb();
  }).then(function () {
    return deleteDiceFromCache(dice);
  }).then(function () {
    return page('/');
  }).catch(function (err) {
    return alert('cannot delete dice at this time');
  });
};

var deleteDiceFromCache = function deleteDiceFromCache(dice) {
  return _DecisionListState2.default.removeDiceById(dice._id);
};

exports.default = { deleteDice: deleteDice };

},{"./Models/DecisionListState":22,"./Models/UserModel":24}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

var _AddButton = require('./AddButton');

var _AddButton2 = _interopRequireDefault(_AddButton);

var _SaveButton = require('./SaveButton');

var _SaveButton2 = _interopRequireDefault(_SaveButton);

var _DiceModel = require('./Models/DiceModel');

var _DiceModel2 = _interopRequireDefault(_DiceModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

var newDice = [];

var createDiceEditPage = function createDiceEditPage(pageLayout, diceHeaderComponent, optionComponent, saveBtn) {
  debug('createDiceEditPage was called');
  var diceMap = {
    '@title': '',
    '@description': ''
  };
  $('.js-main-content').append(pageLayout);
  $('.js-edit-dice-face').append((0, _StringReplacer2.default)(diceHeaderComponent, diceMap));
  $('.js-edit-dice-option').append(saveBtn);

  var newDiceWorkingMemory = {
    'decision': 'new dice',
    'description': 'new description',
    'options': []
  };

  _DiceModel2.default.createMock(newDiceWorkingMemory).then(function (dice) {
    newDice.length = 0;
    newDice.push(dice);
    $('.js-add-option').click(function () {
      return _AddButton2.default.addOptionToDOM(dice, optionComponent);
    });
    $('.js-save-dice').click(function () {
      console.log('save dice clicked');
      _SaveButton2.default.saveDice(newDice[0], $('.js-input-title').val(), $('.js-input-description').val());
    });
  });
};

exports.default = { createDiceEditPage: createDiceEditPage };

},{"./AddButton":11,"./Models/DiceModel":23,"./SaveButton":27,"./Utils/StringReplacer":34,"debug":1}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _DiceCreateView = require('./DiceCreateView');

var _DiceCreateView2 = _interopRequireDefault(_DiceCreateView);

var _ClearHTML = require('./Utils/ClearHTML');

var _ClearHTML2 = _interopRequireDefault(_ClearHTML);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create the home page
// control fetching lists of decision dice and input as html
var newDice = function newDice() {
  return Promise.all([_ComponentState2.default.getComponent('dice-edit-page'), _ComponentState2.default.getComponent('dice-edit-face'), _ComponentState2.default.getComponent('dice-edit-option'), _ComponentState2.default.getComponent('save-button')]).then(function (payload) {
    console.log(payload);
    _ClearHTML2.default.clearHtml('js-main-content');
    _DiceCreateView2.default.createDiceEditPage(payload[0], payload[1], payload[2], payload[3]);
  });
};

exports.default = { newDice: newDice };

},{"./DiceCreateView":14,"./Models/ComponentState":21,"./Utils/ClearHTML":32}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

var _AddButton = require('./AddButton.js');

var _AddButton2 = _interopRequireDefault(_AddButton);

var _DeleteButton = require('./DeleteButton.js');

var _DeleteButton2 = _interopRequireDefault(_DeleteButton);

var _SaveButton = require('./SaveButton.js');

var _SaveButton2 = _interopRequireDefault(_SaveButton);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createDiceEditPage = function createDiceEditPage(dice, pageLayout, diceHeaderComponent, optionComponent, saveBtn, deleteBtn) {
  console.log('createDiceEditPage was called');
  var diceMap = {
    '@title': dice.decision,
    '@description': dice.description
  };
  $('.js-main-content').append(pageLayout);
  $('.js-edit-dice-face').append((0, _StringReplacer2.default)(diceHeaderComponent, diceMap));
  $('.js-edit-dice-option').append(saveBtn);
  $('.js-edit-dice-option').append(deleteBtn);

  dice.options.forEach(function (option) {
    $('.js-edit-options-list').append((0, _StringReplacer2.default)(optionComponent, { '@option': option.content }));
    $('.js-delete-option').click(function (e) {
      e.stopImmediatePropagation();
      $(e.currentTarget).parent().remove();
      dice.deleteOption(option.face);
    });
  });

  $('.js-add-option').click(function () {
    return _AddButton2.default.addOptionToDOM(dice, optionComponent);
  });
  $('.js-save-dice').click(function () {
    return _SaveButton2.default.updateDice(dice, $('.js-input-title').val(), $('.js-input-description').val());
  });
  $('.js-delete-dice').click(function () {
    return _DeleteButton2.default.deleteDice(dice);
  });
};

exports.default = { createDiceEditPage: createDiceEditPage };

},{"./AddButton.js":11,"./DeleteButton.js":13,"./SaveButton.js":27,"./Utils/StringReplacer":34}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

var _DiceEditView = require('./DiceEditView');

var _DiceEditView2 = _interopRequireDefault(_DiceEditView);

var _ClearHTML = require('./Utils/ClearHTML');

var _ClearHTML2 = _interopRequireDefault(_ClearHTML);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// create the home page
// control fetching lists of decision dice and input as html
var diceEditView = function diceEditView(ctx) {

  _UserModel2.default.checkAuth();

  var id = ctx.params.decisionId;
  console.log('id = ' + id);
  return Promise.all([_DecisionListState2.default.getDiceById(ctx.params.decisionId), _ComponentState2.default.getComponent('dice-edit-page'), _ComponentState2.default.getComponent('dice-edit-face'), _ComponentState2.default.getComponent('dice-edit-option'), _ComponentState2.default.getComponent('save-button'), _ComponentState2.default.getComponent('delete-button')]).then(function (data) {
    console.log(data);
    if (!data[0]) {
      console.log('there is no dice data');
      throw new Error('There is no data');
    } else {
      _ClearHTML2.default.clearHtml('js-main-content');
      _DiceEditView2.default.createDiceEditPage(data[0], data[1], data[2], data[3], data[4], data[5]);
    }
  });
};

// export default DiceView
exports.default = { diceEditView: diceEditView };

},{"./DiceEditView":16,"./Models/ComponentState":21,"./Models/DecisionListState":22,"./Models/UserModel":24,"./Utils/ClearHTML":32}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _StringReplacer = require('./Utils/StringReplacer');

var _StringReplacer2 = _interopRequireDefault(_StringReplacer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createDicePage = function createDicePage(dice, pageLayout, diceComponent, optionComponent, editBtn) {
  console.log('createDicePage was called');
  var diceMap = {
    '@title': dice.decision,
    '@description': dice.description,
    '@id': dice._id
  };
  var diceFace = (0, _StringReplacer2.default)(diceComponent, diceMap);
  $('.js-main-content').append(pageLayout);
  $('.js-dice-face').append(diceFace);
  $('.js-roll').click(function (e) {
    e.stopImmediatePropagation();
    dice.roll().then(function (result) {
      return alert(result.content);
    });
  });

  if (editBtn) {
    var editMap = {
      '@id': dice._id
    };
    var editButton = (0, _StringReplacer2.default)(editBtn, editMap);
    $('.js-dice-option').append(editButton);
  }

  dice.options.forEach(function (option) {
    $('.js-options-list').append((0, _StringReplacer2.default)(optionComponent, { '@option': option.content }));
  });
};

exports.default = { createDicePage: createDicePage };

},{"./Utils/StringReplacer":34}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

var _DicePageView = require('./DicePageView');

var _DicePageView2 = _interopRequireDefault(_DicePageView);

var _ClearHTML = require('./Utils/ClearHTML');

var _ClearHTML2 = _interopRequireDefault(_ClearHTML);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
var diceView = function diceView(ctx) {
  var id = ctx.params.decisionId;
  var user = _UserState2.default.getState();
  debug('id = ' + id);
  var asyncOperations = [_DecisionListState2.default.getDiceById(ctx.params.decisionId), _ComponentState2.default.getComponent('dice-page'), _ComponentState2.default.getComponent('dice-face'), _ComponentState2.default.getComponent('dice-option')];

  if (user) {
    if (user.decision_id.includes(id)) {
      asyncOperations.push(_ComponentState2.default.getComponent('edit-button'));
    }
  }

  return Promise.all(asyncOperations).then(function (payload) {
    if (!payload[0]) {
      console.log('there is no dice data');
      throw new Error('There is no data');
    } else {
      _ClearHTML2.default.clearHtml('js-main-content');
      _DicePageView2.default.createDicePage(payload[0], payload[1], payload[2], payload[3], payload[4]);
    }
  });
};

// export default DiceView
exports.default = { diceView: diceView };

},{"./DicePageView":18,"./Models/ComponentState":21,"./Models/DecisionListState":22,"./Models/UserState":25,"./Utils/ClearHTML":32,"debug":1}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _DecisionCardView = require('./DecisionCardView');

var _DecisionCardView2 = _interopRequireDefault(_DecisionCardView);

var _ClearHTML = require('./Utils/ClearHTML');

var _ClearHTML2 = _interopRequireDefault(_ClearHTML);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
var viewHome = function viewHome() {
  debug('viewHome starting');

  return Promise.all([_DecisionListState2.default.getDice(), _ComponentState2.default.getComponent('decision-card'), _ComponentState2.default.getComponent('dice-animation')]).then(function (payload) {
    debug(payload);
    if (payload[0].length === 0) {
      debug('there is no data');
      throw new Error('There is no data');
    } else {
      _ClearHTML2.default.clearHtml('js-main-content');
      payload[0].forEach(function (dice) {
        _DecisionCardView2.default.createDecisionCard(dice, payload[1], payload[2]);
      });
    }
  });
};

exports.default = { viewHome: viewHome };

},{"./DecisionCardView":12,"./Models/ComponentState":21,"./Models/DecisionListState":22,"./Models/UserState":25,"./Utils/ClearHTML":32,"debug":1}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _constants = require('../Utils/constants');

var COMPONENTS_OBJ = {};

// add component to COMPONENTS_OBJ for caching
var addComponentToState = function addComponentToState(key, component) {
  COMPONENTS_OBJ[key] = component;
};

// return a COMPONENT by key from in-memory
var getComponent = function getComponent(key) {
  console.log('getComponent was called');
  return new Promise(function (res) {
    if (COMPONENTS_OBJ[key]) {
      res(COMPONENTS_OBJ[key]);
    } else {
      getComponentAPI(key).then(function () {
        return res(COMPONENTS_OBJ[key]);
      });
    }
  });
};

// get component templates from api
var getComponentAPI = function getComponentAPI(name) {
  return new Promise(function (res, rej) {
    var target = '/static/' + name + '.html';
    var urlString = '' + target;
    $.ajax({ url: urlString }).done(function (component) {
      addComponentToState(name, component);
      res(component);
      return;
    }).fail(function (err) {
      rej('cannot get component - Error: ' + err);
    });
  });
};

exports.default = { getComponent: getComponent };

},{"../Utils/constants":35}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DiceModel = require('./DiceModel');

var _DiceModel2 = _interopRequireDefault(_DiceModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

var DECISION_LIST = [];

// add dice to decision list
var addDice = function addDice(dice) {
  DECISION_LIST.push(new _DiceModel2.default(dice));
};

// remove dice from decision list by ID
var removeDiceById = function removeDiceById(dice_id) {
  DECISION_LIST.splice(DECISION_LIST.indexOf(DECISION_LIST.find(function (dice) {
    return dice._id === dice_id;
  })), 1);
};

// remove all dice to decision list
var removeAllDice = function removeAllDice() {
  DECISION_LIST.length = 0;
};

// return a list of dice from in-memory
var getDice = function getDice(idArray) {
  debug('getDice was called');
  return new Promise(function (res) {
    if (DECISION_LIST.length !== 0) {
      res(!idArray ? DECISION_LIST : DECISION_LIST.filter(function (d) {
        return idArray.includes(d._id);
      }));
    } else {
      getDecisionListApi().then(function () {
        return res(!idArray ? DECISION_LIST : DECISION_LIST.filter(function (d) {
          return idArray.includes(d._id);
        }));
      });
    }
  });
};

// return a single dice from in-memory
var getDiceById = function getDiceById(decisionId) {
  debug('getDiceById was called');
  return new Promise(function (res) {
    if (DECISION_LIST.length !== 0) {
      res(DECISION_LIST.find(function (dice) {
        return dice._id === decisionId;
      }));
    } else {
      getDecisionListApi().then(function () {
        return res(DECISION_LIST.find(function (dice) {
          return dice._id === decisionId;
        }));
      });
    }
  });
};

// get lists of decision dice from api
var getDecisionListApi = function getDecisionListApi() {
  debug('getDecisionListApi was called');
  return new Promise(function (res, rej) {
    var target = '/decisions';
    var urlString = '' + target;
    $.ajax({ url: urlString }).done(function (allDiceInfo) {
      allDiceInfo.forEach(function (decision) {
        return addDice(decision);
      });
      res();
      return;
    }).fail(function (err) {
      rej('cannot get dice - Error: ' + err);
    });
  });
};

exports.default = { addDice: addDice, removeAllDice: removeAllDice, removeDiceById: removeDiceById, getDice: getDice, getDiceById: getDiceById, getDecisionListApi: getDecisionListApi };

},{"./DiceModel":23,"debug":1}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _RandomNGenerator = require('../Utils/RandomNGenerator');

var _RandomNGenerator2 = _interopRequireDefault(_RandomNGenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Dice = function () {
  function Dice(decision) {
    var _this = this;

    _classCallCheck(this, Dice);

    ;['_id', 'decision', 'description', 'options'].forEach(function (key) {
      if (!decision.hasOwnProperty(key)) {
        throw new Error('Parameter ' + key + ' is  required.');
      }
      _this[key] = decision[key];
    });
  }

  _createClass(Dice, [{
    key: 'roll',
    value: function roll() {
      var _this2 = this;

      return (0, _RandomNGenerator2.default)(0, this.options.length).then(function (chosenOption) {
        return _this2.options[chosenOption];
      });
    }
  }, {
    key: 'deleteOption',
    value: function deleteOption(optionId) {
      this.options.splice(this.options.indexOf(this.options.find(function (opt) {
        return opt.face === optionId;
      })), 1);
      return;
    }
  }, {
    key: 'addOption',
    value: function addOption(optionId, optionContent) {
      this.options.push({
        face: optionId,
        content: optionContent
      });
      return;
    }
  }, {
    key: 'saveToDb',
    value: function saveToDb(newTitle, newDescription) {
      var _this3 = this;

      return new Promise(function (res, rej) {
        _this3.decision = newTitle;
        _this3.description = newDescription;
        var target = '/decisions/' + _this3._id;
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'PATCH',
          data: JSON.stringify({
            "decision": newTitle,
            "description": newDescription,
            "options": _this3.options
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        }).done(function () {
          return res();
        }).fail(function (err) {
          return rej('cannot update dice - Error: ' + err);
        });
      });
    }
  }, {
    key: 'deleteFromDb',
    value: function deleteFromDb() {
      var _this4 = this;

      return new Promise(function (res, rej) {
        var target = '/decisions/' + _this4._id;
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'DELETE'
        }).done(function () {
          return res();
        }).fail(function (err) {
          return rej('cannot delete dice - Error: ' + err);
        });
      });
    }
  }], [{
    key: 'createMock',
    value: function createMock(diceInfo) {
      return new Promise(function (res, rej) {
        res(new Dice({
          _id: 10000001,
          decision: diceInfo.decision,
          description: diceInfo.description,
          options: diceInfo.options
        }));
      });
    }
  }, {
    key: 'create',
    value: function create(diceInfo) {
      return new Promise(function (res, rej) {
        var target = '/decisions/new';
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify(diceInfo),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        }).done(function (payload) {
          res(new Dice(payload));
          return;
        }).fail(function (err) {
          return rej('cannot create dice - Error: ' + err);
        });
      });
    }
  }, {
    key: 'load',
    value: function load(diceId) {
      // get dice somehow from API and return a promise that resolves with a Dice
      // instance
      return jQuery.ajax('asdf', {
        data: {
          id: diceId
        }
      }).then(function (payload) {
        return new Dice(payload);
      });
    }
  }, {
    key: 'save',
    value: function save(dice) {}
  }, {
    key: 'delete',
    value: function _delete(dice) {}
  }, {
    key: 'find',
    value: function find(params) {}
  }]);

  return Dice;
}();
//
// Dice.load(1)
//   .then(dice => console.log(dice._id))
//   .catch(console.error)


exports.default = Dice;

},{"../Utils/RandomNGenerator":33}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var User = function () {
  function User(user) {
    var _this = this;

    _classCallCheck(this, User);

    ;['_id', 'username', 'decision_id'].forEach(function (key) {
      if (!user.hasOwnProperty(key)) {
        throw new Error('Parameter ' + key + ' is  required.');
      }
      _this[key] = user[key];
    });
  }

  _createClass(User, [{
    key: 'saveDiceIdToDb',
    value: function saveDiceIdToDb(diceId) {
      var _this2 = this;

      return new Promise(function (res, rej) {
        _this2.decision_id.push(diceId);
        var target = '/user/add-dice';
        var urlString = '' + target;
        console.log('saving dice id to db');
        $.ajax({
          url: urlString,
          method: 'PATCH',
          data: JSON.stringify({
            "_id": _this2._id,
            "decision_id": _this2.decision_id
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        }).done(function () {
          return res();
        }).fail(function (err) {
          return rej(err);
        });
      });
    }
  }], [{
    key: 'create',
    value: function create(username, password) {
      return new Promise(function (res, rej) {
        var target = '/user';
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify({
            'username': username,
            'password': password
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        }).done(function (user_id) {
          console.log('signup successful');
          res(User.signIn(username, password));
          return;
        }).fail(function (err) {
          return rej('cannot create user - Error: ' + err);
        });
      });
    }
  }, {
    key: 'signIn',
    value: function signIn(username, password) {
      return new Promise(function (res, rej) {
        var target = '/user/login';
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'POST',
          data: JSON.stringify({
            'username': username,
            'password': password
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json"
        }).done(function (payload) {
          console.log('signin successful');
          console.log(payload);
          res(new User({
            _id: payload._id,
            username: payload.username,
            decision_id: payload.decision_id
          }));
          return;
        }).fail(function (err) {
          return rej('cannot sign in - Error: ' + err);
        });
      });
    }
  }, {
    key: 'logOut',
    value: function logOut() {
      return new Promise(function (res, rej) {
        var target = '/user/logout';
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'GET'
        }).done(function (payload) {
          console.log('signout successful');
          res();
          return;
        }).fail(function (err) {
          return rej('cannot log out - Error: ' + err);
        });
      });
    }
  }, {
    key: 'checkAuth',
    value: function checkAuth() {
      console.log('user model is called');
      return new Promise(function (res, rej) {
        var target = '/user/check-authentication';
        var urlString = '' + target;
        $.ajax({
          url: urlString,
          method: 'GET'
        }).done(function (payload) {
          console.log('user authentication is successful');
          res(payload);
          return;
        }).fail(function (err) {
          return rej('user is not authenticated - Error: ' + err);
        });
      });
    }
  }, {
    key: 'save',
    value: function save(dice) {}
  }, {
    key: 'delete',
    value: function _delete(dice) {}
  }, {
    key: 'find',
    value: function find(params) {}
  }]);

  return User;
}();

exports.default = User;

},{}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _UserModel = require('./UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

var USER_STATE = [];

var addUser = function addUser(user) {
  debug(user);
  USER_STATE.push(user);
  debug('USER_STATE added');
  debug(USER_STATE);
};

var removeUser = function removeUser() {
  USER_STATE.length = 0;
  debug('USER_STATE removed');
  debug(USER_STATE);
};

// add dice_id to user decision_id list
var addDiceId = function addDiceId(diceId) {
  debug('adding dice id to user state');
  USER_STATE[0].decision_id.push(diceId);
};

var getState = function getState() {
  return USER_STATE[0];
};

var getStateArray = function getStateArray() {
  return USER_STATE;
};

exports.default = { addUser: addUser, removeUser: removeUser, addDiceId: addDiceId, getState: getState, getStateArray: getStateArray };

},{"./UserModel":24,"debug":1}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _SignUpButton = require('./SignUpButton');

var _SignUpButton2 = _interopRequireDefault(_SignUpButton);

var _SignInButton = require('./SignInButton');

var _SignInButton2 = _interopRequireDefault(_SignInButton);

var _SignOutButton = require('./SignOutButton');

var _SignOutButton2 = _interopRequireDefault(_SignOutButton);

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
var addNavBarFunctions = function addNavBarFunctions() {
  debug('equip nav bar with functionalities /sign-up /sign-in /sign-out');

  if ($('.js-sign-up')) {
    $('.js-sign-up').click(function (e) {
      _ComponentState2.default.getComponent('sign-up-form').then(function (payload) {
        return _SignUpButton2.default.viewSignUpForm(payload);
      });
    });
  }

  $('.js-sign-in-out').click(function (e) {
    if ($(e.currentTarget).text() === 'SIGN IN') {
      _ComponentState2.default.getComponent('sign-in-form').then(function (payload) {
        return _SignInButton2.default.viewSignInForm(payload);
      });
    } else {
      _SignOutButton2.default.signOut();
    }
  });
};

var addUserPageToNav = function addUserPageToNav() {
  var user = _UserState2.default.getState();
  $('.js-user-page').text(user.username);
  $('.js-user-page').click(function (e) {
    // e.preventDefault()
    // page(`/profile`)
  });
};

exports.default = { addNavBarFunctions: addNavBarFunctions, addUserPageToNav: addUserPageToNav };

},{"./Models/ComponentState":21,"./Models/UserState":25,"./SignInButton":28,"./SignOutButton":29,"./SignUpButton":30,"debug":1}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _DiceModel = require('./Models/DiceModel');

var _DiceModel2 = _interopRequireDefault(_DiceModel);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var saveDice = function saveDice(diceInstance, title, description) {
  if (diceInstance.options.length === 0) {
    alert('please input some options');
    return;
  }

  if (title === '' || description === '') {
    alert('please input both title and description');
    return;
  }

  var user = _UserState2.default.getState();
  _DiceModel2.default.create({
    'decision': title,
    'description': description,
    'options': diceInstance.options
  }).then(function (newDice) {
    if (user) {
      console.log('user exist');
      console.log(user);
      // UserState.addDiceId(newDice._id);
      user.saveDiceIdToDb(newDice._id);
    }
    // DecisionListState.addDice(newDice);
    page('/dice/' + newDice._id);
  }).catch(function (err) {
    console.log(err);
    alert('cannot update dice at this time');
  });
};

var updateDice = function updateDice(diceInstance, title, description) {
  if (diceInstance.options.length === 0) {
    alert('please input some options');
    return;
  }

  if (title === '' || description === '') {
    alert('please input both title and description');
    return;
  }

  diceInstance.saveToDb(title, description).then(function () {
    page('/dice/' + diceInstance._id);
  }).catch(function (err) {
    return alert('cannot update dice at this time');
  });
};

exports.default = { saveDice: saveDice, updateDice: updateDice };

},{"./Models/DecisionListState":22,"./Models/DiceModel":23,"./Models/UserState":25}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

var _NavigationViewConstructor = require('./NavigationViewConstructor');

var _NavigationViewConstructor2 = _interopRequireDefault(_NavigationViewConstructor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var viewSignInForm = function viewSignInForm(signInFormComponent) {
  console.log('add sign up form when clicked');

  $('header').append(signInFormComponent);

  $('.black-out').click(function (e) {
    $(e.currentTarget).remove();
    $('.js-sign-in-form').remove();
  });

  $('.js-sign-in-form').submit(function (e) {
    e.preventDefault();

    var username = $('.js-sign-in-form :input[name=username]').val();
    var password = $('.js-sign-in-form :input[name=password]').val();

    if ($('.js-alert-sign-in')) {
      $('.js-alert-sign-in').remove();
    }

    if (!username || !password) {
      $(e.currentTarget).append('<div class="js-alert-sign-in">please input both username and password</div>');
      return;
    }

    console.log(username, password);

    return _UserModel2.default.signIn(username, password).then(function (newUser) {
      console.log('success');
      $(e.currentTarget).remove();
      $('.black-out').remove();
      return newUser;
    }).then(function (newUser) {
      _UserState2.default.addUser(newUser);
      page('/');
      location.reload(true);
      // $('.js-sign-in-out').text('sign out');
      // $('.js-sign-up').hide();
    })
    // .then(() => {
    //   NavigationViewConstructor.addUserPageToNav()
    // })
    .catch(function (err) {
      console.log('fail');
      console.log(err);
      $(e.currentTarget).append('<div>please try again</div>');
    });
  });
};

exports.default = { viewSignInForm: viewSignInForm };

},{"./Models/UserModel":24,"./Models/UserState":25,"./NavigationViewConstructor":26}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var signOut = function signOut() {
  console.log('sign user out when clicked');

  _UserState2.default.removeUser();
  _UserModel2.default.logOut();
  location.reload(true);
  page('/');
  return Promise.resolve();
};

exports.default = { signOut: signOut };

},{"./Models/UserModel":24,"./Models/UserState":25}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

var _NavigationViewConstructor = require('./NavigationViewConstructor');

var _NavigationViewConstructor2 = _interopRequireDefault(_NavigationViewConstructor);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var viewSignUpForm = function viewSignUpForm(signUpFormComponent) {
  console.log('add sign up form when clicked');

  $('header').append(signUpFormComponent);

  $('.black-out').click(function (e) {
    $(e.currentTarget).remove();
    $('.js-sign-up-form').remove();
  });

  $('.js-sign-up-form').submit(function (e) {
    e.preventDefault();

    var username = $('.js-sign-up-form :input[name=username]').val();
    var password = $('.js-sign-up-form :input[name=password]').val();

    if ($('.js-alert-sign-up')) {
      $('.js-alert-sign-up').remove();
    }

    if (!username || !password) {
      $(e.currentTarget).append('<div class="js-alert-sign-up">please input both username and password</div>');
      return;
    }

    console.log(username, password);

    return _UserModel2.default.create(username, password).then(function (newUser) {
      console.log('success');
      _UserState2.default.addUser(newUser);
      $(e.currentTarget).remove();
      $('.black-out').remove();
    }).then(function () {
      // $('.js-sign-in-out').text('SIGN OUT');
      // $('.js-sign-up').hide();
      // NavigationViewConstructor.addUserPageToNav();
      page('/');
      location.reload(true);
    }).catch(function (err) {
      console.log('fail');
      console.log(err);
      $(e.currentTarget).append('<div>please try again</div>');
    });
  });
};

exports.default = { viewSignUpForm: viewSignUpForm };

},{"./Models/UserModel":24,"./Models/UserState":25,"./NavigationViewConstructor":26}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _DecisionListState = require('./Models/DecisionListState');

var _DecisionListState2 = _interopRequireDefault(_DecisionListState);

var _ComponentState = require('./Models/ComponentState');

var _ComponentState2 = _interopRequireDefault(_ComponentState);

var _DecisionCardView = require('./DecisionCardView');

var _DecisionCardView2 = _interopRequireDefault(_DecisionCardView);

var _ClearHTML = require('./Utils/ClearHTML');

var _ClearHTML2 = _interopRequireDefault(_ClearHTML);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('debug')('dice');

// create the home page
// control fetching lists of decision dice and input as html
var viewUserPage = function viewUserPage(ctx) {
  var name = ctx.params.username;
  var user = _UserState2.default.getState();
  debug('UserPageViewConstructor starting');

  return Promise.all([_DecisionListState2.default.getDice(user.decision_id), _ComponentState2.default.getComponent('decision-card')]).then(function (payload) {
    if (payload[0].length === 0) {
      console.log('there is no data');
      throw new Error('There is no data');
    } else {
      _ClearHTML2.default.clearHtml('js-main-content');
      payload[0].forEach(function (dice) {
        _DecisionCardView2.default.createDecisionCard(dice, payload[1]);
      });
    }
  });
};

exports.default = { viewUserPage: viewUserPage };

},{"./DecisionCardView":12,"./Models/ComponentState":21,"./Models/DecisionListState":22,"./Models/UserState":25,"./Utils/ClearHTML":32,"debug":1}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var clearHtml = function clearHtml(elem) {
  $('.' + elem).html('');
  return;
};

exports.default = { clearHtml: clearHtml };

},{}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getRandomNumber;
function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Promise.resolve(Math.floor(Math.random() * (max - min)) + min);
};

// provided by:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

},{}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = replaceAll;
function replaceAll(str, mapObj) {
  var re = new RegExp(Object.keys(mapObj).join("|"), "gi");

  return str.replace(re, function (matched) {
    return mapObj[matched.toLowerCase()];
  });
}

// provided by:
// https://stackoverflow.com/questions/15604140/replace-multiple-strings-with-multiple-other-strings

},{}],35:[function(require,module,exports){
(function (process){
'use strict';

exports.PORT = process.env.PORT || 8080;

exports.BASE_URL = 'localhost';

}).call(this,require('_process'))

},{"_process":7}],36:[function(require,module,exports){
'use strict';

var _NavigationViewConstructor = require('./NavigationViewConstructor');

var _NavigationViewConstructor2 = _interopRequireDefault(_NavigationViewConstructor);

var _HomeViewConstructor = require('./HomeViewConstructor');

var _HomeViewConstructor2 = _interopRequireDefault(_HomeViewConstructor);

var _DicePageViewConstructor = require('./DicePageViewConstructor');

var _DicePageViewConstructor2 = _interopRequireDefault(_DicePageViewConstructor);

var _DiceEditViewConstructor = require('./DiceEditViewConstructor');

var _DiceEditViewConstructor2 = _interopRequireDefault(_DiceEditViewConstructor);

var _DiceCreateViewConstructor = require('./DiceCreateViewConstructor');

var _DiceCreateViewConstructor2 = _interopRequireDefault(_DiceCreateViewConstructor);

var _UserPageViewConstructor = require('./UserPageViewConstructor');

var _UserPageViewConstructor2 = _interopRequireDefault(_UserPageViewConstructor);

var _UserState = require('./Models/UserState');

var _UserState2 = _interopRequireDefault(_UserState);

var _UserModel = require('./Models/UserModel');

var _UserModel2 = _interopRequireDefault(_UserModel);

var _page = require('page');

var _page2 = _interopRequireDefault(_page);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (userAuth === 'auth') {
  console.log('checking user authentication');
  _UserModel2.default.checkAuth().then(function (userObject) {
    _UserState2.default.removeUser();
    _UserState2.default.addUser(new _UserModel2.default(userObject));
  }).then(function () {
    console.log('calling navigational view constructor again');
    _NavigationViewConstructor2.default.addUserPageToNav();
  }).catch(function () {
    userAuth = unauthed;
    window.location.reload(true);
  });
}

_NavigationViewConstructor2.default.addNavBarFunctions();

// initialize page.js for routing in the front-end
(0, _page2.default)('/', _HomeViewConstructor2.default.viewHome);
(0, _page2.default)('/dice/new', _DiceCreateViewConstructor2.default.newDice);
(0, _page2.default)('/dice/:decisionId', _DicePageViewConstructor2.default.diceView);
(0, _page2.default)('/dice/edit/:decisionId', _DiceEditViewConstructor2.default.diceEditView);
// page('/about', viewAbout);
// page('/new', createDice);
(0, _page2.default)('/profile', _UserPageViewConstructor2.default.viewUserPage);
// page('/:username/:decisionId', viewDice);
// page('/:username/:decisionId/edit', editDice);
// page('/:username/:decisionId/delete', deleteDice);

(0, _page2.default)();

console.log(userAuth);

},{"./DiceCreateViewConstructor":15,"./DiceEditViewConstructor":17,"./DicePageViewConstructor":19,"./HomeViewConstructor":20,"./Models/UserModel":24,"./Models/UserState":25,"./NavigationViewConstructor":26,"./UserPageViewConstructor":31,"page":5}]},{},[36])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFnZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYWdlL25vZGVfbW9kdWxlcy9wYXRoLXRvLXJlZ2V4cC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92NC5qcyIsInNyYy9zcGEvanMvQWRkQnV0dG9uLmpzIiwic3JjL3NwYS9qcy9EZWNpc2lvbkNhcmRWaWV3LmpzIiwic3JjL3NwYS9qcy9EZWxldGVCdXR0b24uanMiLCJzcmMvc3BhL2pzL0RpY2VDcmVhdGVWaWV3LmpzIiwic3JjL3NwYS9qcy9EaWNlQ3JlYXRlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9EaWNlRWRpdFZpZXcuanMiLCJzcmMvc3BhL2pzL0RpY2VFZGl0Vmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9EaWNlUGFnZVZpZXcuanMiLCJzcmMvc3BhL2pzL0RpY2VQYWdlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9Ib21lVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9Nb2RlbHMvQ29tcG9uZW50U3RhdGUuanMiLCJzcmMvc3BhL2pzL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZS5qcyIsInNyYy9zcGEvanMvTW9kZWxzL0RpY2VNb2RlbC5qcyIsInNyYy9zcGEvanMvTW9kZWxzL1VzZXJNb2RlbC5qcyIsInNyYy9zcGEvanMvTW9kZWxzL1VzZXJTdGF0ZS5qcyIsInNyYy9zcGEvanMvTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5qcyIsInNyYy9zcGEvanMvU2F2ZUJ1dHRvbi5qcyIsInNyYy9zcGEvanMvU2lnbkluQnV0dG9uLmpzIiwic3JjL3NwYS9qcy9TaWduT3V0QnV0dG9uLmpzIiwic3JjL3NwYS9qcy9TaWduVXBCdXR0b24uanMiLCJzcmMvc3BhL2pzL1VzZXJQYWdlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9VdGlscy9DbGVhckhUTUwuanMiLCJzcmMvc3BhL2pzL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3IuanMiLCJzcmMvc3BhL2pzL1V0aWxzL1N0cmluZ1JlcGxhY2VyLmpzIiwic3JjL3NwYS9qcy9VdGlscy9jb25zdGFudHMuanMiLCJzcmMvc3BhL2pzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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SUFBWixJQUFvQixJQUFuQzs7QUFFQSxRQUFRLFFBQVIsR0FBbUIsV0FBbkI7Ozs7Ozs7QUNGQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQUksYUFBYSxNQUFqQixFQUF5QjtBQUN2QixVQUFRLEdBQVIsQ0FBWSw4QkFBWjtBQUNBLHNCQUFLLFNBQUwsR0FDRyxJQURILENBQ1EsVUFBQyxVQUFELEVBQWdCO0FBQ3BCLHdCQUFVLFVBQVY7QUFDQSx3QkFBVSxPQUFWLENBQWtCLHdCQUFTLFVBQVQsQ0FBbEI7QUFDRCxHQUpILEVBS0csSUFMSCxDQUtRLFlBQU07QUFDVixZQUFRLEdBQVIsQ0FBWSw2Q0FBWjtBQUNBLHdDQUEwQixnQkFBMUI7QUFDRCxHQVJILEVBU0csS0FUSCxDQVNTLFlBQU07QUFDWCxlQUFXLFFBQVg7QUFDQSxXQUFPLFFBQVAsQ0FBZ0IsTUFBaEIsQ0FBdUIsSUFBdkI7QUFDRCxHQVpIO0FBYUQ7O0FBRUQsb0NBQTBCLGtCQUExQjs7QUFFQTtBQUNBLG9CQUFLLEdBQUwsRUFBVSw4QkFBb0IsUUFBOUI7QUFDQSxvQkFBSyxXQUFMLEVBQWtCLG9DQUEwQixPQUE1QztBQUNBLG9CQUFLLG1CQUFMLEVBQTBCLGtDQUFvQixRQUE5QztBQUNBLG9CQUFLLHdCQUFMLEVBQStCLGtDQUF3QixZQUF2RDtBQUNBO0FBQ0E7QUFDQSxvQkFBSyxVQUFMLEVBQWlCLGtDQUF3QixZQUF6QztBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQSxRQUFRLEdBQVIsQ0FBWSxRQUFaIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogVGhpcyBpcyB0aGUgd2ViIGJyb3dzZXIgaW1wbGVtZW50YXRpb24gb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2RlYnVnJyk7XG5leHBvcnRzLmxvZyA9IGxvZztcbmV4cG9ydHMuZm9ybWF0QXJncyA9IGZvcm1hdEFyZ3M7XG5leHBvcnRzLnNhdmUgPSBzYXZlO1xuZXhwb3J0cy5sb2FkID0gbG9hZDtcbmV4cG9ydHMudXNlQ29sb3JzID0gdXNlQ29sb3JzO1xuZXhwb3J0cy5zdG9yYWdlID0gJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZVxuICAgICAgICAgICAgICAgJiYgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGNocm9tZS5zdG9yYWdlXG4gICAgICAgICAgICAgICAgICA/IGNocm9tZS5zdG9yYWdlLmxvY2FsXG4gICAgICAgICAgICAgICAgICA6IGxvY2Fsc3RvcmFnZSgpO1xuXG4vKipcbiAqIENvbG9ycy5cbiAqL1xuXG5leHBvcnRzLmNvbG9ycyA9IFtcbiAgJ2xpZ2h0c2VhZ3JlZW4nLFxuICAnZm9yZXN0Z3JlZW4nLFxuICAnZ29sZGVucm9kJyxcbiAgJ2RvZGdlcmJsdWUnLFxuICAnZGFya29yY2hpZCcsXG4gICdjcmltc29uJ1xuXTtcblxuLyoqXG4gKiBDdXJyZW50bHkgb25seSBXZWJLaXQtYmFzZWQgV2ViIEluc3BlY3RvcnMsIEZpcmVmb3ggPj0gdjMxLFxuICogYW5kIHRoZSBGaXJlYnVnIGV4dGVuc2lvbiAoYW55IEZpcmVmb3ggdmVyc2lvbikgYXJlIGtub3duXG4gKiB0byBzdXBwb3J0IFwiJWNcIiBDU1MgY3VzdG9taXphdGlvbnMuXG4gKlxuICogVE9ETzogYWRkIGEgYGxvY2FsU3RvcmFnZWAgdmFyaWFibGUgdG8gZXhwbGljaXRseSBlbmFibGUvZGlzYWJsZSBjb2xvcnNcbiAqL1xuXG5mdW5jdGlvbiB1c2VDb2xvcnMoKSB7XG4gIC8vIE5COiBJbiBhbiBFbGVjdHJvbiBwcmVsb2FkIHNjcmlwdCwgZG9jdW1lbnQgd2lsbCBiZSBkZWZpbmVkIGJ1dCBub3QgZnVsbHlcbiAgLy8gaW5pdGlhbGl6ZWQuIFNpbmNlIHdlIGtub3cgd2UncmUgaW4gQ2hyb21lLCB3ZSdsbCBqdXN0IGRldGVjdCB0aGlzIGNhc2VcbiAgLy8gZXhwbGljaXRseVxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LnByb2Nlc3MgJiYgd2luZG93LnByb2Nlc3MudHlwZSA9PT0gJ3JlbmRlcmVyJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgLy8gZG9jdW1lbnQgaXMgdW5kZWZpbmVkIGluIHJlYWN0LW5hdGl2ZTogaHR0cHM6Ly9naXRodWIuY29tL2ZhY2Vib29rL3JlYWN0LW5hdGl2ZS9wdWxsLzE2MzJcbiAgcmV0dXJuICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLldlYmtpdEFwcGVhcmFuY2UpIHx8XG4gICAgLy8gaXMgZmlyZWJ1Zz8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzk4MTIwLzM3Njc3M1xuICAgICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuY29uc29sZSAmJiAod2luZG93LmNvbnNvbGUuZmlyZWJ1ZyB8fCAod2luZG93LmNvbnNvbGUuZXhjZXB0aW9uICYmIHdpbmRvdy5jb25zb2xlLnRhYmxlKSkpIHx8XG4gICAgLy8gaXMgZmlyZWZveCA+PSB2MzE/XG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9Ub29scy9XZWJfQ29uc29sZSNTdHlsaW5nX21lc3NhZ2VzXG4gICAgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci51c2VyQWdlbnQgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLm1hdGNoKC9maXJlZm94XFwvKFxcZCspLykgJiYgcGFyc2VJbnQoUmVnRXhwLiQxLCAxMCkgPj0gMzEpIHx8XG4gICAgLy8gZG91YmxlIGNoZWNrIHdlYmtpdCBpbiB1c2VyQWdlbnQganVzdCBpbiBjYXNlIHdlIGFyZSBpbiBhIHdvcmtlclxuICAgICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IudXNlckFnZW50ICYmIG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5tYXRjaCgvYXBwbGV3ZWJraXRcXC8oXFxkKykvKSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuICdbVW5leHBlY3RlZEpTT05QYXJzZUVycm9yXTogJyArIGVyci5tZXNzYWdlO1xuICB9XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncyhhcmdzKSB7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybjtcblxuICB2YXIgYyA9ICdjb2xvcjogJyArIHRoaXMuY29sb3I7XG4gIGFyZ3Muc3BsaWNlKDEsIDAsIGMsICdjb2xvcjogaW5oZXJpdCcpXG5cbiAgLy8gdGhlIGZpbmFsIFwiJWNcIiBpcyBzb21ld2hhdCB0cmlja3ksIGJlY2F1c2UgdGhlcmUgY291bGQgYmUgb3RoZXJcbiAgLy8gYXJndW1lbnRzIHBhc3NlZCBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSAlYywgc28gd2UgbmVlZCB0b1xuICAvLyBmaWd1cmUgb3V0IHRoZSBjb3JyZWN0IGluZGV4IHRvIGluc2VydCB0aGUgQ1NTIGludG9cbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIGxhc3RDID0gMDtcbiAgYXJnc1swXS5yZXBsYWNlKC8lW2EtekEtWiVdL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgaWYgKCclJScgPT09IG1hdGNoKSByZXR1cm47XG4gICAgaW5kZXgrKztcbiAgICBpZiAoJyVjJyA9PT0gbWF0Y2gpIHtcbiAgICAgIC8vIHdlIG9ubHkgYXJlIGludGVyZXN0ZWQgaW4gdGhlICpsYXN0KiAlY1xuICAgICAgLy8gKHRoZSB1c2VyIG1heSBoYXZlIHByb3ZpZGVkIHRoZWlyIG93bilcbiAgICAgIGxhc3RDID0gaW5kZXg7XG4gICAgfVxuICB9KTtcblxuICBhcmdzLnNwbGljZShsYXN0QywgMCwgYyk7XG59XG5cbi8qKlxuICogSW52b2tlcyBgY29uc29sZS5sb2coKWAgd2hlbiBhdmFpbGFibGUuXG4gKiBOby1vcCB3aGVuIGBjb25zb2xlLmxvZ2AgaXMgbm90IGEgXCJmdW5jdGlvblwiLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gbG9nKCkge1xuICAvLyB0aGlzIGhhY2tlcnkgaXMgcmVxdWlyZWQgZm9yIElFOC85LCB3aGVyZVxuICAvLyB0aGUgYGNvbnNvbGUubG9nYCBmdW5jdGlvbiBkb2Vzbid0IGhhdmUgJ2FwcGx5J1xuICByZXR1cm4gJ29iamVjdCcgPT09IHR5cGVvZiBjb25zb2xlXG4gICAgJiYgY29uc29sZS5sb2dcbiAgICAmJiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbChjb25zb2xlLmxvZywgY29uc29sZSwgYXJndW1lbnRzKTtcbn1cblxuLyoqXG4gKiBTYXZlIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2F2ZShuYW1lc3BhY2VzKSB7XG4gIHRyeSB7XG4gICAgaWYgKG51bGwgPT0gbmFtZXNwYWNlcykge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLnJlbW92ZUl0ZW0oJ2RlYnVnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZyA9IG5hbWVzcGFjZXM7XG4gICAgfVxuICB9IGNhdGNoKGUpIHt9XG59XG5cbi8qKlxuICogTG9hZCBgbmFtZXNwYWNlc2AuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSByZXR1cm5zIHRoZSBwcmV2aW91c2x5IHBlcnNpc3RlZCBkZWJ1ZyBtb2Rlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9hZCgpIHtcbiAgdmFyIHI7XG4gIHRyeSB7XG4gICAgciA9IGV4cG9ydHMuc3RvcmFnZS5kZWJ1ZztcbiAgfSBjYXRjaChlKSB7fVxuXG4gIC8vIElmIGRlYnVnIGlzbid0IHNldCBpbiBMUywgYW5kIHdlJ3JlIGluIEVsZWN0cm9uLCB0cnkgdG8gbG9hZCAkREVCVUdcbiAgaWYgKCFyICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiAnZW52JyBpbiBwcm9jZXNzKSB7XG4gICAgciA9IHByb2Nlc3MuZW52LkRFQlVHO1xuICB9XG5cbiAgcmV0dXJuIHI7XG59XG5cbi8qKlxuICogRW5hYmxlIG5hbWVzcGFjZXMgbGlzdGVkIGluIGBsb2NhbFN0b3JhZ2UuZGVidWdgIGluaXRpYWxseS5cbiAqL1xuXG5leHBvcnRzLmVuYWJsZShsb2FkKCkpO1xuXG4vKipcbiAqIExvY2Fsc3RvcmFnZSBhdHRlbXB0cyB0byByZXR1cm4gdGhlIGxvY2Fsc3RvcmFnZS5cbiAqXG4gKiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHNhZmFyaSB0aHJvd3NcbiAqIHdoZW4gYSB1c2VyIGRpc2FibGVzIGNvb2tpZXMvbG9jYWxzdG9yYWdlXG4gKiBhbmQgeW91IGF0dGVtcHQgdG8gYWNjZXNzIGl0LlxuICpcbiAqIEByZXR1cm4ge0xvY2FsU3RvcmFnZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGxvY2Fsc3RvcmFnZSgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVEZWJ1Zy5kZWJ1ZyA9IGNyZWF0ZURlYnVnWydkZWZhdWx0J10gPSBjcmVhdGVEZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXIgb3IgdXBwZXItY2FzZSBsZXR0ZXIsIGkuZS4gXCJuXCIgYW5kIFwiTlwiLlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycyA9IHt9O1xuXG4vKipcbiAqIFByZXZpb3VzIGxvZyB0aW1lc3RhbXAuXG4gKi9cblxudmFyIHByZXZUaW1lO1xuXG4vKipcbiAqIFNlbGVjdCBhIGNvbG9yLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VsZWN0Q29sb3IobmFtZXNwYWNlKSB7XG4gIHZhciBoYXNoID0gMCwgaTtcblxuICBmb3IgKGkgaW4gbmFtZXNwYWNlKSB7XG4gICAgaGFzaCAgPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIG5hbWVzcGFjZS5jaGFyQ29kZUF0KGkpO1xuICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gIH1cblxuICByZXR1cm4gZXhwb3J0cy5jb2xvcnNbTWF0aC5hYnMoaGFzaCkgJSBleHBvcnRzLmNvbG9ycy5sZW5ndGhdO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRlYnVnZ2VyIHdpdGggdGhlIGdpdmVuIGBuYW1lc3BhY2VgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVEZWJ1ZyhuYW1lc3BhY2UpIHtcblxuICBmdW5jdGlvbiBkZWJ1ZygpIHtcbiAgICAvLyBkaXNhYmxlZD9cbiAgICBpZiAoIWRlYnVnLmVuYWJsZWQpIHJldHVybjtcblxuICAgIHZhciBzZWxmID0gZGVidWc7XG5cbiAgICAvLyBzZXQgYGRpZmZgIHRpbWVzdGFtcFxuICAgIHZhciBjdXJyID0gK25ldyBEYXRlKCk7XG4gICAgdmFyIG1zID0gY3VyciAtIChwcmV2VGltZSB8fCBjdXJyKTtcbiAgICBzZWxmLmRpZmYgPSBtcztcbiAgICBzZWxmLnByZXYgPSBwcmV2VGltZTtcbiAgICBzZWxmLmN1cnIgPSBjdXJyO1xuICAgIHByZXZUaW1lID0gY3VycjtcblxuICAgIC8vIHR1cm4gdGhlIGBhcmd1bWVudHNgIGludG8gYSBwcm9wZXIgQXJyYXlcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJU9cbiAgICAgIGFyZ3MudW5zaGlmdCgnJU8nKTtcbiAgICB9XG5cbiAgICAvLyBhcHBseSBhbnkgYGZvcm1hdHRlcnNgIHRyYW5zZm9ybWF0aW9uc1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgYXJnc1swXSA9IGFyZ3NbMF0ucmVwbGFjZSgvJShbYS16QS1aJV0pL2csIGZ1bmN0aW9uKG1hdGNoLCBmb3JtYXQpIHtcbiAgICAgIC8vIGlmIHdlIGVuY291bnRlciBhbiBlc2NhcGVkICUgdGhlbiBkb24ndCBpbmNyZWFzZSB0aGUgYXJyYXkgaW5kZXhcbiAgICAgIGlmIChtYXRjaCA9PT0gJyUlJykgcmV0dXJuIG1hdGNoO1xuICAgICAgaW5kZXgrKztcbiAgICAgIHZhciBmb3JtYXR0ZXIgPSBleHBvcnRzLmZvcm1hdHRlcnNbZm9ybWF0XTtcbiAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZm9ybWF0dGVyKSB7XG4gICAgICAgIHZhciB2YWwgPSBhcmdzW2luZGV4XTtcbiAgICAgICAgbWF0Y2ggPSBmb3JtYXR0ZXIuY2FsbChzZWxmLCB2YWwpO1xuXG4gICAgICAgIC8vIG5vdyB3ZSBuZWVkIHRvIHJlbW92ZSBgYXJnc1tpbmRleF1gIHNpbmNlIGl0J3MgaW5saW5lZCBpbiB0aGUgYGZvcm1hdGBcbiAgICAgICAgYXJncy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpbmRleC0tO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuXG4gICAgLy8gYXBwbHkgZW52LXNwZWNpZmljIGZvcm1hdHRpbmcgKGNvbG9ycywgZXRjLilcbiAgICBleHBvcnRzLmZvcm1hdEFyZ3MuY2FsbChzZWxmLCBhcmdzKTtcblxuICAgIHZhciBsb2dGbiA9IGRlYnVnLmxvZyB8fCBleHBvcnRzLmxvZyB8fCBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpO1xuICAgIGxvZ0ZuLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG5cbiAgZGVidWcubmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuICBkZWJ1Zy5lbmFibGVkID0gZXhwb3J0cy5lbmFibGVkKG5hbWVzcGFjZSk7XG4gIGRlYnVnLnVzZUNvbG9ycyA9IGV4cG9ydHMudXNlQ29sb3JzKCk7XG4gIGRlYnVnLmNvbG9yID0gc2VsZWN0Q29sb3IobmFtZXNwYWNlKTtcblxuICAvLyBlbnYtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb24gbG9naWMgZm9yIGRlYnVnIGluc3RhbmNlc1xuICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuaW5pdCkge1xuICAgIGV4cG9ydHMuaW5pdChkZWJ1Zyk7XG4gIH1cblxuICByZXR1cm4gZGVidWc7XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgZXhwb3J0cy5uYW1lcyA9IFtdO1xuICBleHBvcnRzLnNraXBzID0gW107XG5cbiAgdmFyIHNwbGl0ID0gKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJyA/IG5hbWVzcGFjZXMgOiAnJykuc3BsaXQoL1tcXHMsXSsvKTtcbiAgdmFyIGxlbiA9IHNwbGl0Lmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKCFzcGxpdFtpXSkgY29udGludWU7IC8vIGlnbm9yZSBlbXB0eSBzdHJpbmdzXG4gICAgbmFtZXNwYWNlcyA9IHNwbGl0W2ldLnJlcGxhY2UoL1xcKi9nLCAnLio/Jyk7XG4gICAgaWYgKG5hbWVzcGFjZXNbMF0gPT09ICctJykge1xuICAgICAgZXhwb3J0cy5za2lwcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcy5zdWJzdHIoMSkgKyAnJCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5uYW1lcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZXNwYWNlcyArICckJykpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIERpc2FibGUgZGVidWcgb3V0cHV0LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGlzYWJsZSgpIHtcbiAgZXhwb3J0cy5lbmFibGUoJycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gbW9kZSBuYW1lIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZW5hYmxlZChuYW1lKSB7XG4gIHZhciBpLCBsZW47XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMuc2tpcHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5za2lwc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGZvciAoaSA9IDAsIGxlbiA9IGV4cG9ydHMubmFtZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoZXhwb3J0cy5uYW1lc1tpXS50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENvZXJjZSBgdmFsYC5cbiAqXG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gY29lcmNlKHZhbCkge1xuICBpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHJldHVybiB2YWwuc3RhY2sgfHwgdmFsLm1lc3NhZ2U7XG4gIHJldHVybiB2YWw7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvKipcbiAqIEhlbHBlcnMuXG4gKi9cblxudmFyIHMgPSAxMDAwO1xudmFyIG0gPSBzICogNjA7XG52YXIgaCA9IG0gKiA2MDtcbnZhciBkID0gaCAqIDI0O1xudmFyIHkgPSBkICogMzY1LjI1O1xuXG4vKipcbiAqIFBhcnNlIG9yIGZvcm1hdCB0aGUgZ2l2ZW4gYHZhbGAuXG4gKlxuICogT3B0aW9uczpcbiAqXG4gKiAgLSBgbG9uZ2AgdmVyYm9zZSBmb3JtYXR0aW5nIFtmYWxzZV1cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHRocm93cyB7RXJyb3J9IHRocm93IGFuIGVycm9yIGlmIHZhbCBpcyBub3QgYSBub24tZW1wdHkgc3RyaW5nIG9yIGEgbnVtYmVyXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsO1xuICBpZiAodHlwZSA9PT0gJ3N0cmluZycgJiYgdmFsLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gcGFyc2UodmFsKTtcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWwpID09PSBmYWxzZSkge1xuICAgIHJldHVybiBvcHRpb25zLmxvbmcgPyBmbXRMb25nKHZhbCkgOiBmbXRTaG9ydCh2YWwpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAndmFsIGlzIG5vdCBhIG5vbi1lbXB0eSBzdHJpbmcgb3IgYSB2YWxpZCBudW1iZXIuIHZhbD0nICtcbiAgICAgIEpTT04uc3RyaW5naWZ5KHZhbClcbiAgKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG1hdGNoID0gL14oKD86XFxkKyk/XFwuP1xcZCspICoobWlsbGlzZWNvbmRzP3xtc2Vjcz98bXN8c2Vjb25kcz98c2Vjcz98c3xtaW51dGVzP3xtaW5zP3xtfGhvdXJzP3xocnM/fGh8ZGF5cz98ZHx5ZWFycz98eXJzP3x5KT8kL2kuZXhlYyhcbiAgICBzdHJcbiAgKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbiA9IHBhcnNlRmxvYXQobWF0Y2hbMV0pO1xuICB2YXIgdHlwZSA9IChtYXRjaFsyXSB8fCAnbXMnKS50b0xvd2VyQ2FzZSgpO1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICd5ZWFycyc6XG4gICAgY2FzZSAneWVhcic6XG4gICAgY2FzZSAneXJzJzpcbiAgICBjYXNlICd5cic6XG4gICAgY2FzZSAneSc6XG4gICAgICByZXR1cm4gbiAqIHk7XG4gICAgY2FzZSAnZGF5cyc6XG4gICAgY2FzZSAnZGF5JzpcbiAgICBjYXNlICdkJzpcbiAgICAgIHJldHVybiBuICogZDtcbiAgICBjYXNlICdob3Vycyc6XG4gICAgY2FzZSAnaG91cic6XG4gICAgY2FzZSAnaHJzJzpcbiAgICBjYXNlICdocic6XG4gICAgY2FzZSAnaCc6XG4gICAgICByZXR1cm4gbiAqIGg7XG4gICAgY2FzZSAnbWludXRlcyc6XG4gICAgY2FzZSAnbWludXRlJzpcbiAgICBjYXNlICdtaW5zJzpcbiAgICBjYXNlICdtaW4nOlxuICAgIGNhc2UgJ20nOlxuICAgICAgcmV0dXJuIG4gKiBtO1xuICAgIGNhc2UgJ3NlY29uZHMnOlxuICAgIGNhc2UgJ3NlY29uZCc6XG4gICAgY2FzZSAnc2Vjcyc6XG4gICAgY2FzZSAnc2VjJzpcbiAgICBjYXNlICdzJzpcbiAgICAgIHJldHVybiBuICogcztcbiAgICBjYXNlICdtaWxsaXNlY29uZHMnOlxuICAgIGNhc2UgJ21pbGxpc2Vjb25kJzpcbiAgICBjYXNlICdtc2Vjcyc6XG4gICAgY2FzZSAnbXNlYyc6XG4gICAgY2FzZSAnbXMnOlxuICAgICAgcmV0dXJuIG47XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBTaG9ydCBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBmbXRTaG9ydChtcykge1xuICBpZiAobXMgPj0gZCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIH1cbiAgaWYgKG1zID49IGgpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICB9XG4gIGlmIChtcyA+PSBtKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgfVxuICBpZiAobXMgPj0gcykge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIH1cbiAgcmV0dXJuIG1zICsgJ21zJztcbn1cblxuLyoqXG4gKiBMb25nIGZvcm1hdCBmb3IgYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGZtdExvbmcobXMpIHtcbiAgcmV0dXJuIHBsdXJhbChtcywgZCwgJ2RheScpIHx8XG4gICAgcGx1cmFsKG1zLCBoLCAnaG91cicpIHx8XG4gICAgcGx1cmFsKG1zLCBtLCAnbWludXRlJykgfHxcbiAgICBwbHVyYWwobXMsIHMsICdzZWNvbmQnKSB8fFxuICAgIG1zICsgJyBtcyc7XG59XG5cbi8qKlxuICogUGx1cmFsaXphdGlvbiBoZWxwZXIuXG4gKi9cblxuZnVuY3Rpb24gcGx1cmFsKG1zLCBuLCBuYW1lKSB7XG4gIGlmIChtcyA8IG4pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKG1zIDwgbiAqIDEuNSkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICB9XG4gIHJldHVybiBNYXRoLmNlaWwobXMgLyBuKSArICcgJyArIG5hbWUgKyAncyc7XG59XG4iLCIgIC8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICAgKi9cblxuICB2YXIgcGF0aHRvUmVnZXhwID0gcmVxdWlyZSgncGF0aC10by1yZWdleHAnKTtcblxuICAvKipcbiAgICogTW9kdWxlIGV4cG9ydHMuXG4gICAqL1xuXG4gIG1vZHVsZS5leHBvcnRzID0gcGFnZTtcblxuICAvKipcbiAgICogRGV0ZWN0IGNsaWNrIGV2ZW50XG4gICAqL1xuICB2YXIgY2xpY2tFdmVudCA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRvY3VtZW50KSAmJiBkb2N1bWVudC5vbnRvdWNoc3RhcnQgPyAndG91Y2hzdGFydCcgOiAnY2xpY2snO1xuXG4gIC8qKlxuICAgKiBUbyB3b3JrIHByb3Blcmx5IHdpdGggdGhlIFVSTFxuICAgKiBoaXN0b3J5LmxvY2F0aW9uIGdlbmVyYXRlZCBwb2x5ZmlsbCBpbiBodHRwczovL2dpdGh1Yi5jb20vZGV2b3RlL0hUTUw1LUhpc3RvcnktQVBJXG4gICAqL1xuXG4gIHZhciBsb2NhdGlvbiA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdpbmRvdykgJiYgKHdpbmRvdy5oaXN0b3J5LmxvY2F0aW9uIHx8IHdpbmRvdy5sb2NhdGlvbik7XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gaW5pdGlhbCBkaXNwYXRjaC5cbiAgICovXG5cbiAgdmFyIGRpc3BhdGNoID0gdHJ1ZTtcblxuXG4gIC8qKlxuICAgKiBEZWNvZGUgVVJMIGNvbXBvbmVudHMgKHF1ZXJ5IHN0cmluZywgcGF0aG5hbWUsIGhhc2gpLlxuICAgKiBBY2NvbW1vZGF0ZXMgYm90aCByZWd1bGFyIHBlcmNlbnQgZW5jb2RpbmcgYW5kIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBmb3JtYXQuXG4gICAqL1xuICB2YXIgZGVjb2RlVVJMQ29tcG9uZW50cyA9IHRydWU7XG5cbiAgLyoqXG4gICAqIEJhc2UgcGF0aC5cbiAgICovXG5cbiAgdmFyIGJhc2UgPSAnJztcblxuICAvKipcbiAgICogUnVubmluZyBmbGFnLlxuICAgKi9cblxuICB2YXIgcnVubmluZztcblxuICAvKipcbiAgICogSGFzaEJhbmcgb3B0aW9uXG4gICAqL1xuXG4gIHZhciBoYXNoYmFuZyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBQcmV2aW91cyBjb250ZXh0LCBmb3IgY2FwdHVyaW5nXG4gICAqIHBhZ2UgZXhpdCBldmVudHMuXG4gICAqL1xuXG4gIHZhciBwcmV2Q29udGV4dDtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYHBhdGhgIHdpdGggY2FsbGJhY2sgYGZuKClgLFxuICAgKiBvciByb3V0ZSBgcGF0aGAsIG9yIHJlZGlyZWN0aW9uLFxuICAgKiBvciBgcGFnZS5zdGFydCgpYC5cbiAgICpcbiAgICogICBwYWdlKGZuKTtcbiAgICogICBwYWdlKCcqJywgZm4pO1xuICAgKiAgIHBhZ2UoJy91c2VyLzppZCcsIGxvYWQsIHVzZXIpO1xuICAgKiAgIHBhZ2UoJy91c2VyLycgKyB1c2VyLmlkLCB7IHNvbWU6ICd0aGluZycgfSk7XG4gICAqICAgcGFnZSgnL3VzZXIvJyArIHVzZXIuaWQpO1xuICAgKiAgIHBhZ2UoJy9mcm9tJywgJy90bycpXG4gICAqICAgcGFnZSgpO1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3whRnVuY3Rpb258IU9iamVjdH0gcGF0aFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZm5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gcGFnZShwYXRoLCBmbikge1xuICAgIC8vIDxjYWxsYmFjaz5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHBhdGgpIHtcbiAgICAgIHJldHVybiBwYWdlKCcqJywgcGF0aCk7XG4gICAgfVxuXG4gICAgLy8gcm91dGUgPHBhdGg+IHRvIDxjYWxsYmFjayAuLi4+XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmbikge1xuICAgICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKC8qKiBAdHlwZSB7c3RyaW5nfSAqLyAocGF0aCkpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcGFnZS5jYWxsYmFja3MucHVzaChyb3V0ZS5taWRkbGV3YXJlKGFyZ3VtZW50c1tpXSkpO1xuICAgICAgfVxuICAgICAgLy8gc2hvdyA8cGF0aD4gd2l0aCBbc3RhdGVdXG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHBhdGgpIHtcbiAgICAgIHBhZ2VbJ3N0cmluZycgPT09IHR5cGVvZiBmbiA/ICdyZWRpcmVjdCcgOiAnc2hvdyddKHBhdGgsIGZuKTtcbiAgICAgIC8vIHN0YXJ0IFtvcHRpb25zXVxuICAgIH0gZWxzZSB7XG4gICAgICBwYWdlLnN0YXJ0KHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbnMuXG4gICAqL1xuXG4gIHBhZ2UuY2FsbGJhY2tzID0gW107XG4gIHBhZ2UuZXhpdHMgPSBbXTtcblxuICAvKipcbiAgICogQ3VycmVudCBwYXRoIGJlaW5nIHByb2Nlc3NlZFxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgcGFnZS5jdXJyZW50ID0gJyc7XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBwYWdlcyBuYXZpZ2F0ZWQgdG8uXG4gICAqIEB0eXBlIHtudW1iZXJ9XG4gICAqXG4gICAqICAgICBwYWdlLmxlbiA9PSAwO1xuICAgKiAgICAgcGFnZSgnL2xvZ2luJyk7XG4gICAqICAgICBwYWdlLmxlbiA9PSAxO1xuICAgKi9cblxuICBwYWdlLmxlbiA9IDA7XG5cbiAgLyoqXG4gICAqIEdldCBvciBzZXQgYmFzZXBhdGggdG8gYHBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLmJhc2UgPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgaWYgKDAgPT09IGFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBiYXNlO1xuICAgIGJhc2UgPSBwYXRoO1xuICB9O1xuXG4gIC8qKlxuICAgKiBCaW5kIHdpdGggdGhlIGdpdmVuIGBvcHRpb25zYC5cbiAgICpcbiAgICogT3B0aW9uczpcbiAgICpcbiAgICogICAgLSBgY2xpY2tgIGJpbmQgdG8gY2xpY2sgZXZlbnRzIFt0cnVlXVxuICAgKiAgICAtIGBwb3BzdGF0ZWAgYmluZCB0byBwb3BzdGF0ZSBbdHJ1ZV1cbiAgICogICAgLSBgZGlzcGF0Y2hgIHBlcmZvcm0gaW5pdGlhbCBkaXNwYXRjaCBbdHJ1ZV1cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFnZS5zdGFydCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBpZiAocnVubmluZykgcmV0dXJuO1xuICAgIHJ1bm5pbmcgPSB0cnVlO1xuICAgIGlmIChmYWxzZSA9PT0gb3B0aW9ucy5kaXNwYXRjaCkgZGlzcGF0Y2ggPSBmYWxzZTtcbiAgICBpZiAoZmFsc2UgPT09IG9wdGlvbnMuZGVjb2RlVVJMQ29tcG9uZW50cykgZGVjb2RlVVJMQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5wb3BzdGF0ZSkgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5jbGljaykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihjbGlja0V2ZW50LCBvbmNsaWNrLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmICh0cnVlID09PSBvcHRpb25zLmhhc2hiYW5nKSBoYXNoYmFuZyA9IHRydWU7XG4gICAgaWYgKCFkaXNwYXRjaCkgcmV0dXJuO1xuICAgIHZhciB1cmwgPSAoaGFzaGJhbmcgJiYgfmxvY2F0aW9uLmhhc2guaW5kZXhPZignIyEnKSkgPyBsb2NhdGlvbi5oYXNoLnN1YnN0cigyKSArIGxvY2F0aW9uLnNlYXJjaCA6IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoICsgbG9jYXRpb24uaGFzaDtcbiAgICBwYWdlLnJlcGxhY2UodXJsLCBudWxsLCB0cnVlLCBkaXNwYXRjaCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuYmluZCBjbGljayBhbmQgcG9wc3RhdGUgZXZlbnQgaGFuZGxlcnMuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghcnVubmluZykgcmV0dXJuO1xuICAgIHBhZ2UuY3VycmVudCA9ICcnO1xuICAgIHBhZ2UubGVuID0gMDtcbiAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihjbGlja0V2ZW50LCBvbmNsaWNrLCBmYWxzZSk7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTaG93IGBwYXRoYCB3aXRoIG9wdGlvbmFsIGBzdGF0ZWAgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGRpc3BhdGNoXG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IHB1c2hcbiAgICogQHJldHVybiB7IUNvbnRleHR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2Uuc2hvdyA9IGZ1bmN0aW9uKHBhdGgsIHN0YXRlLCBkaXNwYXRjaCwgcHVzaCkge1xuICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwYXRoLCBzdGF0ZSk7XG4gICAgcGFnZS5jdXJyZW50ID0gY3R4LnBhdGg7XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgpO1xuICAgIGlmIChmYWxzZSAhPT0gY3R4LmhhbmRsZWQgJiYgZmFsc2UgIT09IHB1c2gpIGN0eC5wdXNoU3RhdGUoKTtcbiAgICByZXR1cm4gY3R4O1xuICB9O1xuXG4gIC8qKlxuICAgKiBHb2VzIGJhY2sgaW4gdGhlIGhpc3RvcnlcbiAgICogQmFjayBzaG91bGQgYWx3YXlzIGxldCB0aGUgY3VycmVudCByb3V0ZSBwdXNoIHN0YXRlIGFuZCB0aGVuIGdvIGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gZmFsbGJhY2sgcGF0aCB0byBnbyBiYWNrIGlmIG5vIG1vcmUgaGlzdG9yeSBleGlzdHMsIGlmIHVuZGVmaW5lZCBkZWZhdWx0cyB0byBwYWdlLmJhc2VcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLmJhY2sgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSkge1xuICAgIGlmIChwYWdlLmxlbiA+IDApIHtcbiAgICAgIC8vIHRoaXMgbWF5IG5lZWQgbW9yZSB0ZXN0aW5nIHRvIHNlZSBpZiBhbGwgYnJvd3NlcnNcbiAgICAgIC8vIHdhaXQgZm9yIHRoZSBuZXh0IHRpY2sgdG8gZ28gYmFjayBpbiBoaXN0b3J5XG4gICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIHBhZ2UubGVuLS07XG4gICAgfSBlbHNlIGlmIChwYXRoKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnNob3cocGF0aCwgc3RhdGUpO1xuICAgICAgfSk7XG4gICAgfWVsc2V7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnNob3coYmFzZSwgc3RhdGUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHJvdXRlIHRvIHJlZGlyZWN0IGZyb20gb25lIHBhdGggdG8gb3RoZXJcbiAgICogb3IganVzdCByZWRpcmVjdCB0byBhbm90aGVyIHJvdXRlXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmcm9tIC0gaWYgcGFyYW0gJ3RvJyBpcyB1bmRlZmluZWQgcmVkaXJlY3RzIHRvICdmcm9tJ1xuICAgKiBAcGFyYW0ge3N0cmluZz19IHRvXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuICBwYWdlLnJlZGlyZWN0ID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgICAvLyBEZWZpbmUgcm91dGUgZnJvbSBhIHBhdGggdG8gYW5vdGhlclxuICAgIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGZyb20gJiYgJ3N0cmluZycgPT09IHR5cGVvZiB0bykge1xuICAgICAgcGFnZShmcm9tLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcGFnZS5yZXBsYWNlKC8qKiBAdHlwZSB7IXN0cmluZ30gKi8gKHRvKSk7XG4gICAgICAgIH0sIDApO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3IgdGhlIHB1c2ggc3RhdGUgYW5kIHJlcGxhY2UgaXQgd2l0aCBhbm90aGVyXG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgZnJvbSAmJiAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRvKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBwYWdlLnJlcGxhY2UoZnJvbSk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYHBhdGhgIHdpdGggb3B0aW9uYWwgYHN0YXRlYCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gc3RhdGVcbiAgICogQHBhcmFtIHtib29sZWFuPX0gaW5pdFxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBkaXNwYXRjaFxuICAgKiBAcmV0dXJuIHshQ29udGV4dH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cblxuICBwYWdlLnJlcGxhY2UgPSBmdW5jdGlvbihwYXRoLCBzdGF0ZSwgaW5pdCwgZGlzcGF0Y2gpIHtcbiAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocGF0aCwgc3RhdGUpO1xuICAgIHBhZ2UuY3VycmVudCA9IGN0eC5wYXRoO1xuICAgIGN0eC5pbml0ID0gaW5pdDtcbiAgICBjdHguc2F2ZSgpOyAvLyBzYXZlIGJlZm9yZSBkaXNwYXRjaGluZywgd2hpY2ggbWF5IHJlZGlyZWN0XG4gICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaCkgcGFnZS5kaXNwYXRjaChjdHgpO1xuICAgIHJldHVybiBjdHg7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoIHRoZSBnaXZlbiBgY3R4YC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBwYWdlLmRpc3BhdGNoID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgdmFyIHByZXYgPSBwcmV2Q29udGV4dCxcbiAgICAgIGkgPSAwLFxuICAgICAgaiA9IDA7XG5cbiAgICBwcmV2Q29udGV4dCA9IGN0eDtcblxuICAgIGZ1bmN0aW9uIG5leHRFeGl0KCkge1xuICAgICAgdmFyIGZuID0gcGFnZS5leGl0c1tqKytdO1xuICAgICAgaWYgKCFmbikgcmV0dXJuIG5leHRFbnRlcigpO1xuICAgICAgZm4ocHJldiwgbmV4dEV4aXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHRFbnRlcigpIHtcbiAgICAgIHZhciBmbiA9IHBhZ2UuY2FsbGJhY2tzW2krK107XG5cbiAgICAgIGlmIChjdHgucGF0aCAhPT0gcGFnZS5jdXJyZW50KSB7XG4gICAgICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghZm4pIHJldHVybiB1bmhhbmRsZWQoY3R4KTtcbiAgICAgIGZuKGN0eCwgbmV4dEVudGVyKTtcbiAgICB9XG5cbiAgICBpZiAocHJldikge1xuICAgICAgbmV4dEV4aXQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dEVudGVyKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbmhhbmRsZWQgYGN0eGAuIFdoZW4gaXQncyBub3QgdGhlIGluaXRpYWxcbiAgICogcG9wc3RhdGUgdGhlbiByZWRpcmVjdC4gSWYgeW91IHdpc2ggdG8gaGFuZGxlXG4gICAqIDQwNHMgb24geW91ciBvd24gdXNlIGBwYWdlKCcqJywgY2FsbGJhY2spYC5cbiAgICpcbiAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiB1bmhhbmRsZWQoY3R4KSB7XG4gICAgaWYgKGN0eC5oYW5kbGVkKSByZXR1cm47XG4gICAgdmFyIGN1cnJlbnQ7XG5cbiAgICBpZiAoaGFzaGJhbmcpIHtcbiAgICAgIGN1cnJlbnQgPSBiYXNlICsgbG9jYXRpb24uaGFzaC5yZXBsYWNlKCcjIScsICcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCA9IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50ID09PSBjdHguY2Fub25pY2FsUGF0aCkgcmV0dXJuO1xuICAgIHBhZ2Uuc3RvcCgpO1xuICAgIGN0eC5oYW5kbGVkID0gZmFsc2U7XG4gICAgbG9jYXRpb24uaHJlZiA9IGN0eC5jYW5vbmljYWxQYXRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGFuIGV4aXQgcm91dGUgb24gYHBhdGhgIHdpdGhcbiAgICogY2FsbGJhY2sgYGZuKClgLCB3aGljaCB3aWxsIGJlIGNhbGxlZFxuICAgKiBvbiB0aGUgcHJldmlvdXMgY29udGV4dCB3aGVuIGEgbmV3XG4gICAqIHBhZ2UgaXMgdmlzaXRlZC5cbiAgICovXG4gIHBhZ2UuZXhpdCA9IGZ1bmN0aW9uKHBhdGgsIGZuKSB7XG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGFnZS5leGl0KCcqJywgcGF0aCk7XG4gICAgfVxuXG4gICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHBhdGgpO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICBwYWdlLmV4aXRzLnB1c2gocm91dGUubWlkZGxld2FyZShhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBVUkwgZW5jb2RpbmcgZnJvbSB0aGUgZ2l2ZW4gYHN0cmAuXG4gICAqIEFjY29tbW9kYXRlcyB3aGl0ZXNwYWNlIGluIGJvdGggeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gICAqIGFuZCByZWd1bGFyIHBlcmNlbnQtZW5jb2RlZCBmb3JtLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsIC0gVVJMIGNvbXBvbmVudCB0byBkZWNvZGVcbiAgICovXG4gIGZ1bmN0aW9uIGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQodmFsKSB7XG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnKSB7IHJldHVybiB2YWw7IH1cbiAgICByZXR1cm4gZGVjb2RlVVJMQ29tcG9uZW50cyA/IGRlY29kZVVSSUNvbXBvbmVudCh2YWwucmVwbGFjZSgvXFwrL2csICcgJykpIDogdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgXCJyZXF1ZXN0XCIgYENvbnRleHRgXG4gICAqIHdpdGggdGhlIGdpdmVuIGBwYXRoYCBhbmQgb3B0aW9uYWwgaW5pdGlhbCBgc3RhdGVgLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBDb250ZXh0KHBhdGgsIHN0YXRlKSB7XG4gICAgaWYgKCcvJyA9PT0gcGF0aFswXSAmJiAwICE9PSBwYXRoLmluZGV4T2YoYmFzZSkpIHBhdGggPSBiYXNlICsgKGhhc2hiYW5nID8gJyMhJyA6ICcnKSArIHBhdGg7XG4gICAgdmFyIGkgPSBwYXRoLmluZGV4T2YoJz8nKTtcblxuICAgIHRoaXMuY2Fub25pY2FsUGF0aCA9IHBhdGg7XG4gICAgdGhpcy5wYXRoID0gcGF0aC5yZXBsYWNlKGJhc2UsICcnKSB8fCAnLyc7XG4gICAgaWYgKGhhc2hiYW5nKSB0aGlzLnBhdGggPSB0aGlzLnBhdGgucmVwbGFjZSgnIyEnLCAnJykgfHwgJy8nO1xuXG4gICAgdGhpcy50aXRsZSA9IGRvY3VtZW50LnRpdGxlO1xuICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICB0aGlzLnN0YXRlLnBhdGggPSBwYXRoO1xuICAgIHRoaXMucXVlcnlzdHJpbmcgPSB+aSA/IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQocGF0aC5zbGljZShpICsgMSkpIDogJyc7XG4gICAgdGhpcy5wYXRobmFtZSA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQofmkgPyBwYXRoLnNsaWNlKDAsIGkpIDogcGF0aCk7XG4gICAgdGhpcy5wYXJhbXMgPSB7fTtcblxuICAgIC8vIGZyYWdtZW50XG4gICAgdGhpcy5oYXNoID0gJyc7XG4gICAgaWYgKCFoYXNoYmFuZykge1xuICAgICAgaWYgKCF+dGhpcy5wYXRoLmluZGV4T2YoJyMnKSkgcmV0dXJuO1xuICAgICAgdmFyIHBhcnRzID0gdGhpcy5wYXRoLnNwbGl0KCcjJyk7XG4gICAgICB0aGlzLnBhdGggPSBwYXJ0c1swXTtcbiAgICAgIHRoaXMuaGFzaCA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQocGFydHNbMV0pIHx8ICcnO1xuICAgICAgdGhpcy5xdWVyeXN0cmluZyA9IHRoaXMucXVlcnlzdHJpbmcuc3BsaXQoJyMnKVswXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXhwb3NlIGBDb250ZXh0YC5cbiAgICovXG5cbiAgcGFnZS5Db250ZXh0ID0gQ29udGV4dDtcblxuICAvKipcbiAgICogUHVzaCBzdGF0ZS5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2hTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhZ2UubGVuKys7XG4gICAgaGlzdG9yeS5wdXNoU3RhdGUodGhpcy5zdGF0ZSwgdGhpcy50aXRsZSwgaGFzaGJhbmcgJiYgdGhpcy5wYXRoICE9PSAnLycgPyAnIyEnICsgdGhpcy5wYXRoIDogdGhpcy5jYW5vbmljYWxQYXRoKTtcbiAgfTtcblxuICAvKipcbiAgICogU2F2ZSB0aGUgY29udGV4dCBzdGF0ZS5cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgQ29udGV4dC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHRoaXMuc3RhdGUsIHRoaXMudGl0bGUsIGhhc2hiYW5nICYmIHRoaXMucGF0aCAhPT0gJy8nID8gJyMhJyArIHRoaXMucGF0aCA6IHRoaXMuY2Fub25pY2FsUGF0aCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYFJvdXRlYCB3aXRoIHRoZSBnaXZlbiBIVFRQIGBwYXRoYCxcbiAgICogYW5kIGFuIGFycmF5IG9mIGBjYWxsYmFja3NgIGFuZCBgb3B0aW9uc2AuXG4gICAqXG4gICAqIE9wdGlvbnM6XG4gICAqXG4gICAqICAgLSBgc2Vuc2l0aXZlYCAgICBlbmFibGUgY2FzZS1zZW5zaXRpdmUgcm91dGVzXG4gICAqICAgLSBgc3RyaWN0YCAgICAgICBlbmFibGUgc3RyaWN0IG1hdGNoaW5nIGZvciB0cmFpbGluZyBzbGFzaGVzXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnNcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIFJvdXRlKHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLnBhdGggPSAocGF0aCA9PT0gJyonKSA/ICcoLiopJyA6IHBhdGg7XG4gICAgdGhpcy5tZXRob2QgPSAnR0VUJztcbiAgICB0aGlzLnJlZ2V4cCA9IHBhdGh0b1JlZ2V4cCh0aGlzLnBhdGgsXG4gICAgICB0aGlzLmtleXMgPSBbXSxcbiAgICAgIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBgUm91dGVgLlxuICAgKi9cblxuICBwYWdlLlJvdXRlID0gUm91dGU7XG5cbiAgLyoqXG4gICAqIFJldHVybiByb3V0ZSBtaWRkbGV3YXJlIHdpdGhcbiAgICogdGhlIGdpdmVuIGNhbGxiYWNrIGBmbigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFJvdXRlLnByb3RvdHlwZS5taWRkbGV3YXJlID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCwgbmV4dCkge1xuICAgICAgaWYgKHNlbGYubWF0Y2goY3R4LnBhdGgsIGN0eC5wYXJhbXMpKSByZXR1cm4gZm4oY3R4LCBuZXh0KTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGlzIHJvdXRlIG1hdGNoZXMgYHBhdGhgLCBpZiBzb1xuICAgKiBwb3B1bGF0ZSBgcGFyYW1zYC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtc1xuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgUm91dGUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0aCwgcGFyYW1zKSB7XG4gICAgdmFyIGtleXMgPSB0aGlzLmtleXMsXG4gICAgICBxc0luZGV4ID0gcGF0aC5pbmRleE9mKCc/JyksXG4gICAgICBwYXRobmFtZSA9IH5xc0luZGV4ID8gcGF0aC5zbGljZSgwLCBxc0luZGV4KSA6IHBhdGgsXG4gICAgICBtID0gdGhpcy5yZWdleHAuZXhlYyhkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpKTtcblxuICAgIGlmICghbSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbiA9IG0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2kgLSAxXTtcbiAgICAgIHZhciB2YWwgPSBkZWNvZGVVUkxFbmNvZGVkVVJJQ29tcG9uZW50KG1baV0pO1xuICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkIHx8ICEoaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbXMsIGtleS5uYW1lKSkpIHtcbiAgICAgICAgcGFyYW1zW2tleS5uYW1lXSA9IHZhbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8qKlxuICAgKiBIYW5kbGUgXCJwb3B1bGF0ZVwiIGV2ZW50cy5cbiAgICovXG5cbiAgdmFyIG9ucG9wc3RhdGUgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcbiAgICBpZiAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB3aW5kb3cpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIG9ucG9wc3RhdGUoZSkge1xuICAgICAgaWYgKCFsb2FkZWQpIHJldHVybjtcbiAgICAgIGlmIChlLnN0YXRlKSB7XG4gICAgICAgIHZhciBwYXRoID0gZS5zdGF0ZS5wYXRoO1xuICAgICAgICBwYWdlLnJlcGxhY2UocGF0aCwgZS5zdGF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYWdlLnNob3cobG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5oYXNoLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZmFsc2UpO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG4gIC8qKlxuICAgKiBIYW5kbGUgXCJjbGlja1wiIGV2ZW50cy5cbiAgICovXG5cbiAgZnVuY3Rpb24gb25jbGljayhlKSB7XG5cbiAgICBpZiAoMSAhPT0gd2hpY2goZSkpIHJldHVybjtcblxuICAgIGlmIChlLm1ldGFLZXkgfHwgZS5jdHJsS2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcbiAgICBpZiAoZS5kZWZhdWx0UHJldmVudGVkKSByZXR1cm47XG5cblxuXG4gICAgLy8gZW5zdXJlIGxpbmtcbiAgICAvLyB1c2Ugc2hhZG93IGRvbSB3aGVuIGF2YWlsYWJsZVxuICAgIHZhciBlbCA9IGUucGF0aCA/IGUucGF0aFswXSA6IGUudGFyZ2V0O1xuICAgIHdoaWxlIChlbCAmJiAnQScgIT09IGVsLm5vZGVOYW1lKSBlbCA9IGVsLnBhcmVudE5vZGU7XG4gICAgaWYgKCFlbCB8fCAnQScgIT09IGVsLm5vZGVOYW1lKSByZXR1cm47XG5cblxuXG4gICAgLy8gSWdub3JlIGlmIHRhZyBoYXNcbiAgICAvLyAxLiBcImRvd25sb2FkXCIgYXR0cmlidXRlXG4gICAgLy8gMi4gcmVsPVwiZXh0ZXJuYWxcIiBhdHRyaWJ1dGVcbiAgICBpZiAoZWwuaGFzQXR0cmlidXRlKCdkb3dubG9hZCcpIHx8IGVsLmdldEF0dHJpYnV0ZSgncmVsJykgPT09ICdleHRlcm5hbCcpIHJldHVybjtcblxuICAgIC8vIGVuc3VyZSBub24taGFzaCBmb3IgdGhlIHNhbWUgcGF0aFxuICAgIHZhciBsaW5rID0gZWwuZ2V0QXR0cmlidXRlKCdocmVmJyk7XG4gICAgaWYgKCFoYXNoYmFuZyAmJiBlbC5wYXRobmFtZSA9PT0gbG9jYXRpb24ucGF0aG5hbWUgJiYgKGVsLmhhc2ggfHwgJyMnID09PSBsaW5rKSkgcmV0dXJuO1xuXG5cblxuICAgIC8vIENoZWNrIGZvciBtYWlsdG86IGluIHRoZSBocmVmXG4gICAgaWYgKGxpbmsgJiYgbGluay5pbmRleE9mKCdtYWlsdG86JykgPiAtMSkgcmV0dXJuO1xuXG4gICAgLy8gY2hlY2sgdGFyZ2V0XG4gICAgaWYgKGVsLnRhcmdldCkgcmV0dXJuO1xuXG4gICAgLy8geC1vcmlnaW5cbiAgICBpZiAoIXNhbWVPcmlnaW4oZWwuaHJlZikpIHJldHVybjtcblxuXG5cbiAgICAvLyByZWJ1aWxkIHBhdGhcbiAgICB2YXIgcGF0aCA9IGVsLnBhdGhuYW1lICsgZWwuc2VhcmNoICsgKGVsLmhhc2ggfHwgJycpO1xuXG4gICAgLy8gc3RyaXAgbGVhZGluZyBcIi9bZHJpdmUgbGV0dGVyXTpcIiBvbiBOVy5qcyBvbiBXaW5kb3dzXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiBwYXRoLm1hdGNoKC9eXFwvW2EtekEtWl06XFwvLykpIHtcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL15cXC9bYS16QS1aXTpcXC8vLCAnLycpO1xuICAgIH1cblxuICAgIC8vIHNhbWUgcGFnZVxuICAgIHZhciBvcmlnID0gcGF0aDtcblxuICAgIGlmIChwYXRoLmluZGV4T2YoYmFzZSkgPT09IDApIHtcbiAgICAgIHBhdGggPSBwYXRoLnN1YnN0cihiYXNlLmxlbmd0aCk7XG4gICAgfVxuXG4gICAgaWYgKGhhc2hiYW5nKSBwYXRoID0gcGF0aC5yZXBsYWNlKCcjIScsICcnKTtcblxuICAgIGlmIChiYXNlICYmIG9yaWcgPT09IHBhdGgpIHJldHVybjtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBwYWdlLnNob3cob3JpZyk7XG4gIH1cblxuICAvKipcbiAgICogRXZlbnQgYnV0dG9uLlxuICAgKi9cblxuICBmdW5jdGlvbiB3aGljaChlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHJldHVybiBudWxsID09PSBlLndoaWNoID8gZS5idXR0b24gOiBlLndoaWNoO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGBocmVmYCBpcyB0aGUgc2FtZSBvcmlnaW4uXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHNhbWVPcmlnaW4oaHJlZikge1xuICAgIHZhciBvcmlnaW4gPSBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0bmFtZTtcbiAgICBpZiAobG9jYXRpb24ucG9ydCkgb3JpZ2luICs9ICc6JyArIGxvY2F0aW9uLnBvcnQ7XG4gICAgcmV0dXJuIChocmVmICYmICgwID09PSBocmVmLmluZGV4T2Yob3JpZ2luKSkpO1xuICB9XG5cbiAgcGFnZS5zYW1lT3JpZ2luID0gc2FtZU9yaWdpbjtcbiIsInZhciBpc2FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbi8qKlxuICogRXhwb3NlIGBwYXRoVG9SZWdleHBgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGhUb1JlZ2V4cFxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZVxubW9kdWxlLmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGVcbm1vZHVsZS5leHBvcnRzLnRva2Vuc1RvRnVuY3Rpb24gPSB0b2tlbnNUb0Z1bmN0aW9uXG5tb2R1bGUuZXhwb3J0cy50b2tlbnNUb1JlZ0V4cCA9IHRva2Vuc1RvUmVnRXhwXG5cbi8qKlxuICogVGhlIG1haW4gcGF0aCBtYXRjaGluZyByZWdleHAgdXRpbGl0eS5cbiAqXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG52YXIgUEFUSF9SRUdFWFAgPSBuZXcgUmVnRXhwKFtcbiAgLy8gTWF0Y2ggZXNjYXBlZCBjaGFyYWN0ZXJzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGFwcGVhciBpbiBmdXR1cmUgbWF0Y2hlcy5cbiAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyB0aGF0IHdvbid0IHRyYW5zZm9ybS5cbiAgJyhcXFxcXFxcXC4pJyxcbiAgLy8gTWF0Y2ggRXhwcmVzcy1zdHlsZSBwYXJhbWV0ZXJzIGFuZCB1bi1uYW1lZCBwYXJhbWV0ZXJzIHdpdGggYSBwcmVmaXhcbiAgLy8gYW5kIG9wdGlvbmFsIHN1ZmZpeGVzLiBNYXRjaGVzIGFwcGVhciBhczpcbiAgLy9cbiAgLy8gXCIvOnRlc3QoXFxcXGQrKT9cIiA9PiBbXCIvXCIsIFwidGVzdFwiLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCBcIj9cIiwgdW5kZWZpbmVkXVxuICAvLyBcIi9yb3V0ZShcXFxcZCspXCIgID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWRdXG4gIC8vIFwiLypcIiAgICAgICAgICAgID0+IFtcIi9cIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIipcIl1cbiAgJyhbXFxcXC8uXSk/KD86KD86XFxcXDooXFxcXHcrKSg/OlxcXFwoKCg/OlxcXFxcXFxcLnxbXigpXSkrKVxcXFwpKT98XFxcXCgoKD86XFxcXFxcXFwufFteKCldKSspXFxcXCkpKFsrKj9dKT98KFxcXFwqKSknXG5dLmpvaW4oJ3wnKSwgJ2cnKVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIGZvciB0aGUgcmF3IHRva2Vucy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgdmFyIHRva2VucyA9IFtdXG4gIHZhciBrZXkgPSAwXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIHBhdGggPSAnJ1xuICB2YXIgcmVzXG5cbiAgd2hpbGUgKChyZXMgPSBQQVRIX1JFR0VYUC5leGVjKHN0cikpICE9IG51bGwpIHtcbiAgICB2YXIgbSA9IHJlc1swXVxuICAgIHZhciBlc2NhcGVkID0gcmVzWzFdXG4gICAgdmFyIG9mZnNldCA9IHJlcy5pbmRleFxuICAgIHBhdGggKz0gc3RyLnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgaW5kZXggPSBvZmZzZXQgKyBtLmxlbmd0aFxuXG4gICAgLy8gSWdub3JlIGFscmVhZHkgZXNjYXBlZCBzZXF1ZW5jZXMuXG4gICAgaWYgKGVzY2FwZWQpIHtcbiAgICAgIHBhdGggKz0gZXNjYXBlZFsxXVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBQdXNoIHRoZSBjdXJyZW50IHBhdGggb250byB0aGUgdG9rZW5zLlxuICAgIGlmIChwYXRoKSB7XG4gICAgICB0b2tlbnMucHVzaChwYXRoKVxuICAgICAgcGF0aCA9ICcnXG4gICAgfVxuXG4gICAgdmFyIHByZWZpeCA9IHJlc1syXVxuICAgIHZhciBuYW1lID0gcmVzWzNdXG4gICAgdmFyIGNhcHR1cmUgPSByZXNbNF1cbiAgICB2YXIgZ3JvdXAgPSByZXNbNV1cbiAgICB2YXIgc3VmZml4ID0gcmVzWzZdXG4gICAgdmFyIGFzdGVyaXNrID0gcmVzWzddXG5cbiAgICB2YXIgcmVwZWF0ID0gc3VmZml4ID09PSAnKycgfHwgc3VmZml4ID09PSAnKidcbiAgICB2YXIgb3B0aW9uYWwgPSBzdWZmaXggPT09ICc/JyB8fCBzdWZmaXggPT09ICcqJ1xuICAgIHZhciBkZWxpbWl0ZXIgPSBwcmVmaXggfHwgJy8nXG4gICAgdmFyIHBhdHRlcm4gPSBjYXB0dXJlIHx8IGdyb3VwIHx8IChhc3RlcmlzayA/ICcuKicgOiAnW14nICsgZGVsaW1pdGVyICsgJ10rPycpXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBuYW1lOiBuYW1lIHx8IGtleSsrLFxuICAgICAgcHJlZml4OiBwcmVmaXggfHwgJycsXG4gICAgICBkZWxpbWl0ZXI6IGRlbGltaXRlcixcbiAgICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcbiAgICAgIHJlcGVhdDogcmVwZWF0LFxuICAgICAgcGF0dGVybjogZXNjYXBlR3JvdXAocGF0dGVybilcbiAgICB9KVxuICB9XG5cbiAgLy8gTWF0Y2ggYW55IGNoYXJhY3RlcnMgc3RpbGwgcmVtYWluaW5nLlxuICBpZiAoaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgcGF0aCArPSBzdHIuc3Vic3RyKGluZGV4KVxuICB9XG5cbiAgLy8gSWYgdGhlIHBhdGggZXhpc3RzLCBwdXNoIGl0IG9udG8gdGhlIGVuZC5cbiAgaWYgKHBhdGgpIHtcbiAgICB0b2tlbnMucHVzaChwYXRoKVxuICB9XG5cbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzdHJpbmcgdG8gYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmb3IgdGhlIHBhdGguXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSAgIHN0clxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGUgKHN0cikge1xuICByZXR1cm4gdG9rZW5zVG9GdW5jdGlvbihwYXJzZShzdHIpKVxufVxuXG4vKipcbiAqIEV4cG9zZSBhIG1ldGhvZCBmb3IgdHJhbnNmb3JtaW5nIHRva2VucyBpbnRvIHRoZSBwYXRoIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiB0b2tlbnNUb0Z1bmN0aW9uICh0b2tlbnMpIHtcbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHRva2VucyBpbnRvIHJlZ2V4cHMuXG4gIHZhciBtYXRjaGVzID0gbmV3IEFycmF5KHRva2Vucy5sZW5ndGgpXG5cbiAgLy8gQ29tcGlsZSBhbGwgdGhlIHBhdHRlcm5zIGJlZm9yZSBjb21waWxhdGlvbi5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIG1hdGNoZXNbaV0gPSBuZXcgUmVnRXhwKCdeJyArIHRva2Vuc1tpXS5wYXR0ZXJuICsgJyQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIHBhdGggPSAnJ1xuICAgIHZhciBkYXRhID0gb2JqIHx8IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggKz0gdG9rZW5cblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUgPSBkYXRhW3Rva2VuLm5hbWVdXG4gICAgICB2YXIgc2VnbWVudFxuXG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gYmUgZGVmaW5lZCcpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGlzYXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGlmICghdG9rZW4ucmVwZWF0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgcmVwZWF0LCBidXQgcmVjZWl2ZWQgXCInICsgdmFsdWUgKyAnXCInKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGlmICh0b2tlbi5vcHRpb25hbCkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBub3QgYmUgZW1wdHknKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBzZWdtZW50ID0gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlW2pdKVxuXG4gICAgICAgICAgaWYgKCFtYXRjaGVzW2ldLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFsbCBcIicgKyB0b2tlbi5uYW1lICsgJ1wiIHRvIG1hdGNoIFwiJyArIHRva2VuLnBhdHRlcm4gKyAnXCIsIGJ1dCByZWNlaXZlZCBcIicgKyBzZWdtZW50ICsgJ1wiJylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwYXRoICs9IChqID09PSAwID8gdG9rZW4ucHJlZml4IDogdG9rZW4uZGVsaW1pdGVyKSArIHNlZ21lbnRcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHNlZ21lbnQgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpXG5cbiAgICAgIGlmICghbWF0Y2hlc1tpXS50ZXN0KHNlZ21lbnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gbWF0Y2ggXCInICsgdG9rZW4ucGF0dGVybiArICdcIiwgYnV0IHJlY2VpdmVkIFwiJyArIHNlZ21lbnQgKyAnXCInKVxuICAgICAgfVxuXG4gICAgICBwYXRoICs9IHRva2VuLnByZWZpeCArIHNlZ21lbnRcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aFxuICB9XG59XG5cbi8qKlxuICogRXNjYXBlIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcgKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbLisqPz1eIToke30oKVtcXF18XFwvXSkvZywgJ1xcXFwkMScpXG59XG5cbi8qKlxuICogRXNjYXBlIHRoZSBjYXB0dXJpbmcgZ3JvdXAgYnkgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzIGFuZCBtZWFuaW5nLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gZ3JvdXBcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXNjYXBlR3JvdXAgKGdyb3VwKSB7XG4gIHJldHVybiBncm91cC5yZXBsYWNlKC8oWz0hOiRcXC8oKV0pL2csICdcXFxcJDEnKVxufVxuXG4vKipcbiAqIEF0dGFjaCB0aGUga2V5cyBhcyBhIHByb3BlcnR5IG9mIHRoZSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7UmVnRXhwfSByZVxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIGF0dGFjaEtleXMgKHJlLCBrZXlzKSB7XG4gIHJlLmtleXMgPSBrZXlzXG4gIHJldHVybiByZVxufVxuXG4vKipcbiAqIEdldCB0aGUgZmxhZ3MgZm9yIGEgcmVnZXhwIGZyb20gdGhlIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGZsYWdzIChvcHRpb25zKSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/ICcnIDogJ2knXG59XG5cbi8qKlxuICogUHVsbCBvdXQga2V5cyBmcm9tIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge1JlZ0V4cH0gcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIHJlZ2V4cFRvUmVnZXhwIChwYXRoLCBrZXlzKSB7XG4gIC8vIFVzZSBhIG5lZ2F0aXZlIGxvb2thaGVhZCB0byBtYXRjaCBvbmx5IGNhcHR1cmluZyBncm91cHMuXG4gIHZhciBncm91cHMgPSBwYXRoLnNvdXJjZS5tYXRjaCgvXFwoKD8hXFw/KS9nKVxuXG4gIGlmIChncm91cHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAga2V5cy5wdXNoKHtcbiAgICAgICAgbmFtZTogaSxcbiAgICAgICAgcHJlZml4OiBudWxsLFxuICAgICAgICBkZWxpbWl0ZXI6IG51bGwsXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgcmVwZWF0OiBmYWxzZSxcbiAgICAgICAgcGF0dGVybjogbnVsbFxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhwYXRoLCBrZXlzKVxufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBhcnJheSBpbnRvIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gYXJyYXlUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgcGFydHMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgIHBhcnRzLnB1c2gocGF0aFRvUmVnZXhwKHBhdGhbaV0sIGtleXMsIG9wdGlvbnMpLnNvdXJjZSlcbiAgfVxuXG4gIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCcoPzonICsgcGFydHMuam9pbignfCcpICsgJyknLCBmbGFncyhvcHRpb25zKSlcblxuICByZXR1cm4gYXR0YWNoS2V5cyhyZWdleHAsIGtleXMpXG59XG5cbi8qKlxuICogQ3JlYXRlIGEgcGF0aCByZWdleHAgZnJvbSBzdHJpbmcgaW5wdXQuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiBzdHJpbmdUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucykge1xuICB2YXIgdG9rZW5zID0gcGFyc2UocGF0aClcbiAgdmFyIHJlID0gdG9rZW5zVG9SZWdFeHAodG9rZW5zLCBvcHRpb25zKVxuXG4gIC8vIEF0dGFjaCBrZXlzIGJhY2sgdG8gdGhlIHJlZ2V4cC5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHRva2Vuc1tpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGtleXMucHVzaCh0b2tlbnNbaV0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGF0dGFjaEtleXMocmUsIGtleXMpXG59XG5cbi8qKlxuICogRXhwb3NlIGEgZnVuY3Rpb24gZm9yIHRha2luZyB0b2tlbnMgYW5kIHJldHVybmluZyBhIFJlZ0V4cC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gIHRva2Vuc1xuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gdG9rZW5zVG9SZWdFeHAgKHRva2Vucywgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gIHZhciBzdHJpY3QgPSBvcHRpb25zLnN0cmljdFxuICB2YXIgZW5kID0gb3B0aW9ucy5lbmQgIT09IGZhbHNlXG4gIHZhciByb3V0ZSA9ICcnXG4gIHZhciBsYXN0VG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdXG4gIHZhciBlbmRzV2l0aFNsYXNoID0gdHlwZW9mIGxhc3RUb2tlbiA9PT0gJ3N0cmluZycgJiYgL1xcLyQvLnRlc3QobGFzdFRva2VuKVxuXG4gIC8vIEl0ZXJhdGUgb3ZlciB0aGUgdG9rZW5zIGFuZCBjcmVhdGUgb3VyIHJlZ2V4cCBzdHJpbmcuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRva2VuID0gdG9rZW5zW2ldXG5cbiAgICBpZiAodHlwZW9mIHRva2VuID09PSAnc3RyaW5nJykge1xuICAgICAgcm91dGUgKz0gZXNjYXBlU3RyaW5nKHRva2VuKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcHJlZml4ID0gZXNjYXBlU3RyaW5nKHRva2VuLnByZWZpeClcbiAgICAgIHZhciBjYXB0dXJlID0gdG9rZW4ucGF0dGVyblxuXG4gICAgICBpZiAodG9rZW4ucmVwZWF0KSB7XG4gICAgICAgIGNhcHR1cmUgKz0gJyg/OicgKyBwcmVmaXggKyBjYXB0dXJlICsgJykqJ1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4ub3B0aW9uYWwpIHtcbiAgICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKD86JyArIHByZWZpeCArICcoJyArIGNhcHR1cmUgKyAnKSk/J1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhcHR1cmUgPSAnKCcgKyBjYXB0dXJlICsgJyk/J1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYXB0dXJlID0gcHJlZml4ICsgJygnICsgY2FwdHVyZSArICcpJ1xuICAgICAgfVxuXG4gICAgICByb3V0ZSArPSBjYXB0dXJlXG4gICAgfVxuICB9XG5cbiAgLy8gSW4gbm9uLXN0cmljdCBtb2RlIHdlIGFsbG93IGEgc2xhc2ggYXQgdGhlIGVuZCBvZiBtYXRjaC4gSWYgdGhlIHBhdGggdG9cbiAgLy8gbWF0Y2ggYWxyZWFkeSBlbmRzIHdpdGggYSBzbGFzaCwgd2UgcmVtb3ZlIGl0IGZvciBjb25zaXN0ZW5jeS4gVGhlIHNsYXNoXG4gIC8vIGlzIHZhbGlkIGF0IHRoZSBlbmQgb2YgYSBwYXRoIG1hdGNoLCBub3QgaW4gdGhlIG1pZGRsZS4gVGhpcyBpcyBpbXBvcnRhbnRcbiAgLy8gaW4gbm9uLWVuZGluZyBtb2RlLCB3aGVyZSBcIi90ZXN0L1wiIHNob3VsZG4ndCBtYXRjaCBcIi90ZXN0Ly9yb3V0ZVwiLlxuICBpZiAoIXN0cmljdCkge1xuICAgIHJvdXRlID0gKGVuZHNXaXRoU2xhc2ggPyByb3V0ZS5zbGljZSgwLCAtMikgOiByb3V0ZSkgKyAnKD86XFxcXC8oPz0kKSk/J1xuICB9XG5cbiAgaWYgKGVuZCkge1xuICAgIHJvdXRlICs9ICckJ1xuICB9IGVsc2Uge1xuICAgIC8vIEluIG5vbi1lbmRpbmcgbW9kZSwgd2UgbmVlZCB0aGUgY2FwdHVyaW5nIGdyb3VwcyB0byBtYXRjaCBhcyBtdWNoIGFzXG4gICAgLy8gcG9zc2libGUgYnkgdXNpbmcgYSBwb3NpdGl2ZSBsb29rYWhlYWQgdG8gdGhlIGVuZCBvciBuZXh0IHBhdGggc2VnbWVudC5cbiAgICByb3V0ZSArPSBzdHJpY3QgJiYgZW5kc1dpdGhTbGFzaCA/ICcnIDogJyg/PVxcXFwvfCQpJ1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAoJ14nICsgcm91dGUsIGZsYWdzKG9wdGlvbnMpKVxufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKlxuICogQHBhcmFtICB7KFN0cmluZ3xSZWdFeHB8QXJyYXkpfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgICAgICAgICAgICAgIFtrZXlzXVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgICAgICAgICBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gcGF0aFRvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zKSB7XG4gIGtleXMgPSBrZXlzIHx8IFtdXG5cbiAgaWYgKCFpc2FycmF5KGtleXMpKSB7XG4gICAgb3B0aW9ucyA9IGtleXNcbiAgICBrZXlzID0gW11cbiAgfSBlbHNlIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fVxuICB9XG5cbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gcmVnZXhwVG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIGlmIChpc2FycmF5KHBhdGgpKSB7XG4gICAgcmV0dXJuIGFycmF5VG9SZWdleHAocGF0aCwga2V5cywgb3B0aW9ucylcbiAgfVxuXG4gIHJldHVybiBzdHJpbmdUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICByZXR1cm4gYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ5dGVzVG9VdWlkO1xuIiwiLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gIEluIHRoZVxuLy8gYnJvd3NlciB0aGlzIGlzIGEgbGl0dGxlIGNvbXBsaWNhdGVkIGR1ZSB0byB1bmtub3duIHF1YWxpdHkgb2YgTWF0aC5yYW5kb20oKVxuLy8gYW5kIGluY29uc2lzdGVudCBzdXBwb3J0IGZvciB0aGUgYGNyeXB0b2AgQVBJLiAgV2UgZG8gdGhlIGJlc3Qgd2UgY2FuIHZpYVxuLy8gZmVhdHVyZS1kZXRlY3Rpb25cbnZhciBybmc7XG5cbnZhciBjcnlwdG8gPSBnbG9iYWwuY3J5cHRvIHx8IGdsb2JhbC5tc0NyeXB0bzsgLy8gZm9yIElFIDExXG5pZiAoY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuICBybmcgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufVxuXG5pZiAoIXJuZykge1xuICAvLyBNYXRoLnJhbmRvbSgpLWJhc2VkIChSTkcpXG4gIC8vXG4gIC8vIElmIGFsbCBlbHNlIGZhaWxzLCB1c2UgTWF0aC5yYW5kb20oKS4gIEl0J3MgZmFzdCwgYnV0IGlzIG9mIHVuc3BlY2lmaWVkXG4gIC8vIHF1YWxpdHkuXG4gIHZhciBybmRzID0gbmV3IEFycmF5KDE2KTtcbiAgcm5nID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIHJuZHNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJuZHM7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcm5nO1xuIiwidmFyIHJuZyA9IHJlcXVpcmUoJy4vbGliL3JuZycpO1xudmFyIGJ5dGVzVG9VdWlkID0gcmVxdWlyZSgnLi9saWIvYnl0ZXNUb1V1aWQnKTtcblxuZnVuY3Rpb24gdjQob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG5cbiAgaWYgKHR5cGVvZihvcHRpb25zKSA9PSAnc3RyaW5nJykge1xuICAgIGJ1ZiA9IG9wdGlvbnMgPT0gJ2JpbmFyeScgPyBuZXcgQXJyYXkoMTYpIDogbnVsbDtcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcm5kcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBybmcpKCk7XG5cbiAgLy8gUGVyIDQuNCwgc2V0IGJpdHMgZm9yIHZlcnNpb24gYW5kIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYFxuICBybmRzWzZdID0gKHJuZHNbNl0gJiAweDBmKSB8IDB4NDA7XG4gIHJuZHNbOF0gPSAocm5kc1s4XSAmIDB4M2YpIHwgMHg4MDtcblxuICAvLyBDb3B5IGJ5dGVzIHRvIGJ1ZmZlciwgaWYgcHJvdmlkZWRcbiAgaWYgKGJ1Zikge1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCAxNjsgKytpaSkge1xuICAgICAgYnVmW2kgKyBpaV0gPSBybmRzW2lpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmIHx8IGJ5dGVzVG9VdWlkKHJuZHMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHY0O1xuIiwiaW1wb3J0IHJlcGxhY2VBbGwgZnJvbSAnLi9VdGlscy9TdHJpbmdSZXBsYWNlcidcbmNvbnN0IHV1aWR2NCA9IHJlcXVpcmUoJ3V1aWQvdjQnKTtcblxuY29uc3QgYWRkT3B0aW9uVG9ET00gPSBmdW5jdGlvbihkaWNlLCBvcHRpb25Db21wb25lbnQpIHtcbiAgY29uc29sZS5sb2coJ2FkZCBidXR0b24gcHJlc3NlZCcpO1xuICBpZiAoISQoJy5qcy1vcHRpb24tdGV4dCcpLnZhbCgpLnJlcGxhY2UoL1xccy9nLCAnJykubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG5ld0lkID0gdXVpZHY0KCk7XG4gIGNvbnN0IG5ld09wdGlvbiA9ICQoJy5qcy1vcHRpb24tdGV4dCcpLnZhbCgpO1xuXG4gICQoJy5qcy1lZGl0LW9wdGlvbnMtbGlzdCcpLmFwcGVuZChyZXBsYWNlQWxsKG9wdGlvbkNvbXBvbmVudCwgeydAb3B0aW9uJzogbmV3T3B0aW9ufSkpO1xuXG4gICQoJy5qcy1kZWxldGUtb3B0aW9uJykuY2xpY2soZSA9PiB7XG4gICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAkKGUuY3VycmVudFRhcmdldCkucGFyZW50KCkucmVtb3ZlKCk7XG4gICAgZGljZS5kZWxldGVPcHRpb24obmV3SWQpXG4gIH0pO1xuXG4gICQoJy5qcy1vcHRpb24tdGV4dCcpLnZhbCgnJyk7XG4gIGRpY2UuYWRkT3B0aW9uKG5ld0lkLCBuZXdPcHRpb24pO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7YWRkT3B0aW9uVG9ET019XG4iLCJpbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdkaWNlJyk7XG5cbi8vIGdldCB0ZW1wbGF0ZSBmb3IgZWFjaCBkZWNpc2lvbiBhbmQgZGlzcGxheSBpdFxuY29uc3QgY3JlYXRlRGVjaXNpb25DYXJkID0gKGRpY2UsIGNvbXBvbmVudCwgZGljZUFuaW1hdGlvbikgPT4ge1xuICBkZWJ1ZygnY3JlYXRlRGVjaXNpb25DYXJkIHdhcyBjYWxsZWQnKTtcbiAgY29uc3QgbWFwID0ge1xuICAgICdAdGl0bGUnOiBkaWNlLmRlY2lzaW9uLFxuICAgICdAaWQnOiBkaWNlLl9pZCxcbiAgICAnQGRlc2NyaXB0aW9uJzogZGljZS5kZXNjcmlwdGlvblxuICB9XG4gIGNvbnN0IGNhcmQgPSByZXBsYWNlQWxsKGNvbXBvbmVudCwgbWFwKTtcbiAgJCgnLmpzLW1haW4tY29udGVudCcpLmFwcGVuZChjYXJkKTtcbiAgJCgnLmpzLXJvbGwnKS5jbGljaygoZSkgPT4ge1xuICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgY29uc3QgJGN1cnJlbnREaWNlID0gJChlLmN1cnJlbnRUYXJnZXQpLnBhcmVudCgpLnBhcmVudCgpLmZpbmQoJyNjdWJlJylcbiAgICBkaWNlLnJvbGwoKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgJGN1cnJlbnREaWNlLmFkZENsYXNzKCdyb2xsJyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICBhbGVydChgWW91ciBhbnN3ZXIgdG8gXCIke2RpY2UuZGVjaXNpb259XCIgaXM6ICR7cmVzdWx0LmNvbnRlbnR9YCk7XG4gICAgICAgICAgJGN1cnJlbnREaWNlLnJlbW92ZUNsYXNzKCdyb2xsJyk7XG4gICAgICAgIH0sIDEwMDApXG4gICAgICB9KVxuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtjcmVhdGVEZWNpc2lvbkNhcmR9XG4iLCJpbXBvcnQgRGVjaXNpb25MaXN0U3RhdGUgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQgVXNlciBmcm9tICcuL01vZGVscy9Vc2VyTW9kZWwnXG5cbmNvbnN0IGRlbGV0ZURpY2UgPSBmdW5jdGlvbihkaWNlKSB7XG4gIFVzZXIuY2hlY2tBdXRoKClcbiAgICAudGhlbigoKSA9PiBkaWNlLmRlbGV0ZUZyb21EYigpKVxuICAgIC50aGVuKCgpID0+IGRlbGV0ZURpY2VGcm9tQ2FjaGUoZGljZSkpXG4gICAgLnRoZW4oKCkgPT4gcGFnZSgnLycpKVxuICAgIC5jYXRjaCgoZXJyKSA9PiBhbGVydCgnY2Fubm90IGRlbGV0ZSBkaWNlIGF0IHRoaXMgdGltZScpKVxufVxuXG5jb25zdCBkZWxldGVEaWNlRnJvbUNhY2hlID0gKGRpY2UpID0+IERlY2lzaW9uTGlzdFN0YXRlLnJlbW92ZURpY2VCeUlkKGRpY2UuX2lkKTtcblxuZXhwb3J0IGRlZmF1bHQge2RlbGV0ZURpY2V9XG4iLCJpbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuaW1wb3J0IEFkZEJ1dHRvbiBmcm9tICcuL0FkZEJ1dHRvbidcbmltcG9ydCBTYXZlQnV0dG9uIGZyb20gJy4vU2F2ZUJ1dHRvbidcbmltcG9ydCBEaWNlIGZyb20gJy4vTW9kZWxzL0RpY2VNb2RlbCdcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG5jb25zdCBuZXdEaWNlID0gW107XG5cbmNvbnN0IGNyZWF0ZURpY2VFZGl0UGFnZSA9IGZ1bmN0aW9uKHBhZ2VMYXlvdXQsIGRpY2VIZWFkZXJDb21wb25lbnQsIG9wdGlvbkNvbXBvbmVudCwgc2F2ZUJ0bikge1xuICBkZWJ1ZygnY3JlYXRlRGljZUVkaXRQYWdlIHdhcyBjYWxsZWQnKTtcbiAgY29uc3QgZGljZU1hcCA9IHtcbiAgICAnQHRpdGxlJzogJycsXG4gICAgJ0BkZXNjcmlwdGlvbic6ICcnXG4gIH1cbiAgJCgnLmpzLW1haW4tY29udGVudCcpLmFwcGVuZChwYWdlTGF5b3V0KTtcbiAgJCgnLmpzLWVkaXQtZGljZS1mYWNlJykuYXBwZW5kKHJlcGxhY2VBbGwoZGljZUhlYWRlckNvbXBvbmVudCwgZGljZU1hcCkpO1xuICAkKCcuanMtZWRpdC1kaWNlLW9wdGlvbicpLmFwcGVuZChzYXZlQnRuKTtcblxuICBsZXQgbmV3RGljZVdvcmtpbmdNZW1vcnkgPSB7XG4gICAgJ2RlY2lzaW9uJzogJ25ldyBkaWNlJyxcbiAgICAnZGVzY3JpcHRpb24nOiAnbmV3IGRlc2NyaXB0aW9uJyxcbiAgICAnb3B0aW9ucyc6IFtdXG4gIH1cblxuICBEaWNlLmNyZWF0ZU1vY2sobmV3RGljZVdvcmtpbmdNZW1vcnkpXG4gICAgLnRoZW4oKGRpY2UpID0+IHtcbiAgICAgIG5ld0RpY2UubGVuZ3RoID0gMDtcbiAgICAgIG5ld0RpY2UucHVzaChkaWNlKTtcbiAgICAgICQoJy5qcy1hZGQtb3B0aW9uJykuY2xpY2soKCkgPT4gQWRkQnV0dG9uLmFkZE9wdGlvblRvRE9NKGRpY2UsIG9wdGlvbkNvbXBvbmVudCkpO1xuICAgICAgJCgnLmpzLXNhdmUtZGljZScpLmNsaWNrKCgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NhdmUgZGljZSBjbGlja2VkJylcbiAgICAgICAgU2F2ZUJ1dHRvbi5zYXZlRGljZShcbiAgICAgICAgICBuZXdEaWNlWzBdLFxuICAgICAgICAgICQoJy5qcy1pbnB1dC10aXRsZScpLnZhbCgpLFxuICAgICAgICAgICQoJy5qcy1pbnB1dC1kZXNjcmlwdGlvbicpLnZhbCgpXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgICk7XG4gICAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge2NyZWF0ZURpY2VFZGl0UGFnZX1cbiIsImltcG9ydCBDb21wb25lbnRTdGF0ZSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCBEaWNlQ3JlYXRlVmlldyBmcm9tICcuL0RpY2VDcmVhdGVWaWV3J1xuaW1wb3J0IFV0aWxGdW5jIGZyb20gJy4vVXRpbHMvQ2xlYXJIVE1MJ1xuXG4vLyBjcmVhdGUgdGhlIGhvbWUgcGFnZVxuLy8gY29udHJvbCBmZXRjaGluZyBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGFuZCBpbnB1dCBhcyBodG1sXG5jb25zdCBuZXdEaWNlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWVkaXQtcGFnZScpLFxuICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1lZGl0LWZhY2UnKSxcbiAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RpY2UtZWRpdC1vcHRpb24nKSxcbiAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ3NhdmUtYnV0dG9uJylcbiAgICBdKVxuICAgIC50aGVuKChwYXlsb2FkKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhwYXlsb2FkKTtcbiAgICAgIFV0aWxGdW5jLmNsZWFySHRtbCgnanMtbWFpbi1jb250ZW50Jyk7XG4gICAgICBEaWNlQ3JlYXRlVmlldy5jcmVhdGVEaWNlRWRpdFBhZ2UocGF5bG9hZFswXSwgcGF5bG9hZFsxXSwgcGF5bG9hZFsyXSwgcGF5bG9hZFszXSk7XG4gICAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7bmV3RGljZX1cbiIsImltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5pbXBvcnQgQWRkQnV0dG9uIGZyb20gJy4vQWRkQnV0dG9uLmpzJ1xuaW1wb3J0IERlbGV0ZUJ1dHRvbiBmcm9tICcuL0RlbGV0ZUJ1dHRvbi5qcydcbmltcG9ydCBTYXZlQnV0dG9uIGZyb20gJy4vU2F2ZUJ1dHRvbi5qcydcblxuY29uc3QgY3JlYXRlRGljZUVkaXRQYWdlID0gZnVuY3Rpb24oZGljZSwgcGFnZUxheW91dCwgZGljZUhlYWRlckNvbXBvbmVudCwgb3B0aW9uQ29tcG9uZW50LCBzYXZlQnRuLCBkZWxldGVCdG4pIHtcbiAgY29uc29sZS5sb2coJ2NyZWF0ZURpY2VFZGl0UGFnZSB3YXMgY2FsbGVkJyk7XG4gIGNvbnN0IGRpY2VNYXAgPSB7XG4gICAgJ0B0aXRsZSc6IGRpY2UuZGVjaXNpb24sXG4gICAgJ0BkZXNjcmlwdGlvbic6IGRpY2UuZGVzY3JpcHRpb25cbiAgfVxuICAkKCcuanMtbWFpbi1jb250ZW50JykuYXBwZW5kKHBhZ2VMYXlvdXQpO1xuICAkKCcuanMtZWRpdC1kaWNlLWZhY2UnKS5hcHBlbmQocmVwbGFjZUFsbChkaWNlSGVhZGVyQ29tcG9uZW50LCBkaWNlTWFwKSk7XG4gICQoJy5qcy1lZGl0LWRpY2Utb3B0aW9uJykuYXBwZW5kKHNhdmVCdG4pO1xuICAkKCcuanMtZWRpdC1kaWNlLW9wdGlvbicpLmFwcGVuZChkZWxldGVCdG4pO1xuXG4gIGRpY2Uub3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgJCgnLmpzLWVkaXQtb3B0aW9ucy1saXN0JykuYXBwZW5kKHJlcGxhY2VBbGwob3B0aW9uQ29tcG9uZW50LCB7J0BvcHRpb24nOiBvcHRpb24uY29udGVudH0pKTtcbiAgICAkKCcuanMtZGVsZXRlLW9wdGlvbicpLmNsaWNrKGUgPT4ge1xuICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5wYXJlbnQoKS5yZW1vdmUoKTtcbiAgICAgIGRpY2UuZGVsZXRlT3B0aW9uKG9wdGlvbi5mYWNlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgJCgnLmpzLWFkZC1vcHRpb24nKS5jbGljaygoKSA9PiBBZGRCdXR0b24uYWRkT3B0aW9uVG9ET00oZGljZSwgb3B0aW9uQ29tcG9uZW50KSk7XG4gICQoJy5qcy1zYXZlLWRpY2UnKS5jbGljaygoKSA9PiBTYXZlQnV0dG9uLnVwZGF0ZURpY2UoZGljZSwgJCgnLmpzLWlucHV0LXRpdGxlJykudmFsKCksICQoJy5qcy1pbnB1dC1kZXNjcmlwdGlvbicpLnZhbCgpKSk7XG4gICQoJy5qcy1kZWxldGUtZGljZScpLmNsaWNrKCgpID0+IERlbGV0ZUJ1dHRvbi5kZWxldGVEaWNlKGRpY2UpKVxufVxuXG5leHBvcnQgZGVmYXVsdCB7Y3JlYXRlRGljZUVkaXRQYWdlfVxuIiwiaW1wb3J0IERlY2lzaW9uTGlzdFN0YXRlIGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0IENvbXBvbmVudFN0YXRlIGZyb20gJy4vTW9kZWxzL0NvbXBvbmVudFN0YXRlJ1xuaW1wb3J0IFVzZXIgZnJvbSAnLi9Nb2RlbHMvVXNlck1vZGVsJ1xuaW1wb3J0IERpY2VFZGl0VmlldyBmcm9tICcuL0RpY2VFZGl0VmlldydcbmltcG9ydCBVdGlsRnVuYyBmcm9tICcuL1V0aWxzL0NsZWFySFRNTCdcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3QgZGljZUVkaXRWaWV3ID0gKGN0eCkgPT4ge1xuXG4gIFVzZXIuY2hlY2tBdXRoKCk7XG5cbiAgY29uc3QgaWQgPSBjdHgucGFyYW1zLmRlY2lzaW9uSWQ7XG4gIGNvbnNvbGUubG9nKGBpZCA9ICR7aWR9YCk7XG4gIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICBEZWNpc2lvbkxpc3RTdGF0ZS5nZXREaWNlQnlJZChjdHgucGFyYW1zLmRlY2lzaW9uSWQpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWVkaXQtcGFnZScpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWVkaXQtZmFjZScpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWVkaXQtb3B0aW9uJyksXG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ3NhdmUtYnV0dG9uJyksXG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RlbGV0ZS1idXR0b24nKVxuICAgIF0pXG4gICAgLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgaWYgKCFkYXRhWzBdKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aGVyZSBpcyBubyBkaWNlIGRhdGEnKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyBkYXRhJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBVdGlsRnVuYy5jbGVhckh0bWwoJ2pzLW1haW4tY29udGVudCcpXG4gICAgICAgIERpY2VFZGl0Vmlldy5jcmVhdGVEaWNlRWRpdFBhZ2UoZGF0YVswXSwgZGF0YVsxXSwgZGF0YVsyXSwgZGF0YVszXSwgZGF0YVs0XSwgZGF0YVs1XSk7XG4gICAgICB9XG4gICAgfSk7XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBEaWNlVmlld1xuZXhwb3J0IGRlZmF1bHQge2RpY2VFZGl0Vmlld31cbiIsImltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5cbmNvbnN0IGNyZWF0ZURpY2VQYWdlID0gZnVuY3Rpb24oZGljZSwgcGFnZUxheW91dCwgZGljZUNvbXBvbmVudCwgb3B0aW9uQ29tcG9uZW50LCBlZGl0QnRuKSB7XG4gIGNvbnNvbGUubG9nKCdjcmVhdGVEaWNlUGFnZSB3YXMgY2FsbGVkJyk7XG4gIGNvbnN0IGRpY2VNYXAgPSB7XG4gICAgJ0B0aXRsZSc6IGRpY2UuZGVjaXNpb24sXG4gICAgJ0BkZXNjcmlwdGlvbic6IGRpY2UuZGVzY3JpcHRpb24sXG4gICAgJ0BpZCc6IGRpY2UuX2lkXG4gIH1cbiAgY29uc3QgZGljZUZhY2UgPSByZXBsYWNlQWxsKGRpY2VDb21wb25lbnQsIGRpY2VNYXApO1xuICAkKCcuanMtbWFpbi1jb250ZW50JykuYXBwZW5kKHBhZ2VMYXlvdXQpO1xuICAkKCcuanMtZGljZS1mYWNlJykuYXBwZW5kKGRpY2VGYWNlKTtcbiAgJCgnLmpzLXJvbGwnKS5jbGljaygoZSkgPT4ge1xuICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgZGljZS5yb2xsKCkudGhlbihyZXN1bHQgPT4gYWxlcnQocmVzdWx0LmNvbnRlbnQpKTtcbiAgfSk7XG5cbiAgaWYoZWRpdEJ0bikge1xuICAgIGNvbnN0IGVkaXRNYXAgPSB7XG4gICAgICAnQGlkJzogZGljZS5faWRcbiAgICB9XG4gICAgY29uc3QgZWRpdEJ1dHRvbiA9IHJlcGxhY2VBbGwoZWRpdEJ0biwgZWRpdE1hcClcbiAgICAkKCcuanMtZGljZS1vcHRpb24nKS5hcHBlbmQoZWRpdEJ1dHRvbik7XG4gIH1cblxuICBkaWNlLm9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICQoJy5qcy1vcHRpb25zLWxpc3QnKS5hcHBlbmQocmVwbGFjZUFsbChvcHRpb25Db21wb25lbnQsIHsnQG9wdGlvbic6IG9wdGlvbi5jb250ZW50fSkpO1xuICB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCB7Y3JlYXRlRGljZVBhZ2V9XG4iLCJpbXBvcnQgRGVjaXNpb25MaXN0U3RhdGUgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQgQ29tcG9uZW50U3RhdGUgZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSdcbmltcG9ydCBEaWNlUGFnZVZpZXcgZnJvbSAnLi9EaWNlUGFnZVZpZXcnXG5pbXBvcnQgVXRpbEZ1bmMgZnJvbSAnLi9VdGlscy9DbGVhckhUTUwnXG5cbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG4vLyBjcmVhdGUgdGhlIGhvbWUgcGFnZVxuLy8gY29udHJvbCBmZXRjaGluZyBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGFuZCBpbnB1dCBhcyBodG1sXG5jb25zdCBkaWNlVmlldyA9IGZ1bmN0aW9uKGN0eCkge1xuICBjb25zdCBpZCA9IGN0eC5wYXJhbXMuZGVjaXNpb25JZDtcbiAgY29uc3QgdXNlciA9IFVzZXJTdGF0ZS5nZXRTdGF0ZSgpO1xuICBkZWJ1ZyhgaWQgPSAke2lkfWApO1xuICBjb25zdCBhc3luY09wZXJhdGlvbnMgPSBbXG4gICAgRGVjaXNpb25MaXN0U3RhdGUuZ2V0RGljZUJ5SWQoY3R4LnBhcmFtcy5kZWNpc2lvbklkKSxcbiAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RpY2UtcGFnZScpLFxuICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1mYWNlJyksXG4gICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLW9wdGlvbicpXG4gIF1cblxuICBpZiAodXNlcikge1xuICAgIGlmICh1c2VyLmRlY2lzaW9uX2lkLmluY2x1ZGVzKGlkKSkge1xuICAgICAgYXN5bmNPcGVyYXRpb25zLnB1c2goQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdlZGl0LWJ1dHRvbicpKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBQcm9taXNlLmFsbChhc3luY09wZXJhdGlvbnMpXG4gICAgLnRoZW4oKHBheWxvYWQpID0+IHtcbiAgICAgIGlmICghcGF5bG9hZFswXSkge1xuICAgICAgICBjb25zb2xlLmxvZygndGhlcmUgaXMgbm8gZGljZSBkYXRhJyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gZGF0YScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgVXRpbEZ1bmMuY2xlYXJIdG1sKCdqcy1tYWluLWNvbnRlbnQnKTtcbiAgICAgICAgRGljZVBhZ2VWaWV3LmNyZWF0ZURpY2VQYWdlKHBheWxvYWRbMF0sIHBheWxvYWRbMV0sIHBheWxvYWRbMl0sIHBheWxvYWRbM10sIHBheWxvYWRbNF0pO1xuICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRGljZVZpZXdcbmV4cG9ydCBkZWZhdWx0IHtkaWNlVmlld31cbiIsImltcG9ydCBEZWNpc2lvbkxpc3RTdGF0ZSBmcm9tICcuL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZSdcbmltcG9ydCBDb21wb25lbnRTdGF0ZSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCBEZWNpc2lvbkNhcmRWaWV3IGZyb20gJy4vRGVjaXNpb25DYXJkVmlldydcbmltcG9ydCBVdGlsRnVuYyBmcm9tICcuL1V0aWxzL0NsZWFySFRNTCdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3Qgdmlld0hvbWUgPSBmdW5jdGlvbigpIHtcbiAgZGVidWcoJ3ZpZXdIb21lIHN0YXJ0aW5nJyk7XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgIERlY2lzaW9uTGlzdFN0YXRlLmdldERpY2UoKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGVjaXNpb24tY2FyZCcpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWFuaW1hdGlvbicpXG4gICAgXSlcbiAgICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAgICAgZGVidWcocGF5bG9hZCk7XG4gICAgICBpZiAocGF5bG9hZFswXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVidWcoJ3RoZXJlIGlzIG5vIGRhdGEnKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyBkYXRhJyk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgVXRpbEZ1bmMuY2xlYXJIdG1sKCdqcy1tYWluLWNvbnRlbnQnKTtcbiAgICAgICAgcGF5bG9hZFswXS5mb3JFYWNoKGRpY2UgPT4ge1xuICAgICAgICAgIERlY2lzaW9uQ2FyZFZpZXcuY3JlYXRlRGVjaXNpb25DYXJkKGRpY2UsIHBheWxvYWRbMV0sIHBheWxvYWRbMl0pO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge3ZpZXdIb21lfVxuIiwiaW1wb3J0IHtCQVNFX1VSTCwgUE9SVH0gZnJvbSAnLi4vVXRpbHMvY29uc3RhbnRzJ1xuXG5jb25zdCBDT01QT05FTlRTX09CSiA9IHt9O1xuXG4vLyBhZGQgY29tcG9uZW50IHRvIENPTVBPTkVOVFNfT0JKIGZvciBjYWNoaW5nXG5jb25zdCBhZGRDb21wb25lbnRUb1N0YXRlID0gKGtleSwgY29tcG9uZW50KSA9PiB7XG4gIENPTVBPTkVOVFNfT0JKW2tleV0gPSBjb21wb25lbnQ7XG59XG5cbi8vIHJldHVybiBhIENPTVBPTkVOVCBieSBrZXkgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldENvbXBvbmVudCA9IChrZXkpID0+IHtcbiAgY29uc29sZS5sb2coJ2dldENvbXBvbmVudCB3YXMgY2FsbGVkJyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKENPTVBPTkVOVFNfT0JKW2tleV0pIHtcbiAgICAgIHJlcyhDT01QT05FTlRTX09CSltrZXldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0Q29tcG9uZW50QVBJKGtleSkudGhlbigoKSA9PiByZXMoQ09NUE9ORU5UU19PQkpba2V5XSkpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIGdldCBjb21wb25lbnQgdGVtcGxhdGVzIGZyb20gYXBpXG5jb25zdCBnZXRDb21wb25lbnRBUEkgPSAobmFtZSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gYC9zdGF0aWMvJHtuYW1lfS5odG1sYDtcbiAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAkLmFqYXgoe3VybDogdXJsU3RyaW5nfSlcbiAgICAgIC5kb25lKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgYWRkQ29tcG9uZW50VG9TdGF0ZShuYW1lLCBjb21wb25lbnQpO1xuICAgICAgICByZXMoY29tcG9uZW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKChlcnIpID0+IHtyZWooYGNhbm5vdCBnZXQgY29tcG9uZW50IC0gRXJyb3I6ICR7ZXJyfWApfSk7XG4gIH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCB7Z2V0Q29tcG9uZW50fTtcbiIsImltcG9ydCBEaWNlIGZyb20gJy4vRGljZU1vZGVsJ1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdkaWNlJyk7XG5cbmNvbnN0IERFQ0lTSU9OX0xJU1QgPSBbXTtcblxuLy8gYWRkIGRpY2UgdG8gZGVjaXNpb24gbGlzdFxuY29uc3QgYWRkRGljZSA9IChkaWNlKSA9PiB7REVDSVNJT05fTElTVC5wdXNoKG5ldyBEaWNlKGRpY2UpKX07XG5cbi8vIHJlbW92ZSBkaWNlIGZyb20gZGVjaXNpb24gbGlzdCBieSBJRFxuY29uc3QgcmVtb3ZlRGljZUJ5SWQgPSAoZGljZV9pZCkgPT4ge1xuICBERUNJU0lPTl9MSVNULnNwbGljZShERUNJU0lPTl9MSVNULmluZGV4T2YoREVDSVNJT05fTElTVC5maW5kKGRpY2UgPT4gZGljZS5faWQgPT09IGRpY2VfaWQpKSwgMSk7XG59O1xuXG4vLyByZW1vdmUgYWxsIGRpY2UgdG8gZGVjaXNpb24gbGlzdFxuY29uc3QgcmVtb3ZlQWxsRGljZSA9ICgpID0+IHtERUNJU0lPTl9MSVNULmxlbmd0aCA9IDB9O1xuXG4vLyByZXR1cm4gYSBsaXN0IG9mIGRpY2UgZnJvbSBpbi1tZW1vcnlcbmNvbnN0IGdldERpY2UgPSAoaWRBcnJheSkgPT4ge1xuICBkZWJ1ZygnZ2V0RGljZSB3YXMgY2FsbGVkJyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKERFQ0lTSU9OX0xJU1QubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXMoIWlkQXJyYXkgPyBERUNJU0lPTl9MSVNUIDogREVDSVNJT05fTElTVC5maWx0ZXIoZCA9PiBpZEFycmF5LmluY2x1ZGVzKGQuX2lkKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZXREZWNpc2lvbkxpc3RBcGkoKVxuICAgICAgICAudGhlbigoKSA9PiByZXMoIWlkQXJyYXkgPyBERUNJU0lPTl9MSVNUIDogREVDSVNJT05fTElTVC5maWx0ZXIoZCA9PiBpZEFycmF5LmluY2x1ZGVzKGQuX2lkKSkpKTtcbiAgICB9XG4gIH0pXG59XG5cbi8vIHJldHVybiBhIHNpbmdsZSBkaWNlIGZyb20gaW4tbWVtb3J5XG5jb25zdCBnZXREaWNlQnlJZCA9IChkZWNpc2lvbklkKSA9PiB7XG4gIGRlYnVnKCdnZXREaWNlQnlJZCB3YXMgY2FsbGVkJyk7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzKSA9PiB7XG4gICAgaWYgKERFQ0lTSU9OX0xJU1QubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXMoREVDSVNJT05fTElTVC5maW5kKGRpY2UgPT4gZGljZS5faWQgPT09IGRlY2lzaW9uSWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0RGVjaXNpb25MaXN0QXBpKCkudGhlbigoKSA9PiByZXMoREVDSVNJT05fTElTVC5maW5kKGRpY2UgPT4gZGljZS5faWQgPT09IGRlY2lzaW9uSWQpKSk7XG4gICAgfVxuICB9KVxufVxuXG4vLyBnZXQgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBmcm9tIGFwaVxuY29uc3QgZ2V0RGVjaXNpb25MaXN0QXBpID0gZnVuY3Rpb24oKSB7XG4gIGRlYnVnKCdnZXREZWNpc2lvbkxpc3RBcGkgd2FzIGNhbGxlZCcpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gJy9kZWNpc2lvbnMnO1xuICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICQuYWpheCh7dXJsOiB1cmxTdHJpbmd9KVxuICAgICAgLmRvbmUoYWxsRGljZUluZm8gPT4ge1xuICAgICAgICBhbGxEaWNlSW5mby5mb3JFYWNoKGRlY2lzaW9uID0+IGFkZERpY2UoZGVjaXNpb24pKVxuICAgICAgICByZXMoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSlcbiAgICAgIC5mYWlsKGVyciA9PiB7cmVqKGBjYW5ub3QgZ2V0IGRpY2UgLSBFcnJvcjogJHtlcnJ9YCl9KTtcbiAgfSlcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHthZGREaWNlLCByZW1vdmVBbGxEaWNlLCByZW1vdmVEaWNlQnlJZCwgZ2V0RGljZSwgZ2V0RGljZUJ5SWQsIGdldERlY2lzaW9uTGlzdEFwaX07XG4iLCJpbXBvcnQgZ2V0UmFuZG9tTnVtYmVyIGZyb20gJy4uL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3InO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEaWNlIHtcblxuICBjb25zdHJ1Y3RvciAoZGVjaXNpb24pIHtcbiAgICA7WydfaWQnLCAnZGVjaXNpb24nLCAnZGVzY3JpcHRpb24nLCAnb3B0aW9ucyddLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmICghZGVjaXNpb24uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFBhcmFtZXRlciAke2tleX0gaXMgIHJlcXVpcmVkLmApO1xuICAgICAgfVxuICAgICAgdGhpc1trZXldID0gZGVjaXNpb25ba2V5XTtcbiAgICB9KVxuICB9XG5cbiAgcm9sbCAoKSB7XG4gICAgcmV0dXJuIGdldFJhbmRvbU51bWJlcigwLCB0aGlzLm9wdGlvbnMubGVuZ3RoKVxuICAgICAgLnRoZW4oY2hvc2VuT3B0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1tjaG9zZW5PcHRpb25dO1xuICAgICAgfSlcbiAgfVxuXG4gIGRlbGV0ZU9wdGlvbiAob3B0aW9uSWQpIHtcbiAgICB0aGlzLm9wdGlvbnMuc3BsaWNlKFxuICAgICAgdGhpcy5vcHRpb25zLmluZGV4T2YoXG4gICAgICAgIHRoaXMub3B0aW9ucy5maW5kKG9wdCA9PiBvcHQuZmFjZSA9PT0gb3B0aW9uSWQpXG4gICAgICApLCAxXG4gICAgKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBhZGRPcHRpb24gKG9wdGlvbklkLCBvcHRpb25Db250ZW50KSB7XG4gICAgdGhpcy5vcHRpb25zLnB1c2goe1xuICAgICAgZmFjZTogb3B0aW9uSWQsXG4gICAgICBjb250ZW50OiBvcHRpb25Db250ZW50XG4gICAgfSlcbiAgICByZXR1cm47XG4gIH1cblxuICBzYXZlVG9EYiAobmV3VGl0bGUsIG5ld0Rlc2NyaXB0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgdGhpcy5kZWNpc2lvbiA9IG5ld1RpdGxlO1xuICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IG5ld0Rlc2NyaXB0aW9uO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gYC9kZWNpc2lvbnMvJHt0aGlzLl9pZH1gO1xuICAgICAgY29uc3QgdXJsU3RyaW5nID0gYCR7dGFyZ2V0fWA7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogdXJsU3RyaW5nLFxuICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBcImRlY2lzaW9uXCI6IG5ld1RpdGxlLFxuICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBuZXdEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIFwib3B0aW9uc1wiOiB0aGlzLm9wdGlvbnNcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKCgpID0+IHJlcygpKVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3QgdXBkYXRlIGRpY2UgLSBFcnJvcjogJHtlcnJ9YCkpO1xuICAgIH0pXG4gIH1cblxuICBkZWxldGVGcm9tRGIgKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvZGVjaXNpb25zLyR7dGhpcy5faWR9YDtcbiAgICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKCgpID0+IHJlcygpKVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3QgZGVsZXRlIGRpY2UgLSBFcnJvcjogJHtlcnJ9YCkpO1xuICAgIH0pXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlTW9jayAoZGljZUluZm8pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICByZXMoIG5ldyBEaWNlKHtcbiAgICAgICAgX2lkOiAxMDAwMDAwMSxcbiAgICAgICAgZGVjaXNpb246IGRpY2VJbmZvLmRlY2lzaW9uLFxuICAgICAgICBkZXNjcmlwdGlvbjogZGljZUluZm8uZGVzY3JpcHRpb24sXG4gICAgICAgIG9wdGlvbnM6IGRpY2VJbmZvLm9wdGlvbnNcbiAgICAgIH0pKVxuICAgIH0pXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlIChkaWNlSW5mbykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvZGVjaXNpb25zL25ld2A7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGljZUluZm8pLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSlcbiAgICAgICAgLmRvbmUoKHBheWxvYWQpID0+IHtcbiAgICAgICAgICByZXMobmV3IERpY2UocGF5bG9hZCkpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3QgY3JlYXRlIGRpY2UgLSBFcnJvcjogJHtlcnJ9YCkpO1xuICAgICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBsb2FkIChkaWNlSWQpIHtcbiAgICAvLyBnZXQgZGljZSBzb21laG93IGZyb20gQVBJIGFuZCByZXR1cm4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIERpY2VcbiAgICAvLyBpbnN0YW5jZVxuICAgIHJldHVybiBqUXVlcnkuYWpheCgnYXNkZicsIHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgaWQ6IGRpY2VJZFxuICAgICAgfVxuICAgIH0pXG4gICAgICAudGhlbihwYXlsb2FkID0+IG5ldyBEaWNlKHBheWxvYWQpKVxuICB9XG5cbiAgc3RhdGljIHNhdmUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGRlbGV0ZSAoZGljZSkge31cblxuICBzdGF0aWMgZmluZCAocGFyYW1zKSB7fVxuXG59XG4vL1xuLy8gRGljZS5sb2FkKDEpXG4vLyAgIC50aGVuKGRpY2UgPT4gY29uc29sZS5sb2coZGljZS5faWQpKVxuLy8gICAuY2F0Y2goY29uc29sZS5lcnJvcilcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXIge1xuXG4gIGNvbnN0cnVjdG9yICh1c2VyKSB7XG4gICAgO1snX2lkJywgJ3VzZXJuYW1lJywgJ2RlY2lzaW9uX2lkJ10uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKCF1c2VyLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJhbWV0ZXIgJHtrZXl9IGlzICByZXF1aXJlZC5gKTtcbiAgICAgIH1cbiAgICAgIHRoaXNba2V5XSA9IHVzZXJba2V5XTtcbiAgICB9KVxuICB9XG5cbiAgc2F2ZURpY2VJZFRvRGIgKGRpY2VJZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIHRoaXMuZGVjaXNpb25faWQucHVzaChkaWNlSWQpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gYC91c2VyL2FkZC1kaWNlYDtcbiAgICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICAgY29uc29sZS5sb2coJ3NhdmluZyBkaWNlIGlkIHRvIGRiJyk7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogdXJsU3RyaW5nLFxuICAgICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBcIl9pZFwiOiB0aGlzLl9pZCxcbiAgICAgICAgICAgIFwiZGVjaXNpb25faWRcIjogdGhpcy5kZWNpc2lvbl9pZFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSlcbiAgICAgICAgLmRvbmUoKCkgPT4gcmVzKCkpXG4gICAgICAgIC5mYWlsKGVyciA9PiByZWooZXJyKSk7XG4gICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGUgKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvdXNlcmA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgJ3VzZXJuYW1lJzogdXNlcm5hbWUsXG4gICAgICAgICAgICAncGFzc3dvcmQnOiBwYXNzd29yZFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSlcbiAgICAgICAgLmRvbmUoKHVzZXJfaWQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnc2lnbnVwIHN1Y2Nlc3NmdWwnKVxuICAgICAgICAgIHJlcyhVc2VyLnNpZ25Jbih1c2VybmFtZSwgcGFzc3dvcmQpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGVyciA9PiByZWooYGNhbm5vdCBjcmVhdGUgdXNlciAtIEVycm9yOiAke2Vycn1gKSk7XG4gICAgICB9KVxuICB9XG5cbiAgc3RhdGljIHNpZ25JbiAodXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gYC91c2VyL2xvZ2luYDtcbiAgICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAndXNlcm5hbWUnOiB1c2VybmFtZSxcbiAgICAgICAgICAgICdwYXNzd29yZCc6IHBhc3N3b3JkXG4gICAgICAgICAgfSksXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KVxuICAgICAgICAuZG9uZSgocGF5bG9hZCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdzaWduaW4gc3VjY2Vzc2Z1bCcpXG4gICAgICAgICAgY29uc29sZS5sb2cocGF5bG9hZClcbiAgICAgICAgICByZXMobmV3IFVzZXIoe1xuICAgICAgICAgICAgX2lkOiBwYXlsb2FkLl9pZCxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBwYXlsb2FkLnVzZXJuYW1lLFxuICAgICAgICAgICAgZGVjaXNpb25faWQ6IHBheWxvYWQuZGVjaXNpb25faWRcbiAgICAgICAgICB9KSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGVyciA9PiByZWooYGNhbm5vdCBzaWduIGluIC0gRXJyb3I6ICR7ZXJyfWApKTtcbiAgICAgIH0pXG4gIH1cblxuICBzdGF0aWMgbG9nT3V0ICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBgL3VzZXIvbG9nb3V0YDtcbiAgICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKChwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3NpZ25vdXQgc3VjY2Vzc2Z1bCcpXG4gICAgICAgICAgcmVzKClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGVyciA9PiByZWooYGNhbm5vdCBsb2cgb3V0IC0gRXJyb3I6ICR7ZXJyfWApKTtcbiAgICAgIH0pXG4gIH1cblxuICBzdGF0aWMgY2hlY2tBdXRoICgpIHtcbiAgICBjb25zb2xlLmxvZygndXNlciBtb2RlbCBpcyBjYWxsZWQnKVxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvdXNlci9jaGVjay1hdXRoZW50aWNhdGlvbmA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICB9KVxuICAgICAgICAuZG9uZSgocGF5bG9hZCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGF1dGhlbnRpY2F0aW9uIGlzIHN1Y2Nlc3NmdWwnKVxuICAgICAgICAgIHJlcyhwYXlsb2FkKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZXJyID0+IHJlaihgdXNlciBpcyBub3QgYXV0aGVudGljYXRlZCAtIEVycm9yOiAke2Vycn1gKSk7XG4gICAgICB9KVxuICB9XG5cbiAgc3RhdGljIHNhdmUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGRlbGV0ZSAoZGljZSkge31cblxuICBzdGF0aWMgZmluZCAocGFyYW1zKSB7fVxuXG59XG4iLCJpbXBvcnQgVXNlciBmcm9tICcuL1VzZXJNb2RlbCdcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG5jb25zdCBVU0VSX1NUQVRFID0gW107XG5cbmNvbnN0IGFkZFVzZXIgPSAodXNlcikgPT4ge1xuICBkZWJ1Zyh1c2VyKTtcbiAgVVNFUl9TVEFURS5wdXNoKHVzZXIpXG4gIGRlYnVnKCdVU0VSX1NUQVRFIGFkZGVkJyk7XG4gIGRlYnVnKFVTRVJfU1RBVEUpO1xufTtcblxuY29uc3QgcmVtb3ZlVXNlciA9ICgpID0+IHtcbiAgVVNFUl9TVEFURS5sZW5ndGggPSAwO1xuICBkZWJ1ZygnVVNFUl9TVEFURSByZW1vdmVkJyk7XG4gIGRlYnVnKFVTRVJfU1RBVEUpO1xufTtcblxuLy8gYWRkIGRpY2VfaWQgdG8gdXNlciBkZWNpc2lvbl9pZCBsaXN0XG5jb25zdCBhZGREaWNlSWQgPSAoZGljZUlkKSA9PiB7XG4gIGRlYnVnKCdhZGRpbmcgZGljZSBpZCB0byB1c2VyIHN0YXRlJylcbiAgVVNFUl9TVEFURVswXS5kZWNpc2lvbl9pZC5wdXNoKGRpY2VJZClcbn07XG5cbmNvbnN0IGdldFN0YXRlID0gKCkgPT4gVVNFUl9TVEFURVswXTtcblxuY29uc3QgZ2V0U3RhdGVBcnJheSA9ICgpID0+IFVTRVJfU1RBVEU7XG5cbmV4cG9ydCBkZWZhdWx0IHthZGRVc2VyLCByZW1vdmVVc2VyLCBhZGREaWNlSWQsIGdldFN0YXRlLCBnZXRTdGF0ZUFycmF5fTtcbiIsImltcG9ydCBTaWduVXBCdXR0b24gZnJvbSAnLi9TaWduVXBCdXR0b24nXG5pbXBvcnQgU2lnbkluQnV0dG9uIGZyb20gJy4vU2lnbkluQnV0dG9uJ1xuaW1wb3J0IFNpZ25PdXRCdXR0b24gZnJvbSAnLi9TaWduT3V0QnV0dG9uJ1xuaW1wb3J0IENvbXBvbmVudFN0YXRlIGZyb20gJy4vTW9kZWxzL0NvbXBvbmVudFN0YXRlJ1xuaW1wb3J0IFVzZXJTdGF0ZSBmcm9tICcuL01vZGVscy9Vc2VyU3RhdGUnXG5cbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG4vLyBjcmVhdGUgdGhlIGhvbWUgcGFnZVxuLy8gY29udHJvbCBmZXRjaGluZyBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGFuZCBpbnB1dCBhcyBodG1sXG5jb25zdCBhZGROYXZCYXJGdW5jdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgZGVidWcoJ2VxdWlwIG5hdiBiYXIgd2l0aCBmdW5jdGlvbmFsaXRpZXMgL3NpZ24tdXAgL3NpZ24taW4gL3NpZ24tb3V0Jyk7XG5cbiAgaWYoJCgnLmpzLXNpZ24tdXAnKSkge1xuICAgICQoJy5qcy1zaWduLXVwJykuY2xpY2soKGUpID0+IHtcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnc2lnbi11cC1mb3JtJylcbiAgICAgICAgLnRoZW4ocGF5bG9hZCA9PiBTaWduVXBCdXR0b24udmlld1NpZ25VcEZvcm0ocGF5bG9hZCkpXG4gICAgfSk7XG4gIH1cblxuICAkKCcuanMtc2lnbi1pbi1vdXQnKS5jbGljaygoZSkgPT4ge1xuICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkudGV4dCgpID09PSAnU0lHTiBJTicpIHtcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnc2lnbi1pbi1mb3JtJylcbiAgICAgICAgLnRoZW4ocGF5bG9hZCA9PiBTaWduSW5CdXR0b24udmlld1NpZ25JbkZvcm0ocGF5bG9hZCkpXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgU2lnbk91dEJ1dHRvbi5zaWduT3V0KCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmNvbnN0IGFkZFVzZXJQYWdlVG9OYXYgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgdXNlciA9IFVzZXJTdGF0ZS5nZXRTdGF0ZSgpO1xuICAkKCcuanMtdXNlci1wYWdlJykudGV4dCh1c2VyLnVzZXJuYW1lKTtcbiAgJCgnLmpzLXVzZXItcGFnZScpLmNsaWNrKChlKSA9PiB7XG4gICAgLy8gZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgLy8gcGFnZShgL3Byb2ZpbGVgKVxuICB9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge2FkZE5hdkJhckZ1bmN0aW9ucywgYWRkVXNlclBhZ2VUb05hdn1cbiIsImltcG9ydCBEZWNpc2lvbkxpc3RTdGF0ZSBmcm9tICcuL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZSdcbmltcG9ydCBEaWNlIGZyb20gJy4vTW9kZWxzL0RpY2VNb2RlbCdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuXG5jb25zdCBzYXZlRGljZSA9IGZ1bmN0aW9uKGRpY2VJbnN0YW5jZSwgdGl0bGUsIGRlc2NyaXB0aW9uKSB7XG4gIGlmKGRpY2VJbnN0YW5jZS5vcHRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgIGFsZXJ0KCdwbGVhc2UgaW5wdXQgc29tZSBvcHRpb25zJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRpdGxlID09PSAnJyB8fCBkZXNjcmlwdGlvbiA9PT0gJycpIHtcbiAgICBhbGVydCgncGxlYXNlIGlucHV0IGJvdGggdGl0bGUgYW5kIGRlc2NyaXB0aW9uJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdXNlciA9IFVzZXJTdGF0ZS5nZXRTdGF0ZSgpO1xuICBEaWNlLmNyZWF0ZSh7XG4gICAgICAnZGVjaXNpb24nOiB0aXRsZSxcbiAgICAgICdkZXNjcmlwdGlvbic6IGRlc2NyaXB0aW9uLFxuICAgICAgJ29wdGlvbnMnOiBkaWNlSW5zdGFuY2Uub3B0aW9uc1xuICAgIH0pXG4gICAgLnRoZW4oKG5ld0RpY2UpID0+IHtcbiAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyIGV4aXN0JylcbiAgICAgICAgY29uc29sZS5sb2codXNlcilcbiAgICAgICAgLy8gVXNlclN0YXRlLmFkZERpY2VJZChuZXdEaWNlLl9pZCk7XG4gICAgICAgIHVzZXIuc2F2ZURpY2VJZFRvRGIobmV3RGljZS5faWQpO1xuICAgICAgfVxuICAgICAgLy8gRGVjaXNpb25MaXN0U3RhdGUuYWRkRGljZShuZXdEaWNlKTtcbiAgICAgIHBhZ2UoYC9kaWNlLyR7bmV3RGljZS5faWR9YCk7XG4gICAgfSlcbiAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgYWxlcnQoJ2Nhbm5vdCB1cGRhdGUgZGljZSBhdCB0aGlzIHRpbWUnKVxuICAgIH0pXG59XG5cbmNvbnN0IHVwZGF0ZURpY2UgPSBmdW5jdGlvbihkaWNlSW5zdGFuY2UsIHRpdGxlLCBkZXNjcmlwdGlvbikge1xuICBpZihkaWNlSW5zdGFuY2Uub3B0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICBhbGVydCgncGxlYXNlIGlucHV0IHNvbWUgb3B0aW9ucycpXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRpdGxlID09PSAnJyB8fCBkZXNjcmlwdGlvbiA9PT0gJycpIHtcbiAgICBhbGVydCgncGxlYXNlIGlucHV0IGJvdGggdGl0bGUgYW5kIGRlc2NyaXB0aW9uJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZGljZUluc3RhbmNlLnNhdmVUb0RiKHRpdGxlLCBkZXNjcmlwdGlvbilcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBwYWdlKGAvZGljZS8ke2RpY2VJbnN0YW5jZS5faWR9YCk7XG4gICAgfSlcbiAgICAuY2F0Y2goKGVycikgPT4gYWxlcnQoJ2Nhbm5vdCB1cGRhdGUgZGljZSBhdCB0aGlzIHRpbWUnKSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge3NhdmVEaWNlLCB1cGRhdGVEaWNlfVxuIiwiaW1wb3J0IFVzZXIgZnJvbSAnLi9Nb2RlbHMvVXNlck1vZGVsJ1xuaW1wb3J0IFVzZXJTdGF0ZSBmcm9tICcuL01vZGVscy9Vc2VyU3RhdGUnXG5pbXBvcnQgTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3RvciBmcm9tICcuL05hdmlnYXRpb25WaWV3Q29uc3RydWN0b3InXG5cbmNvbnN0IHZpZXdTaWduSW5Gb3JtID0gZnVuY3Rpb24oc2lnbkluRm9ybUNvbXBvbmVudCkge1xuICBjb25zb2xlLmxvZygnYWRkIHNpZ24gdXAgZm9ybSB3aGVuIGNsaWNrZWQnKTtcblxuICAkKCdoZWFkZXInKS5hcHBlbmQoc2lnbkluRm9ybUNvbXBvbmVudCk7XG5cbiAgJCgnLmJsYWNrLW91dCcpLmNsaWNrKGUgPT4ge1xuICAgICQoZS5jdXJyZW50VGFyZ2V0KS5yZW1vdmUoKTtcbiAgICAkKCcuanMtc2lnbi1pbi1mb3JtJykucmVtb3ZlKCk7XG4gIH0pXG5cbiAgJCgnLmpzLXNpZ24taW4tZm9ybScpLnN1Ym1pdChlID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBjb25zdCB1c2VybmFtZSA9ICQoJy5qcy1zaWduLWluLWZvcm0gOmlucHV0W25hbWU9dXNlcm5hbWVdJykudmFsKCk7XG4gICAgY29uc3QgcGFzc3dvcmQgPSAkKCcuanMtc2lnbi1pbi1mb3JtIDppbnB1dFtuYW1lPXBhc3N3b3JkXScpLnZhbCgpO1xuXG4gICAgaWYgKCQoJy5qcy1hbGVydC1zaWduLWluJykpIHtcbiAgICAgICQoJy5qcy1hbGVydC1zaWduLWluJykucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgaWYgKCF1c2VybmFtZSB8fCAhcGFzc3dvcmQpIHtcbiAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJqcy1hbGVydC1zaWduLWluXCI+cGxlYXNlIGlucHV0IGJvdGggdXNlcm5hbWUgYW5kIHBhc3N3b3JkPC9kaXY+Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2codXNlcm5hbWUsIHBhc3N3b3JkKVxuXG4gICAgcmV0dXJuIFVzZXIuc2lnbkluKHVzZXJuYW1lLCBwYXNzd29yZClcbiAgICAgIC50aGVuKChuZXdVc2VyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzJyk7XG4gICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5yZW1vdmUoKTtcbiAgICAgICAgJCgnLmJsYWNrLW91dCcpLnJlbW92ZSgpO1xuICAgICAgICByZXR1cm4gbmV3VXNlcjtcbiAgICAgIH0pXG4gICAgICAudGhlbigobmV3VXNlcikgPT4ge1xuICAgICAgICBVc2VyU3RhdGUuYWRkVXNlcihuZXdVc2VyKTtcbiAgICAgICAgcGFnZSgnLycpO1xuICAgICAgICBsb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG4gICAgICAgIC8vICQoJy5qcy1zaWduLWluLW91dCcpLnRleHQoJ3NpZ24gb3V0Jyk7XG4gICAgICAgIC8vICQoJy5qcy1zaWduLXVwJykuaGlkZSgpO1xuICAgICAgfSlcbiAgICAgIC8vIC50aGVuKCgpID0+IHtcbiAgICAgIC8vICAgTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5hZGRVc2VyUGFnZVRvTmF2KClcbiAgICAgIC8vIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnZmFpbCcpO1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAkKGUuY3VycmVudFRhcmdldCkuYXBwZW5kKCc8ZGl2PnBsZWFzZSB0cnkgYWdhaW48L2Rpdj4nKVxuICAgICAgfSlcbiAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge3ZpZXdTaWduSW5Gb3JtfVxuIiwiaW1wb3J0IFVzZXIgZnJvbSAnLi9Nb2RlbHMvVXNlck1vZGVsJ1xuaW1wb3J0IFVzZXJTdGF0ZSBmcm9tICcuL01vZGVscy9Vc2VyU3RhdGUnXG5cbmNvbnN0IHNpZ25PdXQgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ3NpZ24gdXNlciBvdXQgd2hlbiBjbGlja2VkJyk7XG5cbiAgVXNlclN0YXRlLnJlbW92ZVVzZXIoKTtcbiAgVXNlci5sb2dPdXQoKTtcbiAgbG9jYXRpb24ucmVsb2FkKHRydWUpXG4gIHBhZ2UoJy8nKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7c2lnbk91dH1cbiIsImltcG9ydCBVc2VyIGZyb20gJy4vTW9kZWxzL1VzZXJNb2RlbCdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuaW1wb3J0IE5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9OYXZpZ2F0aW9uVmlld0NvbnN0cnVjdG9yJ1xuXG5jb25zdCB2aWV3U2lnblVwRm9ybSA9IGZ1bmN0aW9uKHNpZ25VcEZvcm1Db21wb25lbnQpIHtcbiAgY29uc29sZS5sb2coJ2FkZCBzaWduIHVwIGZvcm0gd2hlbiBjbGlja2VkJyk7XG5cbiAgJCgnaGVhZGVyJykuYXBwZW5kKHNpZ25VcEZvcm1Db21wb25lbnQpO1xuXG4gICQoJy5ibGFjay1vdXQnKS5jbGljayhlID0+IHtcbiAgICAkKGUuY3VycmVudFRhcmdldCkucmVtb3ZlKCk7XG4gICAgJCgnLmpzLXNpZ24tdXAtZm9ybScpLnJlbW92ZSgpO1xuICB9KVxuXG4gICQoJy5qcy1zaWduLXVwLWZvcm0nKS5zdWJtaXQoZSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgY29uc3QgdXNlcm5hbWUgPSAkKCcuanMtc2lnbi11cC1mb3JtIDppbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCgpO1xuICAgIGNvbnN0IHBhc3N3b3JkID0gJCgnLmpzLXNpZ24tdXAtZm9ybSA6aW5wdXRbbmFtZT1wYXNzd29yZF0nKS52YWwoKTtcblxuICAgIGlmICgkKCcuanMtYWxlcnQtc2lnbi11cCcpKSB7XG4gICAgICAkKCcuanMtYWxlcnQtc2lnbi11cCcpLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGlmICghdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG4gICAgICAkKGUuY3VycmVudFRhcmdldCkuYXBwZW5kKCc8ZGl2IGNsYXNzPVwianMtYWxlcnQtc2lnbi11cFwiPnBsZWFzZSBpbnB1dCBib3RoIHVzZXJuYW1lIGFuZCBwYXNzd29yZDwvZGl2PicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKHVzZXJuYW1lLCBwYXNzd29yZClcblxuICAgIHJldHVybiBVc2VyLmNyZWF0ZSh1c2VybmFtZSwgcGFzc3dvcmQpXG4gICAgICAudGhlbigobmV3VXNlcikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2VzcycpO1xuICAgICAgICBVc2VyU3RhdGUuYWRkVXNlcihuZXdVc2VyKTtcbiAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLnJlbW92ZSgpO1xuICAgICAgICAkKCcuYmxhY2stb3V0JykucmVtb3ZlKCk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyAkKCcuanMtc2lnbi1pbi1vdXQnKS50ZXh0KCdTSUdOIE9VVCcpO1xuICAgICAgICAvLyAkKCcuanMtc2lnbi11cCcpLmhpZGUoKTtcbiAgICAgICAgLy8gTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5hZGRVc2VyUGFnZVRvTmF2KCk7XG4gICAgICAgIHBhZ2UoJy8nKTtcbiAgICAgICAgbG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWlsJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5hcHBlbmQoJzxkaXY+cGxlYXNlIHRyeSBhZ2FpbjwvZGl2PicpXG4gICAgICB9KVxuICB9KVxufVxuXG5leHBvcnQgZGVmYXVsdCB7dmlld1NpZ25VcEZvcm19XG4iLCJpbXBvcnQgRGVjaXNpb25MaXN0U3RhdGUgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQgQ29tcG9uZW50U3RhdGUgZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQgRGVjaXNpb25DYXJkVmlldyBmcm9tICcuL0RlY2lzaW9uQ2FyZFZpZXcnXG5pbXBvcnQgVXRpbEZ1bmMgZnJvbSAnLi9VdGlscy9DbGVhckhUTUwnXG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSdcblxuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdkaWNlJyk7XG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IHZpZXdVc2VyUGFnZSA9IGZ1bmN0aW9uKGN0eCkge1xuICBjb25zdCBuYW1lID0gY3R4LnBhcmFtcy51c2VybmFtZTtcbiAgY29uc3QgdXNlciA9IFVzZXJTdGF0ZS5nZXRTdGF0ZSgpO1xuICBkZWJ1ZygnVXNlclBhZ2VWaWV3Q29uc3RydWN0b3Igc3RhcnRpbmcnKTtcblxuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgRGVjaXNpb25MaXN0U3RhdGUuZ2V0RGljZSh1c2VyLmRlY2lzaW9uX2lkKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGVjaXNpb24tY2FyZCcpXG4gICAgXSlcbiAgICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKHBheWxvYWRbMF0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCd0aGVyZSBpcyBubyBkYXRhJyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gZGF0YScpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIFV0aWxGdW5jLmNsZWFySHRtbCgnanMtbWFpbi1jb250ZW50Jyk7XG4gICAgICAgIHBheWxvYWRbMF0uZm9yRWFjaChkaWNlID0+IHtcbiAgICAgICAgICBEZWNpc2lvbkNhcmRWaWV3LmNyZWF0ZURlY2lzaW9uQ2FyZChkaWNlLCBwYXlsb2FkWzFdKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHt2aWV3VXNlclBhZ2V9XG4iLCJjb25zdCBjbGVhckh0bWwgPSBmdW5jdGlvbihlbGVtKSB7XG4gICQoYC4ke2VsZW19YCkuaHRtbCgnJyk7XG4gIHJldHVybjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtjbGVhckh0bWx9O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0UmFuZG9tTnVtYmVyKG1pbiwgbWF4KSB7XG4gIG1pbiA9IE1hdGguY2VpbChtaW4pO1xuICBtYXggPSBNYXRoLmZsb29yKG1heCk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluKTtcbn07XG5cbi8vIHByb3ZpZGVkIGJ5OlxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWF0aC9yYW5kb21cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlcGxhY2VBbGwoc3RyLCBtYXBPYmope1xuICB2YXIgcmUgPSBuZXcgUmVnRXhwKE9iamVjdC5rZXlzKG1hcE9iaikuam9pbihcInxcIiksXCJnaVwiKTtcblxuICByZXR1cm4gc3RyLnJlcGxhY2UocmUsIGZ1bmN0aW9uKG1hdGNoZWQpe1xuICAgIHJldHVybiBtYXBPYmpbbWF0Y2hlZC50b0xvd2VyQ2FzZSgpXTtcbiAgfSk7XG59XG5cbi8vIHByb3ZpZGVkIGJ5OlxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTU2MDQxNDAvcmVwbGFjZS1tdWx0aXBsZS1zdHJpbmdzLXdpdGgtbXVsdGlwbGUtb3RoZXItc3RyaW5nc1xuIiwiZXhwb3J0cy5QT1JUID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCA4MDgwO1xuXG5leHBvcnRzLkJBU0VfVVJMID0gJ2xvY2FsaG9zdCc7XG4iLCJpbXBvcnQgTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3RvciBmcm9tICcuL05hdmlnYXRpb25WaWV3Q29uc3RydWN0b3InO1xuaW1wb3J0IEhvbWVWaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9Ib21lVmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBEaWNlVmlld0NvbnN0cnVjdG9yIGZyb20gJy4vRGljZVBhZ2VWaWV3Q29uc3RydWN0b3InO1xuaW1wb3J0IERpY2VFZGl0Vmlld0NvbnN0cnVjdG9yIGZyb20gJy4vRGljZUVkaXRWaWV3Q29uc3RydWN0b3InO1xuaW1wb3J0IERpY2VDcmVhdGVWaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9EaWNlQ3JlYXRlVmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBVc2VyUGFnZVZpZXdDb25zdHJ1Y3RvciBmcm9tICcuL1VzZXJQYWdlVmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJztcbmltcG9ydCBVc2VyIGZyb20gJy4vTW9kZWxzL1VzZXJNb2RlbCc7XG5pbXBvcnQgcGFnZSBmcm9tICdwYWdlJztcblxuaWYgKHVzZXJBdXRoID09PSAnYXV0aCcpIHtcbiAgY29uc29sZS5sb2coJ2NoZWNraW5nIHVzZXIgYXV0aGVudGljYXRpb24nKVxuICBVc2VyLmNoZWNrQXV0aCgpXG4gICAgLnRoZW4oKHVzZXJPYmplY3QpID0+IHtcbiAgICAgIFVzZXJTdGF0ZS5yZW1vdmVVc2VyKCk7XG4gICAgICBVc2VyU3RhdGUuYWRkVXNlcihuZXcgVXNlcih1c2VyT2JqZWN0KSk7XG4gICAgfSlcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnY2FsbGluZyBuYXZpZ2F0aW9uYWwgdmlldyBjb25zdHJ1Y3RvciBhZ2FpbicpXG4gICAgICBOYXZpZ2F0aW9uVmlld0NvbnN0cnVjdG9yLmFkZFVzZXJQYWdlVG9OYXYoKVxuICAgIH0pXG4gICAgLmNhdGNoKCgpID0+IHtcbiAgICAgIHVzZXJBdXRoID0gdW5hdXRoZWRcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQodHJ1ZSk7XG4gICAgfSlcbn1cblxuTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5hZGROYXZCYXJGdW5jdGlvbnMoKTtcblxuLy8gaW5pdGlhbGl6ZSBwYWdlLmpzIGZvciByb3V0aW5nIGluIHRoZSBmcm9udC1lbmRcbnBhZ2UoJy8nLCBIb21lVmlld0NvbnN0cnVjdG9yLnZpZXdIb21lKTtcbnBhZ2UoJy9kaWNlL25ldycsIERpY2VDcmVhdGVWaWV3Q29uc3RydWN0b3IubmV3RGljZSk7XG5wYWdlKCcvZGljZS86ZGVjaXNpb25JZCcsIERpY2VWaWV3Q29uc3RydWN0b3IuZGljZVZpZXcpO1xucGFnZSgnL2RpY2UvZWRpdC86ZGVjaXNpb25JZCcsIERpY2VFZGl0Vmlld0NvbnN0cnVjdG9yLmRpY2VFZGl0Vmlldyk7XG4vLyBwYWdlKCcvYWJvdXQnLCB2aWV3QWJvdXQpO1xuLy8gcGFnZSgnL25ldycsIGNyZWF0ZURpY2UpO1xucGFnZSgnL3Byb2ZpbGUnLCBVc2VyUGFnZVZpZXdDb25zdHJ1Y3Rvci52aWV3VXNlclBhZ2UpO1xuLy8gcGFnZSgnLzp1c2VybmFtZS86ZGVjaXNpb25JZCcsIHZpZXdEaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZWRpdCcsIGVkaXREaWNlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQvZGVsZXRlJywgZGVsZXRlRGljZSk7XG5cbnBhZ2UoKTtcblxuY29uc29sZS5sb2codXNlckF1dGgpXG4iXX0=
