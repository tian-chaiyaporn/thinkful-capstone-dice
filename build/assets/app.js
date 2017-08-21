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
  $('.js-dice-animation').append(diceAnimation);
  $('.js-roll').click(function (e) {
    e.stopImmediatePropagation();
    dice.roll().then(function (result) {
      return alert(result.content);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZGVidWcvc3JjL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGFnZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYWdlL25vZGVfbW9kdWxlcy9wYXRoLXRvLXJlZ2V4cC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92NC5qcyIsInNyYy9zcGEvanMvQWRkQnV0dG9uLmpzIiwic3JjL3NwYS9qcy9EZWNpc2lvbkNhcmRWaWV3LmpzIiwic3JjL3NwYS9qcy9EZWxldGVCdXR0b24uanMiLCJzcmMvc3BhL2pzL0RpY2VDcmVhdGVWaWV3LmpzIiwic3JjL3NwYS9qcy9EaWNlQ3JlYXRlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9EaWNlRWRpdFZpZXcuanMiLCJzcmMvc3BhL2pzL0RpY2VFZGl0Vmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9EaWNlUGFnZVZpZXcuanMiLCJzcmMvc3BhL2pzL0RpY2VQYWdlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9Ib21lVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9Nb2RlbHMvQ29tcG9uZW50U3RhdGUuanMiLCJzcmMvc3BhL2pzL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZS5qcyIsInNyYy9zcGEvanMvTW9kZWxzL0RpY2VNb2RlbC5qcyIsInNyYy9zcGEvanMvTW9kZWxzL1VzZXJNb2RlbC5qcyIsInNyYy9zcGEvanMvTW9kZWxzL1VzZXJTdGF0ZS5qcyIsInNyYy9zcGEvanMvTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5qcyIsInNyYy9zcGEvanMvU2F2ZUJ1dHRvbi5qcyIsInNyYy9zcGEvanMvU2lnbkluQnV0dG9uLmpzIiwic3JjL3NwYS9qcy9TaWduT3V0QnV0dG9uLmpzIiwic3JjL3NwYS9qcy9TaWduVXBCdXR0b24uanMiLCJzcmMvc3BhL2pzL1VzZXJQYWdlVmlld0NvbnN0cnVjdG9yLmpzIiwic3JjL3NwYS9qcy9VdGlscy9DbGVhckhUTUwuanMiLCJzcmMvc3BhL2pzL1V0aWxzL1JhbmRvbU5HZW5lcmF0b3IuanMiLCJzcmMvc3BhL2pzL1V0aWxzL1N0cmluZ1JlcGxhY2VyLmpzIiwic3JjL3NwYS9qcy9VdGlscy9jb25zdGFudHMuanMiLCJzcmMvc3BhL2pzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Q3ZCLFVBQVEsR0FBUixDQUFZLDhCQUFaO0FBQ0Esc0JBQUssU0FBTCxHQUNHLElBREgsQ0FDUSxVQUFDLFVBQUQsRUFBZ0I7QUFDcEIsd0JBQVUsVUFBVjtBQUNBLHdCQUFVLE9BQVYsQ0FBa0Isd0JBQVMsVUFBVCxDQUFsQjtBQUNELEdBSkgsRUFLRyxJQUxILENBS1EsWUFBTTtBQUNWLFlBQVEsR0FBUixDQUFZLDZDQUFaO0FBQ0Esd0NBQTBCLGdCQUExQjtBQUNELEdBUkgsRUFTRyxLQVRILENBU1MsWUFBTTtBQUNYLGVBQVcsUUFBWDtBQUNBLFdBQU8sUUFBUCxDQUFnQixNQUFoQixDQUF1QixJQUF2QjtBQUNELEdBWkg7QUFhRDs7QUFFRCxvQ0FBMEIsa0JBQTFCOztBQUVBO0FBQ0Esb0JBQUssR0FBTCxFQUFVLDhCQUFvQixRQUE5QjtBQUNBLG9CQUFLLFdBQUwsRUFBa0Isb0NBQTBCLE9BQTVDO0FBQ0Esb0JBQUssbUJBQUwsRUFBMEIsa0NBQW9CLFFBQTlDO0FBQ0Esb0JBQUssd0JBQUwsRUFBK0Isa0NBQXdCLFlBQXZEO0FBQ0E7QUFDQTtBQUNBLG9CQUFLLFVBQUwsRUFBaUIsa0NBQXdCLFlBQXpDO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLFFBQVEsR0FBUixDQUFZLFFBQVoiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gTkI6IEluIGFuIEVsZWN0cm9uIHByZWxvYWQgc2NyaXB0LCBkb2N1bWVudCB3aWxsIGJlIGRlZmluZWQgYnV0IG5vdCBmdWxseVxuICAvLyBpbml0aWFsaXplZC4gU2luY2Ugd2Uga25vdyB3ZSdyZSBpbiBDaHJvbWUsIHdlJ2xsIGp1c3QgZGV0ZWN0IHRoaXMgY2FzZVxuICAvLyBleHBsaWNpdGx5XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cucHJvY2VzcyAmJiB3aW5kb3cucHJvY2Vzcy50eXBlID09PSAncmVuZGVyZXInKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBpcyB3ZWJraXQ/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzE2NDU5NjA2LzM3Njc3M1xuICAvLyBkb2N1bWVudCBpcyB1bmRlZmluZWQgaW4gcmVhY3QtbmF0aXZlOiBodHRwczovL2dpdGh1Yi5jb20vZmFjZWJvb2svcmVhY3QtbmF0aXZlL3B1bGwvMTYzMlxuICByZXR1cm4gKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuV2Via2l0QXBwZWFyYW5jZSkgfHxcbiAgICAvLyBpcyBmaXJlYnVnPyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zOTgxMjAvMzc2NzczXG4gICAgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5jb25zb2xlICYmICh3aW5kb3cuY29uc29sZS5maXJlYnVnIHx8ICh3aW5kb3cuY29uc29sZS5leGNlcHRpb24gJiYgd2luZG93LmNvbnNvbGUudGFibGUpKSkgfHxcbiAgICAvLyBpcyBmaXJlZm94ID49IHYzMT9cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1Rvb2xzL1dlYl9Db25zb2xlI1N0eWxpbmdfbWVzc2FnZXNcbiAgICAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCAmJiBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSkgfHxcbiAgICAvLyBkb3VibGUgY2hlY2sgd2Via2l0IGluIHVzZXJBZ2VudCBqdXN0IGluIGNhc2Ugd2UgYXJlIGluIGEgd29ya2VyXG4gICAgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci51c2VyQWdlbnQgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpLm1hdGNoKC9hcHBsZXdlYmtpdFxcLyhcXGQrKS8pKTtcbn1cblxuLyoqXG4gKiBNYXAgJWogdG8gYEpTT04uc3RyaW5naWZ5KClgLCBzaW5jZSBubyBXZWIgSW5zcGVjdG9ycyBkbyB0aGF0IGJ5IGRlZmF1bHQuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzLmogPSBmdW5jdGlvbih2KSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHYpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gJ1tVbmV4cGVjdGVkSlNPTlBhcnNlRXJyb3JdOiAnICsgZXJyLm1lc3NhZ2U7XG4gIH1cbn07XG5cblxuLyoqXG4gKiBDb2xvcml6ZSBsb2cgYXJndW1lbnRzIGlmIGVuYWJsZWQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBmb3JtYXRBcmdzKGFyZ3MpIHtcbiAgdmFyIHVzZUNvbG9ycyA9IHRoaXMudXNlQ29sb3JzO1xuXG4gIGFyZ3NbMF0gPSAodXNlQ29sb3JzID8gJyVjJyA6ICcnKVxuICAgICsgdGhpcy5uYW1lc3BhY2VcbiAgICArICh1c2VDb2xvcnMgPyAnICVjJyA6ICcgJylcbiAgICArIGFyZ3NbMF1cbiAgICArICh1c2VDb2xvcnMgPyAnJWMgJyA6ICcgJylcbiAgICArICcrJyArIGV4cG9ydHMuaHVtYW5pemUodGhpcy5kaWZmKTtcblxuICBpZiAoIXVzZUNvbG9ycykgcmV0dXJuO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncy5zcGxpY2UoMSwgMCwgYywgJ2NvbG9yOiBpbmhlcml0JylcblxuICAvLyB0aGUgZmluYWwgXCIlY1wiIGlzIHNvbWV3aGF0IHRyaWNreSwgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBvdGhlclxuICAvLyBhcmd1bWVudHMgcGFzc2VkIGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlICVjLCBzbyB3ZSBuZWVkIHRvXG4gIC8vIGZpZ3VyZSBvdXQgdGhlIGNvcnJlY3QgaW5kZXggdG8gaW5zZXJ0IHRoZSBDU1MgaW50b1xuICB2YXIgaW5kZXggPSAwO1xuICB2YXIgbGFzdEMgPSAwO1xuICBhcmdzWzBdLnJlcGxhY2UoLyVbYS16QS1aJV0vZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICBpZiAoJyUlJyA9PT0gbWF0Y2gpIHJldHVybjtcbiAgICBpbmRleCsrO1xuICAgIGlmICgnJWMnID09PSBtYXRjaCkge1xuICAgICAgLy8gd2Ugb25seSBhcmUgaW50ZXJlc3RlZCBpbiB0aGUgKmxhc3QqICVjXG4gICAgICAvLyAodGhlIHVzZXIgbWF5IGhhdmUgcHJvdmlkZWQgdGhlaXIgb3duKVxuICAgICAgbGFzdEMgPSBpbmRleDtcbiAgICB9XG4gIH0pO1xuXG4gIGFyZ3Muc3BsaWNlKGxhc3RDLCAwLCBjKTtcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG5cbiAgLy8gSWYgZGVidWcgaXNuJ3Qgc2V0IGluIExTLCBhbmQgd2UncmUgaW4gRWxlY3Ryb24sIHRyeSB0byBsb2FkICRERUJVR1xuICBpZiAoIXIgJiYgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmICdlbnYnIGluIHByb2Nlc3MpIHtcbiAgICByID0gcHJvY2Vzcy5lbnYuREVCVUc7XG4gIH1cblxuICByZXR1cm4gcjtcbn1cblxuLyoqXG4gKiBFbmFibGUgbmFtZXNwYWNlcyBsaXN0ZWQgaW4gYGxvY2FsU3RvcmFnZS5kZWJ1Z2AgaW5pdGlhbGx5LlxuICovXG5cbmV4cG9ydHMuZW5hYmxlKGxvYWQoKSk7XG5cbi8qKlxuICogTG9jYWxzdG9yYWdlIGF0dGVtcHRzIHRvIHJldHVybiB0aGUgbG9jYWxzdG9yYWdlLlxuICpcbiAqIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2Ugc2FmYXJpIHRocm93c1xuICogd2hlbiBhIHVzZXIgZGlzYWJsZXMgY29va2llcy9sb2NhbHN0b3JhZ2VcbiAqIGFuZCB5b3UgYXR0ZW1wdCB0byBhY2Nlc3MgaXQuXG4gKlxuICogQHJldHVybiB7TG9jYWxTdG9yYWdlfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbG9jYWxzdG9yYWdlKCkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlO1xuICB9IGNhdGNoIChlKSB7fVxufVxuIiwiXG4vKipcbiAqIFRoaXMgaXMgdGhlIGNvbW1vbiBsb2dpYyBmb3IgYm90aCB0aGUgTm9kZS5qcyBhbmQgd2ViIGJyb3dzZXJcbiAqIGltcGxlbWVudGF0aW9ucyBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZURlYnVnLmRlYnVnID0gY3JlYXRlRGVidWdbJ2RlZmF1bHQnXSA9IGNyZWF0ZURlYnVnO1xuZXhwb3J0cy5jb2VyY2UgPSBjb2VyY2U7XG5leHBvcnRzLmRpc2FibGUgPSBkaXNhYmxlO1xuZXhwb3J0cy5lbmFibGUgPSBlbmFibGU7XG5leHBvcnRzLmVuYWJsZWQgPSBlbmFibGVkO1xuZXhwb3J0cy5odW1hbml6ZSA9IHJlcXVpcmUoJ21zJyk7XG5cbi8qKlxuICogVGhlIGN1cnJlbnRseSBhY3RpdmUgZGVidWcgbW9kZSBuYW1lcywgYW5kIG5hbWVzIHRvIHNraXAuXG4gKi9cblxuZXhwb3J0cy5uYW1lcyA9IFtdO1xuZXhwb3J0cy5za2lwcyA9IFtdO1xuXG4vKipcbiAqIE1hcCBvZiBzcGVjaWFsIFwiJW5cIiBoYW5kbGluZyBmdW5jdGlvbnMsIGZvciB0aGUgZGVidWcgXCJmb3JtYXRcIiBhcmd1bWVudC5cbiAqXG4gKiBWYWxpZCBrZXkgbmFtZXMgYXJlIGEgc2luZ2xlLCBsb3dlciBvciB1cHBlci1jYXNlIGxldHRlciwgaS5lLiBcIm5cIiBhbmQgXCJOXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXMgbG9nIHRpbWVzdGFtcC5cbiAqL1xuXG52YXIgcHJldlRpbWU7XG5cbi8qKlxuICogU2VsZWN0IGEgY29sb3IuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcihuYW1lc3BhY2UpIHtcbiAgdmFyIGhhc2ggPSAwLCBpO1xuXG4gIGZvciAoaSBpbiBuYW1lc3BhY2UpIHtcbiAgICBoYXNoICA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgbmFtZXNwYWNlLmNoYXJDb2RlQXQoaSk7XG4gICAgaGFzaCB8PSAwOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcbiAgfVxuXG4gIHJldHVybiBleHBvcnRzLmNvbG9yc1tNYXRoLmFicyhoYXNoKSAlIGV4cG9ydHMuY29sb3JzLmxlbmd0aF07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgZGVidWdnZXIgd2l0aCB0aGUgZ2l2ZW4gYG5hbWVzcGFjZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZVxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGNyZWF0ZURlYnVnKG5hbWVzcGFjZSkge1xuXG4gIGZ1bmN0aW9uIGRlYnVnKCkge1xuICAgIC8vIGRpc2FibGVkP1xuICAgIGlmICghZGVidWcuZW5hYmxlZCkgcmV0dXJuO1xuXG4gICAgdmFyIHNlbGYgPSBkZWJ1ZztcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gdHVybiB0aGUgYGFyZ3VtZW50c2AgaW50byBhIHByb3BlciBBcnJheVxuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBhcmdzWzBdID0gZXhwb3J0cy5jb2VyY2UoYXJnc1swXSk7XG5cbiAgICBpZiAoJ3N0cmluZycgIT09IHR5cGVvZiBhcmdzWzBdKSB7XG4gICAgICAvLyBhbnl0aGluZyBlbHNlIGxldCdzIGluc3BlY3Qgd2l0aCAlT1xuICAgICAgYXJncy51bnNoaWZ0KCclTycpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXpBLVolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICAvLyBhcHBseSBlbnYtc3BlY2lmaWMgZm9ybWF0dGluZyAoY29sb3JzLCBldGMuKVxuICAgIGV4cG9ydHMuZm9ybWF0QXJncy5jYWxsKHNlbGYsIGFyZ3MpO1xuXG4gICAgdmFyIGxvZ0ZuID0gZGVidWcubG9nIHx8IGV4cG9ydHMubG9nIHx8IGNvbnNvbGUubG9nLmJpbmQoY29uc29sZSk7XG4gICAgbG9nRm4uYXBwbHkoc2VsZiwgYXJncyk7XG4gIH1cblxuICBkZWJ1Zy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gIGRlYnVnLmVuYWJsZWQgPSBleHBvcnRzLmVuYWJsZWQobmFtZXNwYWNlKTtcbiAgZGVidWcudXNlQ29sb3JzID0gZXhwb3J0cy51c2VDb2xvcnMoKTtcbiAgZGVidWcuY29sb3IgPSBzZWxlY3RDb2xvcihuYW1lc3BhY2UpO1xuXG4gIC8vIGVudi1zcGVjaWZpYyBpbml0aWFsaXphdGlvbiBsb2dpYyBmb3IgZGVidWcgaW5zdGFuY2VzXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgZXhwb3J0cy5pbml0KSB7XG4gICAgZXhwb3J0cy5pbml0KGRlYnVnKTtcbiAgfVxuXG4gIHJldHVybiBkZWJ1Zztcbn1cblxuLyoqXG4gKiBFbmFibGVzIGEgZGVidWcgbW9kZSBieSBuYW1lc3BhY2VzLiBUaGlzIGNhbiBpbmNsdWRlIG1vZGVzXG4gKiBzZXBhcmF0ZWQgYnkgYSBjb2xvbiBhbmQgd2lsZGNhcmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZShuYW1lc3BhY2VzKSB7XG4gIGV4cG9ydHMuc2F2ZShuYW1lc3BhY2VzKTtcblxuICBleHBvcnRzLm5hbWVzID0gW107XG4gIGV4cG9ydHMuc2tpcHMgPSBbXTtcblxuICB2YXIgc3BsaXQgPSAodHlwZW9mIG5hbWVzcGFjZXMgPT09ICdzdHJpbmcnID8gbmFtZXNwYWNlcyA6ICcnKS5zcGxpdCgvW1xccyxdKy8pO1xuICB2YXIgbGVuID0gc3BsaXQubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoIXNwbGl0W2ldKSBjb250aW51ZTsgLy8gaWdub3JlIGVtcHR5IHN0cmluZ3NcbiAgICBuYW1lc3BhY2VzID0gc3BsaXRbaV0ucmVwbGFjZSgvXFwqL2csICcuKj8nKTtcbiAgICBpZiAobmFtZXNwYWNlc1swXSA9PT0gJy0nKSB7XG4gICAgICBleHBvcnRzLnNraXBzLnB1c2gobmV3IFJlZ0V4cCgnXicgKyBuYW1lc3BhY2VzLnN1YnN0cigxKSArICckJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBleHBvcnRzLm5hbWVzLnB1c2gobmV3IFJlZ0V4cCgnXicgKyBuYW1lc3BhY2VzICsgJyQnKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRGlzYWJsZSBkZWJ1ZyBvdXRwdXQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBkaXNhYmxlKCkge1xuICBleHBvcnRzLmVuYWJsZSgnJyk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBtb2RlIG5hbWUgaXMgZW5hYmxlZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGVkKG5hbWUpIHtcbiAgdmFyIGksIGxlbjtcbiAgZm9yIChpID0gMCwgbGVuID0gZXhwb3J0cy5za2lwcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChleHBvcnRzLnNraXBzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgZm9yIChpID0gMCwgbGVuID0gZXhwb3J0cy5uYW1lcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChleHBvcnRzLm5hbWVzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ29lcmNlIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7TWl4ZWR9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBjb2VyY2UodmFsKSB7XG4gIGlmICh2YWwgaW5zdGFuY2VvZiBFcnJvcikgcmV0dXJuIHZhbC5zdGFjayB8fCB2YWwubWVzc2FnZTtcbiAgcmV0dXJuIHZhbDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8qKlxuICogSGVscGVycy5cbiAqL1xuXG52YXIgcyA9IDEwMDA7XG52YXIgbSA9IHMgKiA2MDtcbnZhciBoID0gbSAqIDYwO1xudmFyIGQgPSBoICogMjQ7XG52YXIgeSA9IGQgKiAzNjUuMjU7XG5cbi8qKlxuICogUGFyc2Ugb3IgZm9ybWF0IHRoZSBnaXZlbiBgdmFsYC5cbiAqXG4gKiBPcHRpb25zOlxuICpcbiAqICAtIGBsb25nYCB2ZXJib3NlIGZvcm1hdHRpbmcgW2ZhbHNlXVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gdmFsXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAdGhyb3dzIHtFcnJvcn0gdGhyb3cgYW4gZXJyb3IgaWYgdmFsIGlzIG5vdCBhIG5vbi1lbXB0eSBzdHJpbmcgb3IgYSBudW1iZXJcbiAqIEByZXR1cm4ge1N0cmluZ3xOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWw7XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJyAmJiB2YWwubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwYXJzZSh2YWwpO1xuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbCkgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMubG9uZyA/IGZtdExvbmcodmFsKSA6IGZtdFNob3J0KHZhbCk7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICd2YWwgaXMgbm90IGEgbm9uLWVtcHR5IHN0cmluZyBvciBhIHZhbGlkIG51bWJlci4gdmFsPScgK1xuICAgICAgSlNPTi5zdHJpbmdpZnkodmFsKVxuICApO1xufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYHN0cmAgYW5kIHJldHVybiBtaWxsaXNlY29uZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2Uoc3RyKSB7XG4gIHN0ciA9IFN0cmluZyhzdHIpO1xuICBpZiAoc3RyLmxlbmd0aCA+IDEwMCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKFxuICAgIHN0clxuICApO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBuID0gcGFyc2VGbG9hdChtYXRjaFsxXSk7XG4gIHZhciB0eXBlID0gKG1hdGNoWzJdIHx8ICdtcycpLnRvTG93ZXJDYXNlKCk7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ3llYXJzJzpcbiAgICBjYXNlICd5ZWFyJzpcbiAgICBjYXNlICd5cnMnOlxuICAgIGNhc2UgJ3lyJzpcbiAgICBjYXNlICd5JzpcbiAgICAgIHJldHVybiBuICogeTtcbiAgICBjYXNlICdkYXlzJzpcbiAgICBjYXNlICdkYXknOlxuICAgIGNhc2UgJ2QnOlxuICAgICAgcmV0dXJuIG4gKiBkO1xuICAgIGNhc2UgJ2hvdXJzJzpcbiAgICBjYXNlICdob3VyJzpcbiAgICBjYXNlICdocnMnOlxuICAgIGNhc2UgJ2hyJzpcbiAgICBjYXNlICdoJzpcbiAgICAgIHJldHVybiBuICogaDtcbiAgICBjYXNlICdtaW51dGVzJzpcbiAgICBjYXNlICdtaW51dGUnOlxuICAgIGNhc2UgJ21pbnMnOlxuICAgIGNhc2UgJ21pbic6XG4gICAgY2FzZSAnbSc6XG4gICAgICByZXR1cm4gbiAqIG07XG4gICAgY2FzZSAnc2Vjb25kcyc6XG4gICAgY2FzZSAnc2Vjb25kJzpcbiAgICBjYXNlICdzZWNzJzpcbiAgICBjYXNlICdzZWMnOlxuICAgIGNhc2UgJ3MnOlxuICAgICAgcmV0dXJuIG4gKiBzO1xuICAgIGNhc2UgJ21pbGxpc2Vjb25kcyc6XG4gICAgY2FzZSAnbWlsbGlzZWNvbmQnOlxuICAgIGNhc2UgJ21zZWNzJzpcbiAgICBjYXNlICdtc2VjJzpcbiAgICBjYXNlICdtcyc6XG4gICAgICByZXR1cm4gbjtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFNob3J0IGZvcm1hdCBmb3IgYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGZtdFNob3J0KG1zKSB7XG4gIGlmIChtcyA+PSBkKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobXMgLyBkKSArICdkJztcbiAgfVxuICBpZiAobXMgPj0gaCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gaCkgKyAnaCc7XG4gIH1cbiAgaWYgKG1zID49IG0pIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtcyAvIG0pICsgJ20nO1xuICB9XG4gIGlmIChtcyA+PSBzKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQobXMgLyBzKSArICdzJztcbiAgfVxuICByZXR1cm4gbXMgKyAnbXMnO1xufVxuXG4vKipcbiAqIExvbmcgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZm10TG9uZyhtcykge1xuICByZXR1cm4gcGx1cmFsKG1zLCBkLCAnZGF5JykgfHxcbiAgICBwbHVyYWwobXMsIGgsICdob3VyJykgfHxcbiAgICBwbHVyYWwobXMsIG0sICdtaW51dGUnKSB8fFxuICAgIHBsdXJhbChtcywgcywgJ3NlY29uZCcpIHx8XG4gICAgbXMgKyAnIG1zJztcbn1cblxuLyoqXG4gKiBQbHVyYWxpemF0aW9uIGhlbHBlci5cbiAqL1xuXG5mdW5jdGlvbiBwbHVyYWwobXMsIG4sIG5hbWUpIHtcbiAgaWYgKG1zIDwgbikge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAobXMgPCBuICogMS41KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IobXMgLyBuKSArICcgJyArIG5hbWU7XG4gIH1cbiAgcmV0dXJuIE1hdGguY2VpbChtcyAvIG4pICsgJyAnICsgbmFtZSArICdzJztcbn1cbiIsIiAgLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cblxuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gICAqL1xuXG4gIHZhciBwYXRodG9SZWdleHAgPSByZXF1aXJlKCdwYXRoLXRvLXJlZ2V4cCcpO1xuXG4gIC8qKlxuICAgKiBNb2R1bGUgZXhwb3J0cy5cbiAgICovXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBwYWdlO1xuXG4gIC8qKlxuICAgKiBEZXRlY3QgY2xpY2sgZXZlbnRcbiAgICovXG4gIHZhciBjbGlja0V2ZW50ID0gKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgZG9jdW1lbnQpICYmIGRvY3VtZW50Lm9udG91Y2hzdGFydCA/ICd0b3VjaHN0YXJ0JyA6ICdjbGljayc7XG5cbiAgLyoqXG4gICAqIFRvIHdvcmsgcHJvcGVybHkgd2l0aCB0aGUgVVJMXG4gICAqIGhpc3RvcnkubG9jYXRpb24gZ2VuZXJhdGVkIHBvbHlmaWxsIGluIGh0dHBzOi8vZ2l0aHViLmNvbS9kZXZvdGUvSFRNTDUtSGlzdG9yeS1BUElcbiAgICovXG5cbiAgdmFyIGxvY2F0aW9uID0gKCd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd2luZG93KSAmJiAod2luZG93Lmhpc3RvcnkubG9jYXRpb24gfHwgd2luZG93LmxvY2F0aW9uKTtcblxuICAvKipcbiAgICogUGVyZm9ybSBpbml0aWFsIGRpc3BhdGNoLlxuICAgKi9cblxuICB2YXIgZGlzcGF0Y2ggPSB0cnVlO1xuXG5cbiAgLyoqXG4gICAqIERlY29kZSBVUkwgY29tcG9uZW50cyAocXVlcnkgc3RyaW5nLCBwYXRobmFtZSwgaGFzaCkuXG4gICAqIEFjY29tbW9kYXRlcyBib3RoIHJlZ3VsYXIgcGVyY2VudCBlbmNvZGluZyBhbmQgeC13d3ctZm9ybS11cmxlbmNvZGVkIGZvcm1hdC5cbiAgICovXG4gIHZhciBkZWNvZGVVUkxDb21wb25lbnRzID0gdHJ1ZTtcblxuICAvKipcbiAgICogQmFzZSBwYXRoLlxuICAgKi9cblxuICB2YXIgYmFzZSA9ICcnO1xuXG4gIC8qKlxuICAgKiBSdW5uaW5nIGZsYWcuXG4gICAqL1xuXG4gIHZhciBydW5uaW5nO1xuXG4gIC8qKlxuICAgKiBIYXNoQmFuZyBvcHRpb25cbiAgICovXG5cbiAgdmFyIGhhc2hiYW5nID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIFByZXZpb3VzIGNvbnRleHQsIGZvciBjYXB0dXJpbmdcbiAgICogcGFnZSBleGl0IGV2ZW50cy5cbiAgICovXG5cbiAgdmFyIHByZXZDb250ZXh0O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBgcGF0aGAgd2l0aCBjYWxsYmFjayBgZm4oKWAsXG4gICAqIG9yIHJvdXRlIGBwYXRoYCwgb3IgcmVkaXJlY3Rpb24sXG4gICAqIG9yIGBwYWdlLnN0YXJ0KClgLlxuICAgKlxuICAgKiAgIHBhZ2UoZm4pO1xuICAgKiAgIHBhZ2UoJyonLCBmbik7XG4gICAqICAgcGFnZSgnL3VzZXIvOmlkJywgbG9hZCwgdXNlcik7XG4gICAqICAgcGFnZSgnL3VzZXIvJyArIHVzZXIuaWQsIHsgc29tZTogJ3RoaW5nJyB9KTtcbiAgICogICBwYWdlKCcvdXNlci8nICsgdXNlci5pZCk7XG4gICAqICAgcGFnZSgnL2Zyb20nLCAnL3RvJylcbiAgICogICBwYWdlKCk7XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfCFGdW5jdGlvbnwhT2JqZWN0fSBwYXRoXG4gICAqIEBwYXJhbSB7RnVuY3Rpb249fSBmblxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBwYWdlKHBhdGgsIGZuKSB7XG4gICAgLy8gPGNhbGxiYWNrPlxuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgcGF0aCkge1xuICAgICAgcmV0dXJuIHBhZ2UoJyonLCBwYXRoKTtcbiAgICB9XG5cbiAgICAvLyByb3V0ZSA8cGF0aD4gdG8gPGNhbGxiYWNrIC4uLj5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGZuKSB7XG4gICAgICB2YXIgcm91dGUgPSBuZXcgUm91dGUoLyoqIEB0eXBlIHtzdHJpbmd9ICovIChwYXRoKSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICBwYWdlLmNhbGxiYWNrcy5wdXNoKHJvdXRlLm1pZGRsZXdhcmUoYXJndW1lbnRzW2ldKSk7XG4gICAgICB9XG4gICAgICAvLyBzaG93IDxwYXRoPiB3aXRoIFtzdGF0ZV1cbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgcGF0aCkge1xuICAgICAgcGFnZVsnc3RyaW5nJyA9PT0gdHlwZW9mIGZuID8gJ3JlZGlyZWN0JyA6ICdzaG93J10ocGF0aCwgZm4pO1xuICAgICAgLy8gc3RhcnQgW29wdGlvbnNdXG4gICAgfSBlbHNlIHtcbiAgICAgIHBhZ2Uuc3RhcnQocGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9ucy5cbiAgICovXG5cbiAgcGFnZS5jYWxsYmFja3MgPSBbXTtcbiAgcGFnZS5leGl0cyA9IFtdO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IHBhdGggYmVpbmcgcHJvY2Vzc2VkXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBwYWdlLmN1cnJlbnQgPSAnJztcblxuICAvKipcbiAgICogTnVtYmVyIG9mIHBhZ2VzIG5hdmlnYXRlZCB0by5cbiAgICogQHR5cGUge251bWJlcn1cbiAgICpcbiAgICogICAgIHBhZ2UubGVuID09IDA7XG4gICAqICAgICBwYWdlKCcvbG9naW4nKTtcbiAgICogICAgIHBhZ2UubGVuID09IDE7XG4gICAqL1xuXG4gIHBhZ2UubGVuID0gMDtcblxuICAvKipcbiAgICogR2V0IG9yIHNldCBiYXNlcGF0aCB0byBgcGF0aGAuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2UuYmFzZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBpZiAoMCA9PT0gYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGJhc2U7XG4gICAgYmFzZSA9IHBhdGg7XG4gIH07XG5cbiAgLyoqXG4gICAqIEJpbmQgd2l0aCB0aGUgZ2l2ZW4gYG9wdGlvbnNgLlxuICAgKlxuICAgKiBPcHRpb25zOlxuICAgKlxuICAgKiAgICAtIGBjbGlja2AgYmluZCB0byBjbGljayBldmVudHMgW3RydWVdXG4gICAqICAgIC0gYHBvcHN0YXRlYCBiaW5kIHRvIHBvcHN0YXRlIFt0cnVlXVxuICAgKiAgICAtIGBkaXNwYXRjaGAgcGVyZm9ybSBpbml0aWFsIGRpc3BhdGNoIFt0cnVlXVxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBwYWdlLnN0YXJ0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGlmIChydW5uaW5nKSByZXR1cm47XG4gICAgcnVubmluZyA9IHRydWU7XG4gICAgaWYgKGZhbHNlID09PSBvcHRpb25zLmRpc3BhdGNoKSBkaXNwYXRjaCA9IGZhbHNlO1xuICAgIGlmIChmYWxzZSA9PT0gb3B0aW9ucy5kZWNvZGVVUkxDb21wb25lbnRzKSBkZWNvZGVVUkxDb21wb25lbnRzID0gZmFsc2U7XG4gICAgaWYgKGZhbHNlICE9PSBvcHRpb25zLnBvcHN0YXRlKSB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBvbnBvcHN0YXRlLCBmYWxzZSk7XG4gICAgaWYgKGZhbHNlICE9PSBvcHRpb25zLmNsaWNrKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGNsaWNrRXZlbnQsIG9uY2xpY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKHRydWUgPT09IG9wdGlvbnMuaGFzaGJhbmcpIGhhc2hiYW5nID0gdHJ1ZTtcbiAgICBpZiAoIWRpc3BhdGNoKSByZXR1cm47XG4gICAgdmFyIHVybCA9IChoYXNoYmFuZyAmJiB+bG9jYXRpb24uaGFzaC5pbmRleE9mKCcjIScpKSA/IGxvY2F0aW9uLmhhc2guc3Vic3RyKDIpICsgbG9jYXRpb24uc2VhcmNoIDogbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggKyBsb2NhdGlvbi5oYXNoO1xuICAgIHBhZ2UucmVwbGFjZSh1cmwsIG51bGwsIHRydWUsIGRpc3BhdGNoKTtcbiAgfTtcblxuICAvKipcbiAgICogVW5iaW5kIGNsaWNrIGFuZCBwb3BzdGF0ZSBldmVudCBoYW5kbGVycy5cbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFnZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFydW5uaW5nKSByZXR1cm47XG4gICAgcGFnZS5jdXJyZW50ID0gJyc7XG4gICAgcGFnZS5sZW4gPSAwO1xuICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGNsaWNrRXZlbnQsIG9uY2xpY2ssIGZhbHNlKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBvbnBvcHN0YXRlLCBmYWxzZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNob3cgYHBhdGhgIHdpdGggb3B0aW9uYWwgYHN0YXRlYCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gc3RhdGVcbiAgICogQHBhcmFtIHtib29sZWFuPX0gZGlzcGF0Y2hcbiAgICogQHBhcmFtIHtib29sZWFuPX0gcHVzaFxuICAgKiBAcmV0dXJuIHshQ29udGV4dH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFnZS5zaG93ID0gZnVuY3Rpb24ocGF0aCwgc3RhdGUsIGRpc3BhdGNoLCBwdXNoKSB7XG4gICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHBhdGgsIHN0YXRlKTtcbiAgICBwYWdlLmN1cnJlbnQgPSBjdHgucGF0aDtcbiAgICBpZiAoZmFsc2UgIT09IGRpc3BhdGNoKSBwYWdlLmRpc3BhdGNoKGN0eCk7XG4gICAgaWYgKGZhbHNlICE9PSBjdHguaGFuZGxlZCAmJiBmYWxzZSAhPT0gcHVzaCkgY3R4LnB1c2hTdGF0ZSgpO1xuICAgIHJldHVybiBjdHg7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdvZXMgYmFjayBpbiB0aGUgaGlzdG9yeVxuICAgKiBCYWNrIHNob3VsZCBhbHdheXMgbGV0IHRoZSBjdXJyZW50IHJvdXRlIHB1c2ggc3RhdGUgYW5kIHRoZW4gZ28gYmFjay5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBmYWxsYmFjayBwYXRoIHRvIGdvIGJhY2sgaWYgbm8gbW9yZSBoaXN0b3J5IGV4aXN0cywgaWYgdW5kZWZpbmVkIGRlZmF1bHRzIHRvIHBhZ2UuYmFzZVxuICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHBhZ2UuYmFjayA9IGZ1bmN0aW9uKHBhdGgsIHN0YXRlKSB7XG4gICAgaWYgKHBhZ2UubGVuID4gMCkge1xuICAgICAgLy8gdGhpcyBtYXkgbmVlZCBtb3JlIHRlc3RpbmcgdG8gc2VlIGlmIGFsbCBicm93c2Vyc1xuICAgICAgLy8gd2FpdCBmb3IgdGhlIG5leHQgdGljayB0byBnbyBiYWNrIGluIGhpc3RvcnlcbiAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgcGFnZS5sZW4tLTtcbiAgICB9IGVsc2UgaWYgKHBhdGgpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhZ2Uuc2hvdyhwYXRoLCBzdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9ZWxzZXtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhZ2Uuc2hvdyhiYXNlLCBzdGF0ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cblxuICAvKipcbiAgICogUmVnaXN0ZXIgcm91dGUgdG8gcmVkaXJlY3QgZnJvbSBvbmUgcGF0aCB0byBvdGhlclxuICAgKiBvciBqdXN0IHJlZGlyZWN0IHRvIGFub3RoZXIgcm91dGVcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZyb20gLSBpZiBwYXJhbSAndG8nIGlzIHVuZGVmaW5lZCByZWRpcmVjdHMgdG8gJ2Zyb20nXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gdG9cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG4gIHBhZ2UucmVkaXJlY3QgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICAgIC8vIERlZmluZSByb3V0ZSBmcm9tIGEgcGF0aCB0byBhbm90aGVyXG4gICAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgZnJvbSAmJiAnc3RyaW5nJyA9PT0gdHlwZW9mIHRvKSB7XG4gICAgICBwYWdlKGZyb20sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBwYWdlLnJlcGxhY2UoLyoqIEB0eXBlIHshc3RyaW5nfSAqLyAodG8pKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBXYWl0IGZvciB0aGUgcHVzaCBzdGF0ZSBhbmQgcmVwbGFjZSBpdCB3aXRoIGFub3RoZXJcbiAgICBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiBmcm9tICYmICd1bmRlZmluZWQnID09PSB0eXBlb2YgdG8pIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBhZ2UucmVwbGFjZShmcm9tKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVwbGFjZSBgcGF0aGAgd2l0aCBvcHRpb25hbCBgc3RhdGVgIG9iamVjdC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBpbml0XG4gICAqIEBwYXJhbSB7Ym9vbGVhbj19IGRpc3BhdGNoXG4gICAqIEByZXR1cm4geyFDb250ZXh0fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuXG4gIHBhZ2UucmVwbGFjZSA9IGZ1bmN0aW9uKHBhdGgsIHN0YXRlLCBpbml0LCBkaXNwYXRjaCkge1xuICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwYXRoLCBzdGF0ZSk7XG4gICAgcGFnZS5jdXJyZW50ID0gY3R4LnBhdGg7XG4gICAgY3R4LmluaXQgPSBpbml0O1xuICAgIGN0eC5zYXZlKCk7IC8vIHNhdmUgYmVmb3JlIGRpc3BhdGNoaW5nLCB3aGljaCBtYXkgcmVkaXJlY3RcbiAgICBpZiAoZmFsc2UgIT09IGRpc3BhdGNoKSBwYWdlLmRpc3BhdGNoKGN0eCk7XG4gICAgcmV0dXJuIGN0eDtcbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2ggdGhlIGdpdmVuIGBjdHhgLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIHBhZ2UuZGlzcGF0Y2ggPSBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgcHJldiA9IHByZXZDb250ZXh0LFxuICAgICAgaSA9IDAsXG4gICAgICBqID0gMDtcblxuICAgIHByZXZDb250ZXh0ID0gY3R4O1xuXG4gICAgZnVuY3Rpb24gbmV4dEV4aXQoKSB7XG4gICAgICB2YXIgZm4gPSBwYWdlLmV4aXRzW2orK107XG4gICAgICBpZiAoIWZuKSByZXR1cm4gbmV4dEVudGVyKCk7XG4gICAgICBmbihwcmV2LCBuZXh0RXhpdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmV4dEVudGVyKCkge1xuICAgICAgdmFyIGZuID0gcGFnZS5jYWxsYmFja3NbaSsrXTtcblxuICAgICAgaWYgKGN0eC5wYXRoICE9PSBwYWdlLmN1cnJlbnQpIHtcbiAgICAgICAgY3R4LmhhbmRsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFmbikgcmV0dXJuIHVuaGFuZGxlZChjdHgpO1xuICAgICAgZm4oY3R4LCBuZXh0RW50ZXIpO1xuICAgIH1cblxuICAgIGlmIChwcmV2KSB7XG4gICAgICBuZXh0RXhpdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0RW50ZXIoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFVuaGFuZGxlZCBgY3R4YC4gV2hlbiBpdCdzIG5vdCB0aGUgaW5pdGlhbFxuICAgKiBwb3BzdGF0ZSB0aGVuIHJlZGlyZWN0LiBJZiB5b3Ugd2lzaCB0byBoYW5kbGVcbiAgICogNDA0cyBvbiB5b3VyIG93biB1c2UgYHBhZ2UoJyonLCBjYWxsYmFjaylgLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHVuaGFuZGxlZChjdHgpIHtcbiAgICBpZiAoY3R4LmhhbmRsZWQpIHJldHVybjtcbiAgICB2YXIgY3VycmVudDtcblxuICAgIGlmIChoYXNoYmFuZykge1xuICAgICAgY3VycmVudCA9IGJhc2UgKyBsb2NhdGlvbi5oYXNoLnJlcGxhY2UoJyMhJywgJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50ID0gbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2g7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnQgPT09IGN0eC5jYW5vbmljYWxQYXRoKSByZXR1cm47XG4gICAgcGFnZS5zdG9wKCk7XG4gICAgY3R4LmhhbmRsZWQgPSBmYWxzZTtcbiAgICBsb2NhdGlvbi5ocmVmID0gY3R4LmNhbm9uaWNhbFBhdGg7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYW4gZXhpdCByb3V0ZSBvbiBgcGF0aGAgd2l0aFxuICAgKiBjYWxsYmFjayBgZm4oKWAsIHdoaWNoIHdpbGwgYmUgY2FsbGVkXG4gICAqIG9uIHRoZSBwcmV2aW91cyBjb250ZXh0IHdoZW4gYSBuZXdcbiAgICogcGFnZSBpcyB2aXNpdGVkLlxuICAgKi9cbiAgcGFnZS5leGl0ID0gZnVuY3Rpb24ocGF0aCwgZm4pIHtcbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBwYWdlLmV4aXQoJyonLCBwYXRoKTtcbiAgICB9XG5cbiAgICB2YXIgcm91dGUgPSBuZXcgUm91dGUocGF0aCk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHBhZ2UuZXhpdHMucHVzaChyb3V0ZS5taWRkbGV3YXJlKGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlIFVSTCBlbmNvZGluZyBmcm9tIHRoZSBnaXZlbiBgc3RyYC5cbiAgICogQWNjb21tb2RhdGVzIHdoaXRlc3BhY2UgaW4gYm90aCB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICogYW5kIHJlZ3VsYXIgcGVyY2VudC1lbmNvZGVkIGZvcm0uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB2YWwgLSBVUkwgY29tcG9uZW50IHRvIGRlY29kZVxuICAgKi9cbiAgZnVuY3Rpb24gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudCh2YWwpIHtcbiAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ3N0cmluZycpIHsgcmV0dXJuIHZhbDsgfVxuICAgIHJldHVybiBkZWNvZGVVUkxDb21wb25lbnRzID8gZGVjb2RlVVJJQ29tcG9uZW50KHZhbC5yZXBsYWNlKC9cXCsvZywgJyAnKSkgOiB2YWw7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhIG5ldyBcInJlcXVlc3RcIiBgQ29udGV4dGBcbiAgICogd2l0aCB0aGUgZ2l2ZW4gYHBhdGhgIGFuZCBvcHRpb25hbCBpbml0aWFsIGBzdGF0ZWAuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIENvbnRleHQocGF0aCwgc3RhdGUpIHtcbiAgICBpZiAoJy8nID09PSBwYXRoWzBdICYmIDAgIT09IHBhdGguaW5kZXhPZihiYXNlKSkgcGF0aCA9IGJhc2UgKyAoaGFzaGJhbmcgPyAnIyEnIDogJycpICsgcGF0aDtcbiAgICB2YXIgaSA9IHBhdGguaW5kZXhPZignPycpO1xuXG4gICAgdGhpcy5jYW5vbmljYWxQYXRoID0gcGF0aDtcbiAgICB0aGlzLnBhdGggPSBwYXRoLnJlcGxhY2UoYmFzZSwgJycpIHx8ICcvJztcbiAgICBpZiAoaGFzaGJhbmcpIHRoaXMucGF0aCA9IHRoaXMucGF0aC5yZXBsYWNlKCcjIScsICcnKSB8fCAnLyc7XG5cbiAgICB0aGlzLnRpdGxlID0gZG9jdW1lbnQudGl0bGU7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIHRoaXMuc3RhdGUucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5xdWVyeXN0cmluZyA9IH5pID8gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudChwYXRoLnNsaWNlKGkgKyAxKSkgOiAnJztcbiAgICB0aGlzLnBhdGhuYW1lID0gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudCh+aSA/IHBhdGguc2xpY2UoMCwgaSkgOiBwYXRoKTtcbiAgICB0aGlzLnBhcmFtcyA9IHt9O1xuXG4gICAgLy8gZnJhZ21lbnRcbiAgICB0aGlzLmhhc2ggPSAnJztcbiAgICBpZiAoIWhhc2hiYW5nKSB7XG4gICAgICBpZiAoIX50aGlzLnBhdGguaW5kZXhPZignIycpKSByZXR1cm47XG4gICAgICB2YXIgcGFydHMgPSB0aGlzLnBhdGguc3BsaXQoJyMnKTtcbiAgICAgIHRoaXMucGF0aCA9IHBhcnRzWzBdO1xuICAgICAgdGhpcy5oYXNoID0gZGVjb2RlVVJMRW5jb2RlZFVSSUNvbXBvbmVudChwYXJ0c1sxXSkgfHwgJyc7XG4gICAgICB0aGlzLnF1ZXJ5c3RyaW5nID0gdGhpcy5xdWVyeXN0cmluZy5zcGxpdCgnIycpWzBdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvc2UgYENvbnRleHRgLlxuICAgKi9cblxuICBwYWdlLkNvbnRleHQgPSBDb250ZXh0O1xuXG4gIC8qKlxuICAgKiBQdXNoIHN0YXRlLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgQ29udGV4dC5wcm90b3R5cGUucHVzaFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcGFnZS5sZW4rKztcbiAgICBoaXN0b3J5LnB1c2hTdGF0ZSh0aGlzLnN0YXRlLCB0aGlzLnRpdGxlLCBoYXNoYmFuZyAmJiB0aGlzLnBhdGggIT09ICcvJyA/ICcjIScgKyB0aGlzLnBhdGggOiB0aGlzLmNhbm9uaWNhbFBhdGgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTYXZlIHRoZSBjb250ZXh0IHN0YXRlLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBDb250ZXh0LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUodGhpcy5zdGF0ZSwgdGhpcy50aXRsZSwgaGFzaGJhbmcgJiYgdGhpcy5wYXRoICE9PSAnLycgPyAnIyEnICsgdGhpcy5wYXRoIDogdGhpcy5jYW5vbmljYWxQYXRoKTtcbiAgfTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBgUm91dGVgIHdpdGggdGhlIGdpdmVuIEhUVFAgYHBhdGhgLFxuICAgKiBhbmQgYW4gYXJyYXkgb2YgYGNhbGxiYWNrc2AgYW5kIGBvcHRpb25zYC5cbiAgICpcbiAgICogT3B0aW9uczpcbiAgICpcbiAgICogICAtIGBzZW5zaXRpdmVgICAgIGVuYWJsZSBjYXNlLXNlbnNpdGl2ZSByb3V0ZXNcbiAgICogICAtIGBzdHJpY3RgICAgICAgIGVuYWJsZSBzdHJpY3QgbWF0Y2hpbmcgZm9yIHRyYWlsaW5nIHNsYXNoZXNcbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9uc1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgZnVuY3Rpb24gUm91dGUocGF0aCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMucGF0aCA9IChwYXRoID09PSAnKicpID8gJyguKiknIDogcGF0aDtcbiAgICB0aGlzLm1ldGhvZCA9ICdHRVQnO1xuICAgIHRoaXMucmVnZXhwID0gcGF0aHRvUmVnZXhwKHRoaXMucGF0aCxcbiAgICAgIHRoaXMua2V5cyA9IFtdLFxuICAgICAgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogRXhwb3NlIGBSb3V0ZWAuXG4gICAqL1xuXG4gIHBhZ2UuUm91dGUgPSBSb3V0ZTtcblxuICAvKipcbiAgICogUmV0dXJuIHJvdXRlIG1pZGRsZXdhcmUgd2l0aFxuICAgKiB0aGUgZ2l2ZW4gY2FsbGJhY2sgYGZuKClgLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgUm91dGUucHJvdG90eXBlLm1pZGRsZXdhcmUgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oY3R4LCBuZXh0KSB7XG4gICAgICBpZiAoc2VsZi5tYXRjaChjdHgucGF0aCwgY3R4LnBhcmFtcykpIHJldHVybiBmbihjdHgsIG5leHQpO1xuICAgICAgbmV4dCgpO1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoaXMgcm91dGUgbWF0Y2hlcyBgcGF0aGAsIGlmIHNvXG4gICAqIHBvcHVsYXRlIGBwYXJhbXNgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBSb3V0ZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbihwYXRoLCBwYXJhbXMpIHtcbiAgICB2YXIga2V5cyA9IHRoaXMua2V5cyxcbiAgICAgIHFzSW5kZXggPSBwYXRoLmluZGV4T2YoJz8nKSxcbiAgICAgIHBhdGhuYW1lID0gfnFzSW5kZXggPyBwYXRoLnNsaWNlKDAsIHFzSW5kZXgpIDogcGF0aCxcbiAgICAgIG0gPSB0aGlzLnJlZ2V4cC5leGVjKGRlY29kZVVSSUNvbXBvbmVudChwYXRobmFtZSkpO1xuXG4gICAgaWYgKCFtKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMSwgbGVuID0gbS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgdmFyIGtleSA9IGtleXNbaSAtIDFdO1xuICAgICAgdmFyIHZhbCA9IGRlY29kZVVSTEVuY29kZWRVUklDb21wb25lbnQobVtpXSk7XG4gICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQgfHwgIShoYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtcywga2V5Lm5hbWUpKSkge1xuICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gdmFsO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG5cbiAgLyoqXG4gICAqIEhhbmRsZSBcInBvcHVsYXRlXCIgZXZlbnRzLlxuICAgKi9cblxuICB2YXIgb25wb3BzdGF0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xuICAgIGlmICgndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHdpbmRvdykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gb25wb3BzdGF0ZShlKSB7XG4gICAgICBpZiAoIWxvYWRlZCkgcmV0dXJuO1xuICAgICAgaWYgKGUuc3RhdGUpIHtcbiAgICAgICAgdmFyIHBhdGggPSBlLnN0YXRlLnBhdGg7XG4gICAgICAgIHBhZ2UucmVwbGFjZShwYXRoLCBlLnN0YXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhZ2Uuc2hvdyhsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLmhhc2gsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKTtcbiAgLyoqXG4gICAqIEhhbmRsZSBcImNsaWNrXCIgZXZlbnRzLlxuICAgKi9cblxuICBmdW5jdGlvbiBvbmNsaWNrKGUpIHtcblxuICAgIGlmICgxICE9PSB3aGljaChlKSkgcmV0dXJuO1xuXG4gICAgaWYgKGUubWV0YUtleSB8fCBlLmN0cmxLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xuICAgIGlmIChlLmRlZmF1bHRQcmV2ZW50ZWQpIHJldHVybjtcblxuXG5cbiAgICAvLyBlbnN1cmUgbGlua1xuICAgIC8vIHVzZSBzaGFkb3cgZG9tIHdoZW4gYXZhaWxhYmxlXG4gICAgdmFyIGVsID0gZS5wYXRoID8gZS5wYXRoWzBdIDogZS50YXJnZXQ7XG4gICAgd2hpbGUgKGVsICYmICdBJyAhPT0gZWwubm9kZU5hbWUpIGVsID0gZWwucGFyZW50Tm9kZTtcbiAgICBpZiAoIWVsIHx8ICdBJyAhPT0gZWwubm9kZU5hbWUpIHJldHVybjtcblxuXG5cbiAgICAvLyBJZ25vcmUgaWYgdGFnIGhhc1xuICAgIC8vIDEuIFwiZG93bmxvYWRcIiBhdHRyaWJ1dGVcbiAgICAvLyAyLiByZWw9XCJleHRlcm5hbFwiIGF0dHJpYnV0ZVxuICAgIGlmIChlbC5oYXNBdHRyaWJ1dGUoJ2Rvd25sb2FkJykgfHwgZWwuZ2V0QXR0cmlidXRlKCdyZWwnKSA9PT0gJ2V4dGVybmFsJykgcmV0dXJuO1xuXG4gICAgLy8gZW5zdXJlIG5vbi1oYXNoIGZvciB0aGUgc2FtZSBwYXRoXG4gICAgdmFyIGxpbmsgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICBpZiAoIWhhc2hiYW5nICYmIGVsLnBhdGhuYW1lID09PSBsb2NhdGlvbi5wYXRobmFtZSAmJiAoZWwuaGFzaCB8fCAnIycgPT09IGxpbmspKSByZXR1cm47XG5cblxuXG4gICAgLy8gQ2hlY2sgZm9yIG1haWx0bzogaW4gdGhlIGhyZWZcbiAgICBpZiAobGluayAmJiBsaW5rLmluZGV4T2YoJ21haWx0bzonKSA+IC0xKSByZXR1cm47XG5cbiAgICAvLyBjaGVjayB0YXJnZXRcbiAgICBpZiAoZWwudGFyZ2V0KSByZXR1cm47XG5cbiAgICAvLyB4LW9yaWdpblxuICAgIGlmICghc2FtZU9yaWdpbihlbC5ocmVmKSkgcmV0dXJuO1xuXG5cblxuICAgIC8vIHJlYnVpbGQgcGF0aFxuICAgIHZhciBwYXRoID0gZWwucGF0aG5hbWUgKyBlbC5zZWFyY2ggKyAoZWwuaGFzaCB8fCAnJyk7XG5cbiAgICAvLyBzdHJpcCBsZWFkaW5nIFwiL1tkcml2ZSBsZXR0ZXJdOlwiIG9uIE5XLmpzIG9uIFdpbmRvd3NcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHBhdGgubWF0Y2goL15cXC9bYS16QS1aXTpcXC8vKSkge1xuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXlxcL1thLXpBLVpdOlxcLy8sICcvJyk7XG4gICAgfVxuXG4gICAgLy8gc2FtZSBwYWdlXG4gICAgdmFyIG9yaWcgPSBwYXRoO1xuXG4gICAgaWYgKHBhdGguaW5kZXhPZihiYXNlKSA9PT0gMCkge1xuICAgICAgcGF0aCA9IHBhdGguc3Vic3RyKGJhc2UubGVuZ3RoKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzaGJhbmcpIHBhdGggPSBwYXRoLnJlcGxhY2UoJyMhJywgJycpO1xuXG4gICAgaWYgKGJhc2UgJiYgb3JpZyA9PT0gcGF0aCkgcmV0dXJuO1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHBhZ2Uuc2hvdyhvcmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmVudCBidXR0b24uXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHdoaWNoKGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgcmV0dXJuIG51bGwgPT09IGUud2hpY2ggPyBlLmJ1dHRvbiA6IGUud2hpY2g7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgYGhyZWZgIGlzIHRoZSBzYW1lIG9yaWdpbi5cbiAgICovXG5cbiAgZnVuY3Rpb24gc2FtZU9yaWdpbihocmVmKSB7XG4gICAgdmFyIG9yaWdpbiA9IGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3RuYW1lO1xuICAgIGlmIChsb2NhdGlvbi5wb3J0KSBvcmlnaW4gKz0gJzonICsgbG9jYXRpb24ucG9ydDtcbiAgICByZXR1cm4gKGhyZWYgJiYgKDAgPT09IGhyZWYuaW5kZXhPZihvcmlnaW4pKSk7XG4gIH1cblxuICBwYWdlLnNhbWVPcmlnaW4gPSBzYW1lT3JpZ2luO1xuIiwidmFyIGlzYXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuLyoqXG4gKiBFeHBvc2UgYHBhdGhUb1JlZ2V4cGAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gcGF0aFRvUmVnZXhwXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXG5tb2R1bGUuZXhwb3J0cy5jb21waWxlID0gY29tcGlsZVxubW9kdWxlLmV4cG9ydHMudG9rZW5zVG9GdW5jdGlvbiA9IHRva2Vuc1RvRnVuY3Rpb25cbm1vZHVsZS5leHBvcnRzLnRva2Vuc1RvUmVnRXhwID0gdG9rZW5zVG9SZWdFeHBcblxuLyoqXG4gKiBUaGUgbWFpbiBwYXRoIG1hdGNoaW5nIHJlZ2V4cCB1dGlsaXR5LlxuICpcbiAqIEB0eXBlIHtSZWdFeHB9XG4gKi9cbnZhciBQQVRIX1JFR0VYUCA9IG5ldyBSZWdFeHAoW1xuICAvLyBNYXRjaCBlc2NhcGVkIGNoYXJhY3RlcnMgdGhhdCB3b3VsZCBvdGhlcndpc2UgYXBwZWFyIGluIGZ1dHVyZSBtYXRjaGVzLlxuICAvLyBUaGlzIGFsbG93cyB0aGUgdXNlciB0byBlc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIHRoYXQgd29uJ3QgdHJhbnNmb3JtLlxuICAnKFxcXFxcXFxcLiknLFxuICAvLyBNYXRjaCBFeHByZXNzLXN0eWxlIHBhcmFtZXRlcnMgYW5kIHVuLW5hbWVkIHBhcmFtZXRlcnMgd2l0aCBhIHByZWZpeFxuICAvLyBhbmQgb3B0aW9uYWwgc3VmZml4ZXMuIE1hdGNoZXMgYXBwZWFyIGFzOlxuICAvL1xuICAvLyBcIi86dGVzdChcXFxcZCspP1wiID0+IFtcIi9cIiwgXCJ0ZXN0XCIsIFwiXFxkK1wiLCB1bmRlZmluZWQsIFwiP1wiLCB1bmRlZmluZWRdXG4gIC8vIFwiL3JvdXRlKFxcXFxkKylcIiAgPT4gW3VuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFwiXFxkK1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZF1cbiAgLy8gXCIvKlwiICAgICAgICAgICAgPT4gW1wiL1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIFwiKlwiXVxuICAnKFtcXFxcLy5dKT8oPzooPzpcXFxcOihcXFxcdyspKD86XFxcXCgoKD86XFxcXFxcXFwufFteKCldKSspXFxcXCkpP3xcXFxcKCgoPzpcXFxcXFxcXC58W14oKV0pKylcXFxcKSkoWysqP10pP3woXFxcXCopKSdcbl0uam9pbignfCcpLCAnZycpXG5cbi8qKlxuICogUGFyc2UgYSBzdHJpbmcgZm9yIHRoZSByYXcgdG9rZW5zLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gcGFyc2UgKHN0cikge1xuICB2YXIgdG9rZW5zID0gW11cbiAgdmFyIGtleSA9IDBcbiAgdmFyIGluZGV4ID0gMFxuICB2YXIgcGF0aCA9ICcnXG4gIHZhciByZXNcblxuICB3aGlsZSAoKHJlcyA9IFBBVEhfUkVHRVhQLmV4ZWMoc3RyKSkgIT0gbnVsbCkge1xuICAgIHZhciBtID0gcmVzWzBdXG4gICAgdmFyIGVzY2FwZWQgPSByZXNbMV1cbiAgICB2YXIgb2Zmc2V0ID0gcmVzLmluZGV4XG4gICAgcGF0aCArPSBzdHIuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICBpbmRleCA9IG9mZnNldCArIG0ubGVuZ3RoXG5cbiAgICAvLyBJZ25vcmUgYWxyZWFkeSBlc2NhcGVkIHNlcXVlbmNlcy5cbiAgICBpZiAoZXNjYXBlZCkge1xuICAgICAgcGF0aCArPSBlc2NhcGVkWzFdXG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIC8vIFB1c2ggdGhlIGN1cnJlbnQgcGF0aCBvbnRvIHRoZSB0b2tlbnMuXG4gICAgaWYgKHBhdGgpIHtcbiAgICAgIHRva2Vucy5wdXNoKHBhdGgpXG4gICAgICBwYXRoID0gJydcbiAgICB9XG5cbiAgICB2YXIgcHJlZml4ID0gcmVzWzJdXG4gICAgdmFyIG5hbWUgPSByZXNbM11cbiAgICB2YXIgY2FwdHVyZSA9IHJlc1s0XVxuICAgIHZhciBncm91cCA9IHJlc1s1XVxuICAgIHZhciBzdWZmaXggPSByZXNbNl1cbiAgICB2YXIgYXN0ZXJpc2sgPSByZXNbN11cblxuICAgIHZhciByZXBlYXQgPSBzdWZmaXggPT09ICcrJyB8fCBzdWZmaXggPT09ICcqJ1xuICAgIHZhciBvcHRpb25hbCA9IHN1ZmZpeCA9PT0gJz8nIHx8IHN1ZmZpeCA9PT0gJyonXG4gICAgdmFyIGRlbGltaXRlciA9IHByZWZpeCB8fCAnLydcbiAgICB2YXIgcGF0dGVybiA9IGNhcHR1cmUgfHwgZ3JvdXAgfHwgKGFzdGVyaXNrID8gJy4qJyA6ICdbXicgKyBkZWxpbWl0ZXIgKyAnXSs/JylcblxuICAgIHRva2Vucy5wdXNoKHtcbiAgICAgIG5hbWU6IG5hbWUgfHwga2V5KyssXG4gICAgICBwcmVmaXg6IHByZWZpeCB8fCAnJyxcbiAgICAgIGRlbGltaXRlcjogZGVsaW1pdGVyLFxuICAgICAgb3B0aW9uYWw6IG9wdGlvbmFsLFxuICAgICAgcmVwZWF0OiByZXBlYXQsXG4gICAgICBwYXR0ZXJuOiBlc2NhcGVHcm91cChwYXR0ZXJuKVxuICAgIH0pXG4gIH1cblxuICAvLyBNYXRjaCBhbnkgY2hhcmFjdGVycyBzdGlsbCByZW1haW5pbmcuXG4gIGlmIChpbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICBwYXRoICs9IHN0ci5zdWJzdHIoaW5kZXgpXG4gIH1cblxuICAvLyBJZiB0aGUgcGF0aCBleGlzdHMsIHB1c2ggaXQgb250byB0aGUgZW5kLlxuICBpZiAocGF0aCkge1xuICAgIHRva2Vucy5wdXNoKHBhdGgpXG4gIH1cblxuICByZXR1cm4gdG9rZW5zXG59XG5cbi8qKlxuICogQ29tcGlsZSBhIHN0cmluZyB0byBhIHRlbXBsYXRlIGZ1bmN0aW9uIGZvciB0aGUgcGF0aC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgc3RyXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gY29tcGlsZSAoc3RyKSB7XG4gIHJldHVybiB0b2tlbnNUb0Z1bmN0aW9uKHBhcnNlKHN0cikpXG59XG5cbi8qKlxuICogRXhwb3NlIGEgbWV0aG9kIGZvciB0cmFuc2Zvcm1pbmcgdG9rZW5zIGludG8gdGhlIHBhdGggZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIHRva2Vuc1RvRnVuY3Rpb24gKHRva2Vucykge1xuICAvLyBDb21waWxlIGFsbCB0aGUgdG9rZW5zIGludG8gcmVnZXhwcy5cbiAgdmFyIG1hdGNoZXMgPSBuZXcgQXJyYXkodG9rZW5zLmxlbmd0aClcblxuICAvLyBDb21waWxlIGFsbCB0aGUgcGF0dGVybnMgYmVmb3JlIGNvbXBpbGF0aW9uLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgdG9rZW5zW2ldID09PSAnb2JqZWN0Jykge1xuICAgICAgbWF0Y2hlc1tpXSA9IG5ldyBSZWdFeHAoJ14nICsgdG9rZW5zW2ldLnBhdHRlcm4gKyAnJCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcGF0aCA9ICcnXG4gICAgdmFyIGRhdGEgPSBvYmogfHwge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdG9rZW4gPSB0b2tlbnNbaV1cblxuICAgICAgaWYgKHR5cGVvZiB0b2tlbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcGF0aCArPSB0b2tlblxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSA9IGRhdGFbdG9rZW4ubmFtZV1cbiAgICAgIHZhciBzZWdtZW50XG5cbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIGlmICh0b2tlbi5vcHRpb25hbCkge1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBiZSBkZWZpbmVkJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNhcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCF0b2tlbi5yZXBlYXQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBcIicgKyB0b2tlbi5uYW1lICsgJ1wiIHRvIG5vdCByZXBlYXQsIGJ1dCByZWNlaXZlZCBcIicgKyB2YWx1ZSArICdcIicpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYgKHRva2VuLm9wdGlvbmFsKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBcIicgKyB0b2tlbi5uYW1lICsgJ1wiIHRvIG5vdCBiZSBlbXB0eScpXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWx1ZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHNlZ21lbnQgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWVbal0pXG5cbiAgICAgICAgICBpZiAoIW1hdGNoZXNbaV0udGVzdChzZWdtZW50KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYWxsIFwiJyArIHRva2VuLm5hbWUgKyAnXCIgdG8gbWF0Y2ggXCInICsgdG9rZW4ucGF0dGVybiArICdcIiwgYnV0IHJlY2VpdmVkIFwiJyArIHNlZ21lbnQgKyAnXCInKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHBhdGggKz0gKGogPT09IDAgPyB0b2tlbi5wcmVmaXggOiB0b2tlbi5kZWxpbWl0ZXIpICsgc2VnbWVudFxuICAgICAgICB9XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgc2VnbWVudCA9IGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSlcblxuICAgICAgaWYgKCFtYXRjaGVzW2ldLnRlc3Qoc2VnbWVudCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgXCInICsgdG9rZW4ubmFtZSArICdcIiB0byBtYXRjaCBcIicgKyB0b2tlbi5wYXR0ZXJuICsgJ1wiLCBidXQgcmVjZWl2ZWQgXCInICsgc2VnbWVudCArICdcIicpXG4gICAgICB9XG5cbiAgICAgIHBhdGggKz0gdG9rZW4ucHJlZml4ICsgc2VnbWVudFxuICAgIH1cblxuICAgIHJldHVybiBwYXRoXG4gIH1cbn1cblxuLyoqXG4gKiBFc2NhcGUgYSByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyAoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFsuKyo/PV4hOiR7fSgpW1xcXXxcXC9dKS9nLCAnXFxcXCQxJylcbn1cblxuLyoqXG4gKiBFc2NhcGUgdGhlIGNhcHR1cmluZyBncm91cCBieSBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYW5kIG1lYW5pbmcuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBncm91cFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBlc2NhcGVHcm91cCAoZ3JvdXApIHtcbiAgcmV0dXJuIGdyb3VwLnJlcGxhY2UoLyhbPSE6JFxcLygpXSkvZywgJ1xcXFwkMScpXG59XG5cbi8qKlxuICogQXR0YWNoIHRoZSBrZXlzIGFzIGEgcHJvcGVydHkgb2YgdGhlIHJlZ2V4cC5cbiAqXG4gKiBAcGFyYW0gIHtSZWdFeHB9IHJlXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gYXR0YWNoS2V5cyAocmUsIGtleXMpIHtcbiAgcmUua2V5cyA9IGtleXNcbiAgcmV0dXJuIHJlXG59XG5cbi8qKlxuICogR2V0IHRoZSBmbGFncyBmb3IgYSByZWdleHAgZnJvbSB0aGUgb3B0aW9ucy5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZmxhZ3MgKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG9wdGlvbnMuc2Vuc2l0aXZlID8gJycgOiAnaSdcbn1cblxuLyoqXG4gKiBQdWxsIG91dCBrZXlzIGZyb20gYSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7UmVnRXhwfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gcmVnZXhwVG9SZWdleHAgKHBhdGgsIGtleXMpIHtcbiAgLy8gVXNlIGEgbmVnYXRpdmUgbG9va2FoZWFkIHRvIG1hdGNoIG9ubHkgY2FwdHVyaW5nIGdyb3Vwcy5cbiAgdmFyIGdyb3VwcyA9IHBhdGguc291cmNlLm1hdGNoKC9cXCgoPyFcXD8pL2cpXG5cbiAgaWYgKGdyb3Vwcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXlzLnB1c2goe1xuICAgICAgICBuYW1lOiBpLFxuICAgICAgICBwcmVmaXg6IG51bGwsXG4gICAgICAgIGRlbGltaXRlcjogbnVsbCxcbiAgICAgICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgICAgICByZXBlYXQ6IGZhbHNlLFxuICAgICAgICBwYXR0ZXJuOiBudWxsXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhdHRhY2hLZXlzKHBhdGgsIGtleXMpXG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGFycmF5IGludG8gYSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7QXJyYXl9ICBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiBhcnJheVRvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zKSB7XG4gIHZhciBwYXJ0cyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG4gICAgcGFydHMucHVzaChwYXRoVG9SZWdleHAocGF0aFtpXSwga2V5cywgb3B0aW9ucykuc291cmNlKVxuICB9XG5cbiAgdmFyIHJlZ2V4cCA9IG5ldyBSZWdFeHAoJyg/OicgKyBwYXJ0cy5qb2luKCd8JykgKyAnKScsIGZsYWdzKG9wdGlvbnMpKVxuXG4gIHJldHVybiBhdHRhY2hLZXlzKHJlZ2V4cCwga2V5cylcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBwYXRoIHJlZ2V4cCBmcm9tIHN0cmluZyBpbnB1dC5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSAge0FycmF5fSAga2V5c1xuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIHN0cmluZ1RvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zKSB7XG4gIHZhciB0b2tlbnMgPSBwYXJzZShwYXRoKVxuICB2YXIgcmUgPSB0b2tlbnNUb1JlZ0V4cCh0b2tlbnMsIG9wdGlvbnMpXG5cbiAgLy8gQXR0YWNoIGtleXMgYmFjayB0byB0aGUgcmVnZXhwLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgdG9rZW5zW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAga2V5cy5wdXNoKHRva2Vuc1tpXSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhyZSwga2V5cylcbn1cblxuLyoqXG4gKiBFeHBvc2UgYSBmdW5jdGlvbiBmb3IgdGFraW5nIHRva2VucyBhbmQgcmV0dXJuaW5nIGEgUmVnRXhwLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgdG9rZW5zXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiB0b2tlbnNUb1JlZ0V4cCAodG9rZW5zLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMuc3RyaWN0XG4gIHZhciBlbmQgPSBvcHRpb25zLmVuZCAhPT0gZmFsc2VcbiAgdmFyIHJvdXRlID0gJydcbiAgdmFyIGxhc3RUb2tlbiA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1cbiAgdmFyIGVuZHNXaXRoU2xhc2ggPSB0eXBlb2YgbGFzdFRva2VuID09PSAnc3RyaW5nJyAmJiAvXFwvJC8udGVzdChsYXN0VG9rZW4pXG5cbiAgLy8gSXRlcmF0ZSBvdmVyIHRoZSB0b2tlbnMgYW5kIGNyZWF0ZSBvdXIgcmVnZXhwIHN0cmluZy5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdG9rZW4gPSB0b2tlbnNbaV1cblxuICAgIGlmICh0eXBlb2YgdG9rZW4gPT09ICdzdHJpbmcnKSB7XG4gICAgICByb3V0ZSArPSBlc2NhcGVTdHJpbmcodG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBwcmVmaXggPSBlc2NhcGVTdHJpbmcodG9rZW4ucHJlZml4KVxuICAgICAgdmFyIGNhcHR1cmUgPSB0b2tlbi5wYXR0ZXJuXG5cbiAgICAgIGlmICh0b2tlbi5yZXBlYXQpIHtcbiAgICAgICAgY2FwdHVyZSArPSAnKD86JyArIHByZWZpeCArIGNhcHR1cmUgKyAnKSonXG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi5vcHRpb25hbCkge1xuICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgY2FwdHVyZSA9ICcoPzonICsgcHJlZml4ICsgJygnICsgY2FwdHVyZSArICcpKT8nXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FwdHVyZSA9ICcoJyArIGNhcHR1cmUgKyAnKT8nXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhcHR1cmUgPSBwcmVmaXggKyAnKCcgKyBjYXB0dXJlICsgJyknXG4gICAgICB9XG5cbiAgICAgIHJvdXRlICs9IGNhcHR1cmVcbiAgICB9XG4gIH1cblxuICAvLyBJbiBub24tc3RyaWN0IG1vZGUgd2UgYWxsb3cgYSBzbGFzaCBhdCB0aGUgZW5kIG9mIG1hdGNoLiBJZiB0aGUgcGF0aCB0b1xuICAvLyBtYXRjaCBhbHJlYWR5IGVuZHMgd2l0aCBhIHNsYXNoLCB3ZSByZW1vdmUgaXQgZm9yIGNvbnNpc3RlbmN5LiBUaGUgc2xhc2hcbiAgLy8gaXMgdmFsaWQgYXQgdGhlIGVuZCBvZiBhIHBhdGggbWF0Y2gsIG5vdCBpbiB0aGUgbWlkZGxlLiBUaGlzIGlzIGltcG9ydGFudFxuICAvLyBpbiBub24tZW5kaW5nIG1vZGUsIHdoZXJlIFwiL3Rlc3QvXCIgc2hvdWxkbid0IG1hdGNoIFwiL3Rlc3QvL3JvdXRlXCIuXG4gIGlmICghc3RyaWN0KSB7XG4gICAgcm91dGUgPSAoZW5kc1dpdGhTbGFzaCA/IHJvdXRlLnNsaWNlKDAsIC0yKSA6IHJvdXRlKSArICcoPzpcXFxcLyg/PSQpKT8nXG4gIH1cblxuICBpZiAoZW5kKSB7XG4gICAgcm91dGUgKz0gJyQnXG4gIH0gZWxzZSB7XG4gICAgLy8gSW4gbm9uLWVuZGluZyBtb2RlLCB3ZSBuZWVkIHRoZSBjYXB0dXJpbmcgZ3JvdXBzIHRvIG1hdGNoIGFzIG11Y2ggYXNcbiAgICAvLyBwb3NzaWJsZSBieSB1c2luZyBhIHBvc2l0aXZlIGxvb2thaGVhZCB0byB0aGUgZW5kIG9yIG5leHQgcGF0aCBzZWdtZW50LlxuICAgIHJvdXRlICs9IHN0cmljdCAmJiBlbmRzV2l0aFNsYXNoID8gJycgOiAnKD89XFxcXC98JCknXG4gIH1cblxuICByZXR1cm4gbmV3IFJlZ0V4cCgnXicgKyByb3V0ZSwgZmxhZ3Mob3B0aW9ucykpXG59XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuICpcbiAqIEFuIGVtcHR5IGFycmF5IGNhbiBiZSBwYXNzZWQgaW4gZm9yIHRoZSBrZXlzLCB3aGljaCB3aWxsIGhvbGQgdGhlXG4gKiBwbGFjZWhvbGRlciBrZXkgZGVzY3JpcHRpb25zLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC91c2VyLzppZGAsIGBrZXlzYCB3aWxsXG4gKiBjb250YWluIGBbeyBuYW1lOiAnaWQnLCBkZWxpbWl0ZXI6ICcvJywgb3B0aW9uYWw6IGZhbHNlLCByZXBlYXQ6IGZhbHNlIH1dYC5cbiAqXG4gKiBAcGFyYW0gIHsoU3RyaW5nfFJlZ0V4cHxBcnJheSl9IHBhdGhcbiAqIEBwYXJhbSAge0FycmF5fSAgICAgICAgICAgICAgICAgW2tleXNdXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgICAgICAgIFtvcHRpb25zXVxuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiBwYXRoVG9SZWdleHAgKHBhdGgsIGtleXMsIG9wdGlvbnMpIHtcbiAga2V5cyA9IGtleXMgfHwgW11cblxuICBpZiAoIWlzYXJyYXkoa2V5cykpIHtcbiAgICBvcHRpb25zID0ga2V5c1xuICAgIGtleXMgPSBbXVxuICB9IGVsc2UgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9XG4gIH1cblxuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiByZWdleHBUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKVxuICB9XG5cbiAgaWYgKGlzYXJyYXkocGF0aCkpIHtcbiAgICByZXR1cm4gYXJyYXlUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zKVxuICB9XG5cbiAgcmV0dXJuIHN0cmluZ1RvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpXG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIHJldHVybiBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxudmFyIHJuZztcblxudmFyIGNyeXB0byA9IGdsb2JhbC5jcnlwdG8gfHwgZ2xvYmFsLm1zQ3J5cHRvOyAvLyBmb3IgSUUgMTFcbmlmIChjcnlwdG8gJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG4gIHJuZyA9IGZ1bmN0aW9uIHdoYXR3Z1JORygpIHtcbiAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59XG5cbmlmICghcm5nKSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyIHJuZHMgPSBuZXcgQXJyYXkoMTYpO1xuICBybmcgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgcjsgaSA8IDE2OyBpKyspIHtcbiAgICAgIGlmICgoaSAmIDB4MDMpID09PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gcm5kcztcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBybmc7XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcblxuICBpZiAodHlwZW9mKG9wdGlvbnMpID09ICdzdHJpbmcnKSB7XG4gICAgYnVmID0gb3B0aW9ucyA9PSAnYmluYXJ5JyA/IG5ldyBBcnJheSgxNikgOiBudWxsO1xuICAgIG9wdGlvbnMgPSBudWxsO1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBybmRzID0gb3B0aW9ucy5yYW5kb20gfHwgKG9wdGlvbnMucm5nIHx8IHJuZykoKTtcblxuICAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG4gIHJuZHNbNl0gPSAocm5kc1s2XSAmIDB4MGYpIHwgMHg0MDtcbiAgcm5kc1s4XSA9IChybmRzWzhdICYgMHgzZikgfCAweDgwO1xuXG4gIC8vIENvcHkgYnl0ZXMgdG8gYnVmZmVyLCBpZiBwcm92aWRlZFxuICBpZiAoYnVmKSB7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IDE2OyArK2lpKSB7XG4gICAgICBidWZbaSArIGlpXSA9IHJuZHNbaWldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYgfHwgYnl0ZXNUb1V1aWQocm5kcyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjQ7XG4iLCJpbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuY29uc3QgdXVpZHY0ID0gcmVxdWlyZSgndXVpZC92NCcpO1xuXG5jb25zdCBhZGRPcHRpb25Ub0RPTSA9IGZ1bmN0aW9uKGRpY2UsIG9wdGlvbkNvbXBvbmVudCkge1xuICBjb25zb2xlLmxvZygnYWRkIGJ1dHRvbiBwcmVzc2VkJyk7XG4gIGlmICghJCgnLmpzLW9wdGlvbi10ZXh0JykudmFsKCkucmVwbGFjZSgvXFxzL2csICcnKS5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgbmV3SWQgPSB1dWlkdjQoKTtcbiAgY29uc3QgbmV3T3B0aW9uID0gJCgnLmpzLW9wdGlvbi10ZXh0JykudmFsKCk7XG5cbiAgJCgnLmpzLWVkaXQtb3B0aW9ucy1saXN0JykuYXBwZW5kKHJlcGxhY2VBbGwob3B0aW9uQ29tcG9uZW50LCB7J0BvcHRpb24nOiBuZXdPcHRpb259KSk7XG5cbiAgJCgnLmpzLWRlbGV0ZS1vcHRpb24nKS5jbGljayhlID0+IHtcbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICQoZS5jdXJyZW50VGFyZ2V0KS5wYXJlbnQoKS5yZW1vdmUoKTtcbiAgICBkaWNlLmRlbGV0ZU9wdGlvbihuZXdJZClcbiAgfSk7XG5cbiAgJCgnLmpzLW9wdGlvbi10ZXh0JykudmFsKCcnKTtcbiAgZGljZS5hZGRPcHRpb24obmV3SWQsIG5ld09wdGlvbik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHthZGRPcHRpb25Ub0RPTX1cbiIsImltcG9ydCByZXBsYWNlQWxsIGZyb20gJy4vVXRpbHMvU3RyaW5nUmVwbGFjZXInXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuLy8gZ2V0IHRlbXBsYXRlIGZvciBlYWNoIGRlY2lzaW9uIGFuZCBkaXNwbGF5IGl0XG5jb25zdCBjcmVhdGVEZWNpc2lvbkNhcmQgPSAoZGljZSwgY29tcG9uZW50LCBkaWNlQW5pbWF0aW9uKSA9PiB7XG4gIGRlYnVnKCdjcmVhdGVEZWNpc2lvbkNhcmQgd2FzIGNhbGxlZCcpO1xuICBjb25zdCBtYXAgPSB7XG4gICAgJ0B0aXRsZSc6IGRpY2UuZGVjaXNpb24sXG4gICAgJ0BpZCc6IGRpY2UuX2lkLFxuICAgICdAZGVzY3JpcHRpb24nOiBkaWNlLmRlc2NyaXB0aW9uXG4gIH1cbiAgY29uc3QgY2FyZCA9IHJlcGxhY2VBbGwoY29tcG9uZW50LCBtYXApO1xuICAkKCcuanMtbWFpbi1jb250ZW50JykuYXBwZW5kKGNhcmQpO1xuICAkKCcuanMtZGljZS1hbmltYXRpb24nKS5hcHBlbmQoZGljZUFuaW1hdGlvbik7XG4gICQoJy5qcy1yb2xsJykuY2xpY2soKGUpID0+IHtcbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgIGRpY2Uucm9sbCgpXG4gICAgICAudGhlbihyZXN1bHQgPT4gYWxlcnQocmVzdWx0LmNvbnRlbnQpKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7Y3JlYXRlRGVjaXNpb25DYXJkfVxuIiwiaW1wb3J0IERlY2lzaW9uTGlzdFN0YXRlIGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0IFVzZXIgZnJvbSAnLi9Nb2RlbHMvVXNlck1vZGVsJ1xuXG5jb25zdCBkZWxldGVEaWNlID0gZnVuY3Rpb24oZGljZSkge1xuICBVc2VyLmNoZWNrQXV0aCgpXG4gICAgLnRoZW4oKCkgPT4gZGljZS5kZWxldGVGcm9tRGIoKSlcbiAgICAudGhlbigoKSA9PiBkZWxldGVEaWNlRnJvbUNhY2hlKGRpY2UpKVxuICAgIC50aGVuKCgpID0+IHBhZ2UoJy8nKSlcbiAgICAuY2F0Y2goKGVycikgPT4gYWxlcnQoJ2Nhbm5vdCBkZWxldGUgZGljZSBhdCB0aGlzIHRpbWUnKSlcbn1cblxuY29uc3QgZGVsZXRlRGljZUZyb21DYWNoZSA9IChkaWNlKSA9PiBEZWNpc2lvbkxpc3RTdGF0ZS5yZW1vdmVEaWNlQnlJZChkaWNlLl9pZCk7XG5cbmV4cG9ydCBkZWZhdWx0IHtkZWxldGVEaWNlfVxuIiwiaW1wb3J0IHJlcGxhY2VBbGwgZnJvbSAnLi9VdGlscy9TdHJpbmdSZXBsYWNlcidcbmltcG9ydCBBZGRCdXR0b24gZnJvbSAnLi9BZGRCdXR0b24nXG5pbXBvcnQgU2F2ZUJ1dHRvbiBmcm9tICcuL1NhdmVCdXR0b24nXG5pbXBvcnQgRGljZSBmcm9tICcuL01vZGVscy9EaWNlTW9kZWwnXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuY29uc3QgbmV3RGljZSA9IFtdO1xuXG5jb25zdCBjcmVhdGVEaWNlRWRpdFBhZ2UgPSBmdW5jdGlvbihwYWdlTGF5b3V0LCBkaWNlSGVhZGVyQ29tcG9uZW50LCBvcHRpb25Db21wb25lbnQsIHNhdmVCdG4pIHtcbiAgZGVidWcoJ2NyZWF0ZURpY2VFZGl0UGFnZSB3YXMgY2FsbGVkJyk7XG4gIGNvbnN0IGRpY2VNYXAgPSB7XG4gICAgJ0B0aXRsZSc6ICcnLFxuICAgICdAZGVzY3JpcHRpb24nOiAnJ1xuICB9XG4gICQoJy5qcy1tYWluLWNvbnRlbnQnKS5hcHBlbmQocGFnZUxheW91dCk7XG4gICQoJy5qcy1lZGl0LWRpY2UtZmFjZScpLmFwcGVuZChyZXBsYWNlQWxsKGRpY2VIZWFkZXJDb21wb25lbnQsIGRpY2VNYXApKTtcbiAgJCgnLmpzLWVkaXQtZGljZS1vcHRpb24nKS5hcHBlbmQoc2F2ZUJ0bik7XG5cbiAgbGV0IG5ld0RpY2VXb3JraW5nTWVtb3J5ID0ge1xuICAgICdkZWNpc2lvbic6ICduZXcgZGljZScsXG4gICAgJ2Rlc2NyaXB0aW9uJzogJ25ldyBkZXNjcmlwdGlvbicsXG4gICAgJ29wdGlvbnMnOiBbXVxuICB9XG5cbiAgRGljZS5jcmVhdGVNb2NrKG5ld0RpY2VXb3JraW5nTWVtb3J5KVxuICAgIC50aGVuKChkaWNlKSA9PiB7XG4gICAgICBuZXdEaWNlLmxlbmd0aCA9IDA7XG4gICAgICBuZXdEaWNlLnB1c2goZGljZSk7XG4gICAgICAkKCcuanMtYWRkLW9wdGlvbicpLmNsaWNrKCgpID0+IEFkZEJ1dHRvbi5hZGRPcHRpb25Ub0RPTShkaWNlLCBvcHRpb25Db21wb25lbnQpKTtcbiAgICAgICQoJy5qcy1zYXZlLWRpY2UnKS5jbGljaygoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzYXZlIGRpY2UgY2xpY2tlZCcpXG4gICAgICAgIFNhdmVCdXR0b24uc2F2ZURpY2UoXG4gICAgICAgICAgbmV3RGljZVswXSxcbiAgICAgICAgICAkKCcuanMtaW5wdXQtdGl0bGUnKS52YWwoKSxcbiAgICAgICAgICAkKCcuanMtaW5wdXQtZGVzY3JpcHRpb24nKS52YWwoKVxuICAgICAgICApXG4gICAgICB9XG4gICAgICApO1xuICAgIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtjcmVhdGVEaWNlRWRpdFBhZ2V9XG4iLCJpbXBvcnQgQ29tcG9uZW50U3RhdGUgZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQgRGljZUNyZWF0ZVZpZXcgZnJvbSAnLi9EaWNlQ3JlYXRlVmlldydcbmltcG9ydCBVdGlsRnVuYyBmcm9tICcuL1V0aWxzL0NsZWFySFRNTCdcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3QgbmV3RGljZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1lZGl0LXBhZ2UnKSxcbiAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RpY2UtZWRpdC1mYWNlJyksXG4gICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLWVkaXQtb3B0aW9uJyksXG4gICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdzYXZlLWJ1dHRvbicpXG4gICAgXSlcbiAgICAudGhlbigocGF5bG9hZCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocGF5bG9hZCk7XG4gICAgICBVdGlsRnVuYy5jbGVhckh0bWwoJ2pzLW1haW4tY29udGVudCcpO1xuICAgICAgRGljZUNyZWF0ZVZpZXcuY3JlYXRlRGljZUVkaXRQYWdlKHBheWxvYWRbMF0sIHBheWxvYWRbMV0sIHBheWxvYWRbMl0sIHBheWxvYWRbM10pO1xuICAgIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge25ld0RpY2V9XG4iLCJpbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuaW1wb3J0IEFkZEJ1dHRvbiBmcm9tICcuL0FkZEJ1dHRvbi5qcydcbmltcG9ydCBEZWxldGVCdXR0b24gZnJvbSAnLi9EZWxldGVCdXR0b24uanMnXG5pbXBvcnQgU2F2ZUJ1dHRvbiBmcm9tICcuL1NhdmVCdXR0b24uanMnXG5cbmNvbnN0IGNyZWF0ZURpY2VFZGl0UGFnZSA9IGZ1bmN0aW9uKGRpY2UsIHBhZ2VMYXlvdXQsIGRpY2VIZWFkZXJDb21wb25lbnQsIG9wdGlvbkNvbXBvbmVudCwgc2F2ZUJ0biwgZGVsZXRlQnRuKSB7XG4gIGNvbnNvbGUubG9nKCdjcmVhdGVEaWNlRWRpdFBhZ2Ugd2FzIGNhbGxlZCcpO1xuICBjb25zdCBkaWNlTWFwID0ge1xuICAgICdAdGl0bGUnOiBkaWNlLmRlY2lzaW9uLFxuICAgICdAZGVzY3JpcHRpb24nOiBkaWNlLmRlc2NyaXB0aW9uXG4gIH1cbiAgJCgnLmpzLW1haW4tY29udGVudCcpLmFwcGVuZChwYWdlTGF5b3V0KTtcbiAgJCgnLmpzLWVkaXQtZGljZS1mYWNlJykuYXBwZW5kKHJlcGxhY2VBbGwoZGljZUhlYWRlckNvbXBvbmVudCwgZGljZU1hcCkpO1xuICAkKCcuanMtZWRpdC1kaWNlLW9wdGlvbicpLmFwcGVuZChzYXZlQnRuKTtcbiAgJCgnLmpzLWVkaXQtZGljZS1vcHRpb24nKS5hcHBlbmQoZGVsZXRlQnRuKTtcblxuICBkaWNlLm9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICQoJy5qcy1lZGl0LW9wdGlvbnMtbGlzdCcpLmFwcGVuZChyZXBsYWNlQWxsKG9wdGlvbkNvbXBvbmVudCwgeydAb3B0aW9uJzogb3B0aW9uLmNvbnRlbnR9KSk7XG4gICAgJCgnLmpzLWRlbGV0ZS1vcHRpb24nKS5jbGljayhlID0+IHtcbiAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAkKGUuY3VycmVudFRhcmdldCkucGFyZW50KCkucmVtb3ZlKCk7XG4gICAgICBkaWNlLmRlbGV0ZU9wdGlvbihvcHRpb24uZmFjZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gICQoJy5qcy1hZGQtb3B0aW9uJykuY2xpY2soKCkgPT4gQWRkQnV0dG9uLmFkZE9wdGlvblRvRE9NKGRpY2UsIG9wdGlvbkNvbXBvbmVudCkpO1xuICAkKCcuanMtc2F2ZS1kaWNlJykuY2xpY2soKCkgPT4gU2F2ZUJ1dHRvbi51cGRhdGVEaWNlKGRpY2UsICQoJy5qcy1pbnB1dC10aXRsZScpLnZhbCgpLCAkKCcuanMtaW5wdXQtZGVzY3JpcHRpb24nKS52YWwoKSkpO1xuICAkKCcuanMtZGVsZXRlLWRpY2UnKS5jbGljaygoKSA9PiBEZWxldGVCdXR0b24uZGVsZXRlRGljZShkaWNlKSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge2NyZWF0ZURpY2VFZGl0UGFnZX1cbiIsImltcG9ydCBEZWNpc2lvbkxpc3RTdGF0ZSBmcm9tICcuL01vZGVscy9EZWNpc2lvbkxpc3RTdGF0ZSdcbmltcG9ydCBDb21wb25lbnRTdGF0ZSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCBVc2VyIGZyb20gJy4vTW9kZWxzL1VzZXJNb2RlbCdcbmltcG9ydCBEaWNlRWRpdFZpZXcgZnJvbSAnLi9EaWNlRWRpdFZpZXcnXG5pbXBvcnQgVXRpbEZ1bmMgZnJvbSAnLi9VdGlscy9DbGVhckhUTUwnXG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IGRpY2VFZGl0VmlldyA9IChjdHgpID0+IHtcblxuICBVc2VyLmNoZWNrQXV0aCgpO1xuXG4gIGNvbnN0IGlkID0gY3R4LnBhcmFtcy5kZWNpc2lvbklkO1xuICBjb25zb2xlLmxvZyhgaWQgPSAke2lkfWApO1xuICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgRGVjaXNpb25MaXN0U3RhdGUuZ2V0RGljZUJ5SWQoY3R4LnBhcmFtcy5kZWNpc2lvbklkKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1lZGl0LXBhZ2UnKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1lZGl0LWZhY2UnKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1lZGl0LW9wdGlvbicpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdzYXZlLWJ1dHRvbicpLFxuICAgICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkZWxldGUtYnV0dG9uJylcbiAgICBdKVxuICAgIC50aGVuKChkYXRhKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgIGlmICghZGF0YVswXSkge1xuICAgICAgICBjb25zb2xlLmxvZygndGhlcmUgaXMgbm8gZGljZSBkYXRhJyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gZGF0YScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgVXRpbEZ1bmMuY2xlYXJIdG1sKCdqcy1tYWluLWNvbnRlbnQnKVxuICAgICAgICBEaWNlRWRpdFZpZXcuY3JlYXRlRGljZUVkaXRQYWdlKGRhdGFbMF0sIGRhdGFbMV0sIGRhdGFbMl0sIGRhdGFbM10sIGRhdGFbNF0sIGRhdGFbNV0pO1xuICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRGljZVZpZXdcbmV4cG9ydCBkZWZhdWx0IHtkaWNlRWRpdFZpZXd9XG4iLCJpbXBvcnQgcmVwbGFjZUFsbCBmcm9tICcuL1V0aWxzL1N0cmluZ1JlcGxhY2VyJ1xuXG5jb25zdCBjcmVhdGVEaWNlUGFnZSA9IGZ1bmN0aW9uKGRpY2UsIHBhZ2VMYXlvdXQsIGRpY2VDb21wb25lbnQsIG9wdGlvbkNvbXBvbmVudCwgZWRpdEJ0bikge1xuICBjb25zb2xlLmxvZygnY3JlYXRlRGljZVBhZ2Ugd2FzIGNhbGxlZCcpO1xuICBjb25zdCBkaWNlTWFwID0ge1xuICAgICdAdGl0bGUnOiBkaWNlLmRlY2lzaW9uLFxuICAgICdAZGVzY3JpcHRpb24nOiBkaWNlLmRlc2NyaXB0aW9uLFxuICAgICdAaWQnOiBkaWNlLl9pZFxuICB9XG4gIGNvbnN0IGRpY2VGYWNlID0gcmVwbGFjZUFsbChkaWNlQ29tcG9uZW50LCBkaWNlTWFwKTtcbiAgJCgnLmpzLW1haW4tY29udGVudCcpLmFwcGVuZChwYWdlTGF5b3V0KTtcbiAgJCgnLmpzLWRpY2UtZmFjZScpLmFwcGVuZChkaWNlRmFjZSk7XG4gICQoJy5qcy1yb2xsJykuY2xpY2soKGUpID0+IHtcbiAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgIGRpY2Uucm9sbCgpLnRoZW4ocmVzdWx0ID0+IGFsZXJ0KHJlc3VsdC5jb250ZW50KSk7XG4gIH0pO1xuXG4gIGlmKGVkaXRCdG4pIHtcbiAgICBjb25zdCBlZGl0TWFwID0ge1xuICAgICAgJ0BpZCc6IGRpY2UuX2lkXG4gICAgfVxuICAgIGNvbnN0IGVkaXRCdXR0b24gPSByZXBsYWNlQWxsKGVkaXRCdG4sIGVkaXRNYXApXG4gICAgJCgnLmpzLWRpY2Utb3B0aW9uJykuYXBwZW5kKGVkaXRCdXR0b24pO1xuICB9XG5cbiAgZGljZS5vcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAkKCcuanMtb3B0aW9ucy1saXN0JykuYXBwZW5kKHJlcGxhY2VBbGwob3B0aW9uQ29tcG9uZW50LCB7J0BvcHRpb24nOiBvcHRpb24uY29udGVudH0pKTtcbiAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge2NyZWF0ZURpY2VQYWdlfVxuIiwiaW1wb3J0IERlY2lzaW9uTGlzdFN0YXRlIGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0IENvbXBvbmVudFN0YXRlIGZyb20gJy4vTW9kZWxzL0NvbXBvbmVudFN0YXRlJ1xuaW1wb3J0IFVzZXJTdGF0ZSBmcm9tICcuL01vZGVscy9Vc2VyU3RhdGUnXG5pbXBvcnQgRGljZVBhZ2VWaWV3IGZyb20gJy4vRGljZVBhZ2VWaWV3J1xuaW1wb3J0IFV0aWxGdW5jIGZyb20gJy4vVXRpbHMvQ2xlYXJIVE1MJ1xuXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3QgZGljZVZpZXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgY29uc3QgaWQgPSBjdHgucGFyYW1zLmRlY2lzaW9uSWQ7XG4gIGNvbnN0IHVzZXIgPSBVc2VyU3RhdGUuZ2V0U3RhdGUoKTtcbiAgZGVidWcoYGlkID0gJHtpZH1gKTtcbiAgY29uc3QgYXN5bmNPcGVyYXRpb25zID0gW1xuICAgIERlY2lzaW9uTGlzdFN0YXRlLmdldERpY2VCeUlkKGN0eC5wYXJhbXMuZGVjaXNpb25JZCksXG4gICAgQ29tcG9uZW50U3RhdGUuZ2V0Q29tcG9uZW50KCdkaWNlLXBhZ2UnKSxcbiAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RpY2UtZmFjZScpLFxuICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1vcHRpb24nKVxuICBdXG5cbiAgaWYgKHVzZXIpIHtcbiAgICBpZiAodXNlci5kZWNpc2lvbl9pZC5pbmNsdWRlcyhpZCkpIHtcbiAgICAgIGFzeW5jT3BlcmF0aW9ucy5wdXNoKENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZWRpdC1idXR0b24nKSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gUHJvbWlzZS5hbGwoYXN5bmNPcGVyYXRpb25zKVxuICAgIC50aGVuKChwYXlsb2FkKSA9PiB7XG4gICAgICBpZiAoIXBheWxvYWRbMF0pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3RoZXJlIGlzIG5vIGRpY2UgZGF0YScpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIGRhdGEnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFV0aWxGdW5jLmNsZWFySHRtbCgnanMtbWFpbi1jb250ZW50Jyk7XG4gICAgICAgIERpY2VQYWdlVmlldy5jcmVhdGVEaWNlUGFnZShwYXlsb2FkWzBdLCBwYXlsb2FkWzFdLCBwYXlsb2FkWzJdLCBwYXlsb2FkWzNdLCBwYXlsb2FkWzRdKTtcbiAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IERpY2VWaWV3XG5leHBvcnQgZGVmYXVsdCB7ZGljZVZpZXd9XG4iLCJpbXBvcnQgRGVjaXNpb25MaXN0U3RhdGUgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQgQ29tcG9uZW50U3RhdGUgZnJvbSAnLi9Nb2RlbHMvQ29tcG9uZW50U3RhdGUnXG5pbXBvcnQgRGVjaXNpb25DYXJkVmlldyBmcm9tICcuL0RlY2lzaW9uQ2FyZFZpZXcnXG5pbXBvcnQgVXRpbEZ1bmMgZnJvbSAnLi9VdGlscy9DbGVhckhUTUwnXG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSdcblxuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdkaWNlJyk7XG5cbi8vIGNyZWF0ZSB0aGUgaG9tZSBwYWdlXG4vLyBjb250cm9sIGZldGNoaW5nIGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgYW5kIGlucHV0IGFzIGh0bWxcbmNvbnN0IHZpZXdIb21lID0gZnVuY3Rpb24oKSB7XG4gIGRlYnVnKCd2aWV3SG9tZSBzdGFydGluZycpO1xuXG4gIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICBEZWNpc2lvbkxpc3RTdGF0ZS5nZXREaWNlKCksXG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RlY2lzaW9uLWNhcmQnKSxcbiAgICAgIENvbXBvbmVudFN0YXRlLmdldENvbXBvbmVudCgnZGljZS1hbmltYXRpb24nKVxuICAgIF0pXG4gICAgLnRoZW4oKHBheWxvYWQpID0+IHtcbiAgICAgIGRlYnVnKHBheWxvYWQpO1xuICAgICAgaWYgKHBheWxvYWRbMF0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlYnVnKCd0aGVyZSBpcyBubyBkYXRhJyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gZGF0YScpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIFV0aWxGdW5jLmNsZWFySHRtbCgnanMtbWFpbi1jb250ZW50Jyk7XG4gICAgICAgIHBheWxvYWRbMF0uZm9yRWFjaChkaWNlID0+IHtcbiAgICAgICAgICBEZWNpc2lvbkNhcmRWaWV3LmNyZWF0ZURlY2lzaW9uQ2FyZChkaWNlLCBwYXlsb2FkWzFdLCBwYXlsb2FkWzJdKTtcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHt2aWV3SG9tZX1cbiIsImltcG9ydCB7QkFTRV9VUkwsIFBPUlR9IGZyb20gJy4uL1V0aWxzL2NvbnN0YW50cydcblxuY29uc3QgQ09NUE9ORU5UU19PQkogPSB7fTtcblxuLy8gYWRkIGNvbXBvbmVudCB0byBDT01QT05FTlRTX09CSiBmb3IgY2FjaGluZ1xuY29uc3QgYWRkQ29tcG9uZW50VG9TdGF0ZSA9IChrZXksIGNvbXBvbmVudCkgPT4ge1xuICBDT01QT05FTlRTX09CSltrZXldID0gY29tcG9uZW50O1xufVxuXG4vLyByZXR1cm4gYSBDT01QT05FTlQgYnkga2V5IGZyb20gaW4tbWVtb3J5XG5jb25zdCBnZXRDb21wb25lbnQgPSAoa2V5KSA9PiB7XG4gIGNvbnNvbGUubG9nKCdnZXRDb21wb25lbnQgd2FzIGNhbGxlZCcpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChDT01QT05FTlRTX09CSltrZXldKSB7XG4gICAgICByZXMoQ09NUE9ORU5UU19PQkpba2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldENvbXBvbmVudEFQSShrZXkpLnRoZW4oKCkgPT4gcmVzKENPTVBPTkVOVFNfT0JKW2tleV0pKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBnZXQgY29tcG9uZW50IHRlbXBsYXRlcyBmcm9tIGFwaVxuY29uc3QgZ2V0Q29tcG9uZW50QVBJID0gKG5hbWUpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGAvc3RhdGljLyR7bmFtZX0uaHRtbGA7XG4gICAgY29uc3QgdXJsU3RyaW5nID0gYCR7dGFyZ2V0fWA7XG4gICAgJC5hamF4KHt1cmw6IHVybFN0cmluZ30pXG4gICAgICAuZG9uZSgoY29tcG9uZW50KSA9PiB7XG4gICAgICAgIGFkZENvbXBvbmVudFRvU3RhdGUobmFtZSwgY29tcG9uZW50KTtcbiAgICAgICAgcmVzKGNvbXBvbmVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0pXG4gICAgICAuZmFpbCgoZXJyKSA9PiB7cmVqKGBjYW5ub3QgZ2V0IGNvbXBvbmVudCAtIEVycm9yOiAke2Vycn1gKX0pO1xuICB9KVxufTtcblxuZXhwb3J0IGRlZmF1bHQge2dldENvbXBvbmVudH07XG4iLCJpbXBvcnQgRGljZSBmcm9tICcuL0RpY2VNb2RlbCdcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG5jb25zdCBERUNJU0lPTl9MSVNUID0gW107XG5cbi8vIGFkZCBkaWNlIHRvIGRlY2lzaW9uIGxpc3RcbmNvbnN0IGFkZERpY2UgPSAoZGljZSkgPT4ge0RFQ0lTSU9OX0xJU1QucHVzaChuZXcgRGljZShkaWNlKSl9O1xuXG4vLyByZW1vdmUgZGljZSBmcm9tIGRlY2lzaW9uIGxpc3QgYnkgSURcbmNvbnN0IHJlbW92ZURpY2VCeUlkID0gKGRpY2VfaWQpID0+IHtcbiAgREVDSVNJT05fTElTVC5zcGxpY2UoREVDSVNJT05fTElTVC5pbmRleE9mKERFQ0lTSU9OX0xJU1QuZmluZChkaWNlID0+IGRpY2UuX2lkID09PSBkaWNlX2lkKSksIDEpO1xufTtcblxuLy8gcmVtb3ZlIGFsbCBkaWNlIHRvIGRlY2lzaW9uIGxpc3RcbmNvbnN0IHJlbW92ZUFsbERpY2UgPSAoKSA9PiB7REVDSVNJT05fTElTVC5sZW5ndGggPSAwfTtcblxuLy8gcmV0dXJuIGEgbGlzdCBvZiBkaWNlIGZyb20gaW4tbWVtb3J5XG5jb25zdCBnZXREaWNlID0gKGlkQXJyYXkpID0+IHtcbiAgZGVidWcoJ2dldERpY2Ugd2FzIGNhbGxlZCcpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChERUNJU0lPTl9MSVNULmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmVzKCFpZEFycmF5ID8gREVDSVNJT05fTElTVCA6IERFQ0lTSU9OX0xJU1QuZmlsdGVyKGQgPT4gaWRBcnJheS5pbmNsdWRlcyhkLl9pZCkpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0RGVjaXNpb25MaXN0QXBpKClcbiAgICAgICAgLnRoZW4oKCkgPT4gcmVzKCFpZEFycmF5ID8gREVDSVNJT05fTElTVCA6IERFQ0lTSU9OX0xJU1QuZmlsdGVyKGQgPT4gaWRBcnJheS5pbmNsdWRlcyhkLl9pZCkpKSk7XG4gICAgfVxuICB9KVxufVxuXG4vLyByZXR1cm4gYSBzaW5nbGUgZGljZSBmcm9tIGluLW1lbW9yeVxuY29uc3QgZ2V0RGljZUJ5SWQgPSAoZGVjaXNpb25JZCkgPT4ge1xuICBkZWJ1ZygnZ2V0RGljZUJ5SWQgd2FzIGNhbGxlZCcpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIGlmIChERUNJU0lPTl9MSVNULmxlbmd0aCAhPT0gMCkge1xuICAgICAgcmVzKERFQ0lTSU9OX0xJU1QuZmluZChkaWNlID0+IGRpY2UuX2lkID09PSBkZWNpc2lvbklkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdldERlY2lzaW9uTGlzdEFwaSgpLnRoZW4oKCkgPT4gcmVzKERFQ0lTSU9OX0xJU1QuZmluZChkaWNlID0+IGRpY2UuX2lkID09PSBkZWNpc2lvbklkKSkpO1xuICAgIH1cbiAgfSlcbn1cblxuLy8gZ2V0IGxpc3RzIG9mIGRlY2lzaW9uIGRpY2UgZnJvbSBhcGlcbmNvbnN0IGdldERlY2lzaW9uTGlzdEFwaSA9IGZ1bmN0aW9uKCkge1xuICBkZWJ1ZygnZ2V0RGVjaXNpb25MaXN0QXBpIHdhcyBjYWxsZWQnKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9ICcvZGVjaXNpb25zJztcbiAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAkLmFqYXgoe3VybDogdXJsU3RyaW5nfSlcbiAgICAgIC5kb25lKGFsbERpY2VJbmZvID0+IHtcbiAgICAgICAgYWxsRGljZUluZm8uZm9yRWFjaChkZWNpc2lvbiA9PiBhZGREaWNlKGRlY2lzaW9uKSlcbiAgICAgICAgcmVzKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0pXG4gICAgICAuZmFpbChlcnIgPT4ge3JlaihgY2Fubm90IGdldCBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApfSk7XG4gIH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCB7YWRkRGljZSwgcmVtb3ZlQWxsRGljZSwgcmVtb3ZlRGljZUJ5SWQsIGdldERpY2UsIGdldERpY2VCeUlkLCBnZXREZWNpc2lvbkxpc3RBcGl9O1xuIiwiaW1wb3J0IGdldFJhbmRvbU51bWJlciBmcm9tICcuLi9VdGlscy9SYW5kb21OR2VuZXJhdG9yJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGljZSB7XG5cbiAgY29uc3RydWN0b3IgKGRlY2lzaW9uKSB7XG4gICAgO1snX2lkJywgJ2RlY2lzaW9uJywgJ2Rlc2NyaXB0aW9uJywgJ29wdGlvbnMnXS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoIWRlY2lzaW9uLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXJhbWV0ZXIgJHtrZXl9IGlzICByZXF1aXJlZC5gKTtcbiAgICAgIH1cbiAgICAgIHRoaXNba2V5XSA9IGRlY2lzaW9uW2tleV07XG4gICAgfSlcbiAgfVxuXG4gIHJvbGwgKCkge1xuICAgIHJldHVybiBnZXRSYW5kb21OdW1iZXIoMCwgdGhpcy5vcHRpb25zLmxlbmd0aClcbiAgICAgIC50aGVuKGNob3Nlbk9wdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnNbY2hvc2VuT3B0aW9uXTtcbiAgICAgIH0pXG4gIH1cblxuICBkZWxldGVPcHRpb24gKG9wdGlvbklkKSB7XG4gICAgdGhpcy5vcHRpb25zLnNwbGljZShcbiAgICAgIHRoaXMub3B0aW9ucy5pbmRleE9mKFxuICAgICAgICB0aGlzLm9wdGlvbnMuZmluZChvcHQgPT4gb3B0LmZhY2UgPT09IG9wdGlvbklkKVxuICAgICAgKSwgMVxuICAgICk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgYWRkT3B0aW9uIChvcHRpb25JZCwgb3B0aW9uQ29udGVudCkge1xuICAgIHRoaXMub3B0aW9ucy5wdXNoKHtcbiAgICAgIGZhY2U6IG9wdGlvbklkLFxuICAgICAgY29udGVudDogb3B0aW9uQ29udGVudFxuICAgIH0pXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc2F2ZVRvRGIgKG5ld1RpdGxlLCBuZXdEZXNjcmlwdGlvbikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIHRoaXMuZGVjaXNpb24gPSBuZXdUaXRsZTtcbiAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBuZXdEZXNjcmlwdGlvbjtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvZGVjaXNpb25zLyR7dGhpcy5faWR9YDtcbiAgICAgIGNvbnN0IHVybFN0cmluZyA9IGAke3RhcmdldH1gO1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgXCJkZWNpc2lvblwiOiBuZXdUaXRsZSxcbiAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogbmV3RGVzY3JpcHRpb24sXG4gICAgICAgICAgICBcIm9wdGlvbnNcIjogdGhpcy5vcHRpb25zXG4gICAgICAgICAgfSksXG4gICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgICB9KVxuICAgICAgICAuZG9uZSgoKSA9PiByZXMoKSlcbiAgICAgICAgLmZhaWwoZXJyID0+IHJlaihgY2Fubm90IHVwZGF0ZSBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApKTtcbiAgICB9KVxuICB9XG5cbiAgZGVsZXRlRnJvbURiICgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBgL2RlY2lzaW9ucy8ke3RoaXMuX2lkfWA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnREVMRVRFJ1xuICAgICAgICB9KVxuICAgICAgICAuZG9uZSgoKSA9PiByZXMoKSlcbiAgICAgICAgLmZhaWwoZXJyID0+IHJlaihgY2Fubm90IGRlbGV0ZSBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApKTtcbiAgICB9KVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZU1vY2sgKGRpY2VJbmZvKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgcmVzKCBuZXcgRGljZSh7XG4gICAgICAgIF9pZDogMTAwMDAwMDEsXG4gICAgICAgIGRlY2lzaW9uOiBkaWNlSW5mby5kZWNpc2lvbixcbiAgICAgICAgZGVzY3JpcHRpb246IGRpY2VJbmZvLmRlc2NyaXB0aW9uLFxuICAgICAgICBvcHRpb25zOiBkaWNlSW5mby5vcHRpb25zXG4gICAgICB9KSlcbiAgICB9KVxuICB9XG5cbiAgc3RhdGljIGNyZWF0ZSAoZGljZUluZm8pIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBgL2RlY2lzaW9ucy9uZXdgO1xuICAgICAgY29uc3QgdXJsU3RyaW5nID0gYCR7dGFyZ2V0fWA7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogdXJsU3RyaW5nLFxuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRpY2VJbmZvKSxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKChwYXlsb2FkKSA9PiB7XG4gICAgICAgICAgcmVzKG5ldyBEaWNlKHBheWxvYWQpKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSlcbiAgICAgICAgLmZhaWwoZXJyID0+IHJlaihgY2Fubm90IGNyZWF0ZSBkaWNlIC0gRXJyb3I6ICR7ZXJyfWApKTtcbiAgICAgIH0pXG4gIH1cblxuICBzdGF0aWMgbG9hZCAoZGljZUlkKSB7XG4gICAgLy8gZ2V0IGRpY2Ugc29tZWhvdyBmcm9tIEFQSSBhbmQgcmV0dXJuIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggYSBEaWNlXG4gICAgLy8gaW5zdGFuY2VcbiAgICByZXR1cm4galF1ZXJ5LmFqYXgoJ2FzZGYnLCB7XG4gICAgICBkYXRhOiB7XG4gICAgICAgIGlkOiBkaWNlSWRcbiAgICAgIH1cbiAgICB9KVxuICAgICAgLnRoZW4ocGF5bG9hZCA9PiBuZXcgRGljZShwYXlsb2FkKSlcbiAgfVxuXG4gIHN0YXRpYyBzYXZlIChkaWNlKSB7fVxuXG4gIHN0YXRpYyBkZWxldGUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGZpbmQgKHBhcmFtcykge31cblxufVxuLy9cbi8vIERpY2UubG9hZCgxKVxuLy8gICAudGhlbihkaWNlID0+IGNvbnNvbGUubG9nKGRpY2UuX2lkKSlcbi8vICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpXG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBVc2VyIHtcblxuICBjb25zdHJ1Y3RvciAodXNlcikge1xuICAgIDtbJ19pZCcsICd1c2VybmFtZScsICdkZWNpc2lvbl9pZCddLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmICghdXNlci5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUGFyYW1ldGVyICR7a2V5fSBpcyAgcmVxdWlyZWQuYCk7XG4gICAgICB9XG4gICAgICB0aGlzW2tleV0gPSB1c2VyW2tleV07XG4gICAgfSlcbiAgfVxuXG4gIHNhdmVEaWNlSWRUb0RiIChkaWNlSWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICB0aGlzLmRlY2lzaW9uX2lkLnB1c2goZGljZUlkKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvdXNlci9hZGQtZGljZWA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgZGljZSBpZCB0byBkYicpO1xuICAgICAgJC5hamF4KHtcbiAgICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgXCJfaWRcIjogdGhpcy5faWQsXG4gICAgICAgICAgICBcImRlY2lzaW9uX2lkXCI6IHRoaXMuZGVjaXNpb25faWRcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKCgpID0+IHJlcygpKVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGVycikpO1xuICAgIH0pXG4gIH1cblxuICBzdGF0aWMgY3JlYXRlICh1c2VybmFtZSwgcGFzc3dvcmQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBgL3VzZXJgO1xuICAgICAgY29uc3QgdXJsU3RyaW5nID0gYCR7dGFyZ2V0fWA7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogdXJsU3RyaW5nLFxuICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICd1c2VybmFtZSc6IHVzZXJuYW1lLFxuICAgICAgICAgICAgJ3Bhc3N3b3JkJzogcGFzc3dvcmRcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiXG4gICAgICAgIH0pXG4gICAgICAgIC5kb25lKCh1c2VyX2lkKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ3NpZ251cCBzdWNjZXNzZnVsJylcbiAgICAgICAgICByZXMoVXNlci5zaWduSW4odXNlcm5hbWUsIHBhc3N3b3JkKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3QgY3JlYXRlIHVzZXIgLSBFcnJvcjogJHtlcnJ9YCkpO1xuICAgICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBzaWduSW4gKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGAvdXNlci9sb2dpbmA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgJ3VzZXJuYW1lJzogdXNlcm5hbWUsXG4gICAgICAgICAgICAncGFzc3dvcmQnOiBwYXNzd29yZFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgfSlcbiAgICAgICAgLmRvbmUoKHBheWxvYWQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnc2lnbmluIHN1Y2Nlc3NmdWwnKVxuICAgICAgICAgIGNvbnNvbGUubG9nKHBheWxvYWQpXG4gICAgICAgICAgcmVzKG5ldyBVc2VyKHtcbiAgICAgICAgICAgIF9pZDogcGF5bG9hZC5faWQsXG4gICAgICAgICAgICB1c2VybmFtZTogcGF5bG9hZC51c2VybmFtZSxcbiAgICAgICAgICAgIGRlY2lzaW9uX2lkOiBwYXlsb2FkLmRlY2lzaW9uX2lkXG4gICAgICAgICAgfSkpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3Qgc2lnbiBpbiAtIEVycm9yOiAke2Vycn1gKSk7XG4gICAgICB9KVxuICB9XG5cbiAgc3RhdGljIGxvZ091dCAoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gYC91c2VyL2xvZ291dGA7XG4gICAgICBjb25zdCB1cmxTdHJpbmcgPSBgJHt0YXJnZXR9YDtcbiAgICAgICQuYWpheCh7XG4gICAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICB9KVxuICAgICAgICAuZG9uZSgocGF5bG9hZCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdzaWdub3V0IHN1Y2Nlc3NmdWwnKVxuICAgICAgICAgIHJlcygpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9KVxuICAgICAgICAuZmFpbChlcnIgPT4gcmVqKGBjYW5ub3QgbG9nIG91dCAtIEVycm9yOiAke2Vycn1gKSk7XG4gICAgICB9KVxuICB9XG5cbiAgc3RhdGljIGNoZWNrQXV0aCAoKSB7XG4gICAgY29uc29sZS5sb2coJ3VzZXIgbW9kZWwgaXMgY2FsbGVkJylcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBgL3VzZXIvY2hlY2stYXV0aGVudGljYXRpb25gO1xuICAgICAgY29uc3QgdXJsU3RyaW5nID0gYCR7dGFyZ2V0fWA7XG4gICAgICAkLmFqYXgoe1xuICAgICAgICAgIHVybDogdXJsU3RyaW5nLFxuICAgICAgICAgIG1ldGhvZDogJ0dFVCdcbiAgICAgICAgfSlcbiAgICAgICAgLmRvbmUoKHBheWxvYWQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygndXNlciBhdXRoZW50aWNhdGlvbiBpcyBzdWNjZXNzZnVsJylcbiAgICAgICAgICByZXMocGF5bG9hZClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC5mYWlsKGVyciA9PiByZWooYHVzZXIgaXMgbm90IGF1dGhlbnRpY2F0ZWQgLSBFcnJvcjogJHtlcnJ9YCkpO1xuICAgICAgfSlcbiAgfVxuXG4gIHN0YXRpYyBzYXZlIChkaWNlKSB7fVxuXG4gIHN0YXRpYyBkZWxldGUgKGRpY2UpIHt9XG5cbiAgc3RhdGljIGZpbmQgKHBhcmFtcykge31cblxufVxuIiwiaW1wb3J0IFVzZXIgZnJvbSAnLi9Vc2VyTW9kZWwnXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuY29uc3QgVVNFUl9TVEFURSA9IFtdO1xuXG5jb25zdCBhZGRVc2VyID0gKHVzZXIpID0+IHtcbiAgZGVidWcodXNlcik7XG4gIFVTRVJfU1RBVEUucHVzaCh1c2VyKVxuICBkZWJ1ZygnVVNFUl9TVEFURSBhZGRlZCcpO1xuICBkZWJ1ZyhVU0VSX1NUQVRFKTtcbn07XG5cbmNvbnN0IHJlbW92ZVVzZXIgPSAoKSA9PiB7XG4gIFVTRVJfU1RBVEUubGVuZ3RoID0gMDtcbiAgZGVidWcoJ1VTRVJfU1RBVEUgcmVtb3ZlZCcpO1xuICBkZWJ1ZyhVU0VSX1NUQVRFKTtcbn07XG5cbi8vIGFkZCBkaWNlX2lkIHRvIHVzZXIgZGVjaXNpb25faWQgbGlzdFxuY29uc3QgYWRkRGljZUlkID0gKGRpY2VJZCkgPT4ge1xuICBkZWJ1ZygnYWRkaW5nIGRpY2UgaWQgdG8gdXNlciBzdGF0ZScpXG4gIFVTRVJfU1RBVEVbMF0uZGVjaXNpb25faWQucHVzaChkaWNlSWQpXG59O1xuXG5jb25zdCBnZXRTdGF0ZSA9ICgpID0+IFVTRVJfU1RBVEVbMF07XG5cbmNvbnN0IGdldFN0YXRlQXJyYXkgPSAoKSA9PiBVU0VSX1NUQVRFO1xuXG5leHBvcnQgZGVmYXVsdCB7YWRkVXNlciwgcmVtb3ZlVXNlciwgYWRkRGljZUlkLCBnZXRTdGF0ZSwgZ2V0U3RhdGVBcnJheX07XG4iLCJpbXBvcnQgU2lnblVwQnV0dG9uIGZyb20gJy4vU2lnblVwQnV0dG9uJ1xuaW1wb3J0IFNpZ25JbkJ1dHRvbiBmcm9tICcuL1NpZ25JbkJ1dHRvbidcbmltcG9ydCBTaWduT3V0QnV0dG9uIGZyb20gJy4vU2lnbk91dEJ1dHRvbidcbmltcG9ydCBDb21wb25lbnRTdGF0ZSBmcm9tICcuL01vZGVscy9Db21wb25lbnRTdGF0ZSdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuXG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2RpY2UnKTtcblxuLy8gY3JlYXRlIHRoZSBob21lIHBhZ2Vcbi8vIGNvbnRyb2wgZmV0Y2hpbmcgbGlzdHMgb2YgZGVjaXNpb24gZGljZSBhbmQgaW5wdXQgYXMgaHRtbFxuY29uc3QgYWRkTmF2QmFyRnVuY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gIGRlYnVnKCdlcXVpcCBuYXYgYmFyIHdpdGggZnVuY3Rpb25hbGl0aWVzIC9zaWduLXVwIC9zaWduLWluIC9zaWduLW91dCcpO1xuXG4gIGlmKCQoJy5qcy1zaWduLXVwJykpIHtcbiAgICAkKCcuanMtc2lnbi11cCcpLmNsaWNrKChlKSA9PiB7XG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ3NpZ24tdXAtZm9ybScpXG4gICAgICAgIC50aGVuKHBheWxvYWQgPT4gU2lnblVwQnV0dG9uLnZpZXdTaWduVXBGb3JtKHBheWxvYWQpKVxuICAgIH0pO1xuICB9XG5cbiAgJCgnLmpzLXNpZ24taW4tb3V0JykuY2xpY2soKGUpID0+IHtcbiAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLnRleHQoKSA9PT0gJ1NJR04gSU4nKSB7XG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ3NpZ24taW4tZm9ybScpXG4gICAgICAgIC50aGVuKHBheWxvYWQgPT4gU2lnbkluQnV0dG9uLnZpZXdTaWduSW5Gb3JtKHBheWxvYWQpKVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIFNpZ25PdXRCdXR0b24uc2lnbk91dCgpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5jb25zdCBhZGRVc2VyUGFnZVRvTmF2ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHVzZXIgPSBVc2VyU3RhdGUuZ2V0U3RhdGUoKTtcbiAgJCgnLmpzLXVzZXItcGFnZScpLnRleHQodXNlci51c2VybmFtZSk7XG4gICQoJy5qcy11c2VyLXBhZ2UnKS5jbGljaygoZSkgPT4ge1xuICAgIC8vIGUucHJldmVudERlZmF1bHQoKVxuICAgIC8vIHBhZ2UoYC9wcm9maWxlYClcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHthZGROYXZCYXJGdW5jdGlvbnMsIGFkZFVzZXJQYWdlVG9OYXZ9XG4iLCJpbXBvcnQgRGVjaXNpb25MaXN0U3RhdGUgZnJvbSAnLi9Nb2RlbHMvRGVjaXNpb25MaXN0U3RhdGUnXG5pbXBvcnQgRGljZSBmcm9tICcuL01vZGVscy9EaWNlTW9kZWwnXG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSdcblxuY29uc3Qgc2F2ZURpY2UgPSBmdW5jdGlvbihkaWNlSW5zdGFuY2UsIHRpdGxlLCBkZXNjcmlwdGlvbikge1xuICBpZihkaWNlSW5zdGFuY2Uub3B0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICBhbGVydCgncGxlYXNlIGlucHV0IHNvbWUgb3B0aW9ucycpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aXRsZSA9PT0gJycgfHwgZGVzY3JpcHRpb24gPT09ICcnKSB7XG4gICAgYWxlcnQoJ3BsZWFzZSBpbnB1dCBib3RoIHRpdGxlIGFuZCBkZXNjcmlwdGlvbicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHVzZXIgPSBVc2VyU3RhdGUuZ2V0U3RhdGUoKTtcbiAgRGljZS5jcmVhdGUoe1xuICAgICAgJ2RlY2lzaW9uJzogdGl0bGUsXG4gICAgICAnZGVzY3JpcHRpb24nOiBkZXNjcmlwdGlvbixcbiAgICAgICdvcHRpb25zJzogZGljZUluc3RhbmNlLm9wdGlvbnNcbiAgICB9KVxuICAgIC50aGVuKChuZXdEaWNlKSA9PiB7XG4gICAgICBpZiAodXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZygndXNlciBleGlzdCcpXG4gICAgICAgIGNvbnNvbGUubG9nKHVzZXIpXG4gICAgICAgIC8vIFVzZXJTdGF0ZS5hZGREaWNlSWQobmV3RGljZS5faWQpO1xuICAgICAgICB1c2VyLnNhdmVEaWNlSWRUb0RiKG5ld0RpY2UuX2lkKTtcbiAgICAgIH1cbiAgICAgIC8vIERlY2lzaW9uTGlzdFN0YXRlLmFkZERpY2UobmV3RGljZSk7XG4gICAgICBwYWdlKGAvZGljZS8ke25ld0RpY2UuX2lkfWApO1xuICAgIH0pXG4gICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgIGFsZXJ0KCdjYW5ub3QgdXBkYXRlIGRpY2UgYXQgdGhpcyB0aW1lJylcbiAgICB9KVxufVxuXG5jb25zdCB1cGRhdGVEaWNlID0gZnVuY3Rpb24oZGljZUluc3RhbmNlLCB0aXRsZSwgZGVzY3JpcHRpb24pIHtcbiAgaWYoZGljZUluc3RhbmNlLm9wdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgYWxlcnQoJ3BsZWFzZSBpbnB1dCBzb21lIG9wdGlvbnMnKVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aXRsZSA9PT0gJycgfHwgZGVzY3JpcHRpb24gPT09ICcnKSB7XG4gICAgYWxlcnQoJ3BsZWFzZSBpbnB1dCBib3RoIHRpdGxlIGFuZCBkZXNjcmlwdGlvbicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpY2VJbnN0YW5jZS5zYXZlVG9EYih0aXRsZSwgZGVzY3JpcHRpb24pXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgcGFnZShgL2RpY2UvJHtkaWNlSW5zdGFuY2UuX2lkfWApO1xuICAgIH0pXG4gICAgLmNhdGNoKChlcnIpID0+IGFsZXJ0KCdjYW5ub3QgdXBkYXRlIGRpY2UgYXQgdGhpcyB0aW1lJykpXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtzYXZlRGljZSwgdXBkYXRlRGljZX1cbiIsImltcG9ydCBVc2VyIGZyb20gJy4vTW9kZWxzL1VzZXJNb2RlbCdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuaW1wb3J0IE5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9OYXZpZ2F0aW9uVmlld0NvbnN0cnVjdG9yJ1xuXG5jb25zdCB2aWV3U2lnbkluRm9ybSA9IGZ1bmN0aW9uKHNpZ25JbkZvcm1Db21wb25lbnQpIHtcbiAgY29uc29sZS5sb2coJ2FkZCBzaWduIHVwIGZvcm0gd2hlbiBjbGlja2VkJyk7XG5cbiAgJCgnaGVhZGVyJykuYXBwZW5kKHNpZ25JbkZvcm1Db21wb25lbnQpO1xuXG4gICQoJy5ibGFjay1vdXQnKS5jbGljayhlID0+IHtcbiAgICAkKGUuY3VycmVudFRhcmdldCkucmVtb3ZlKCk7XG4gICAgJCgnLmpzLXNpZ24taW4tZm9ybScpLnJlbW92ZSgpO1xuICB9KVxuXG4gICQoJy5qcy1zaWduLWluLWZvcm0nKS5zdWJtaXQoZSA9PiB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgY29uc3QgdXNlcm5hbWUgPSAkKCcuanMtc2lnbi1pbi1mb3JtIDppbnB1dFtuYW1lPXVzZXJuYW1lXScpLnZhbCgpO1xuICAgIGNvbnN0IHBhc3N3b3JkID0gJCgnLmpzLXNpZ24taW4tZm9ybSA6aW5wdXRbbmFtZT1wYXNzd29yZF0nKS52YWwoKTtcblxuICAgIGlmICgkKCcuanMtYWxlcnQtc2lnbi1pbicpKSB7XG4gICAgICAkKCcuanMtYWxlcnQtc2lnbi1pbicpLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGlmICghdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG4gICAgICAkKGUuY3VycmVudFRhcmdldCkuYXBwZW5kKCc8ZGl2IGNsYXNzPVwianMtYWxlcnQtc2lnbi1pblwiPnBsZWFzZSBpbnB1dCBib3RoIHVzZXJuYW1lIGFuZCBwYXNzd29yZDwvZGl2PicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKHVzZXJuYW1lLCBwYXNzd29yZClcblxuICAgIHJldHVybiBVc2VyLnNpZ25Jbih1c2VybmFtZSwgcGFzc3dvcmQpXG4gICAgICAudGhlbigobmV3VXNlcikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2VzcycpO1xuICAgICAgICAkKGUuY3VycmVudFRhcmdldCkucmVtb3ZlKCk7XG4gICAgICAgICQoJy5ibGFjay1vdXQnKS5yZW1vdmUoKTtcbiAgICAgICAgcmV0dXJuIG5ld1VzZXI7XG4gICAgICB9KVxuICAgICAgLnRoZW4oKG5ld1VzZXIpID0+IHtcbiAgICAgICAgVXNlclN0YXRlLmFkZFVzZXIobmV3VXNlcik7XG4gICAgICAgIHBhZ2UoJy8nKTtcbiAgICAgICAgbG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgICAgICAvLyAkKCcuanMtc2lnbi1pbi1vdXQnKS50ZXh0KCdzaWduIG91dCcpO1xuICAgICAgICAvLyAkKCcuanMtc2lnbi11cCcpLmhpZGUoKTtcbiAgICAgIH0pXG4gICAgICAvLyAudGhlbigoKSA9PiB7XG4gICAgICAvLyAgIE5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IuYWRkVXNlclBhZ2VUb05hdigpXG4gICAgICAvLyB9KVxuICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZhaWwnKTtcbiAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLmFwcGVuZCgnPGRpdj5wbGVhc2UgdHJ5IGFnYWluPC9kaXY+JylcbiAgICAgIH0pXG4gIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IHt2aWV3U2lnbkluRm9ybX1cbiIsImltcG9ydCBVc2VyIGZyb20gJy4vTW9kZWxzL1VzZXJNb2RlbCdcbmltcG9ydCBVc2VyU3RhdGUgZnJvbSAnLi9Nb2RlbHMvVXNlclN0YXRlJ1xuXG5jb25zdCBzaWduT3V0ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdzaWduIHVzZXIgb3V0IHdoZW4gY2xpY2tlZCcpO1xuXG4gIFVzZXJTdGF0ZS5yZW1vdmVVc2VyKCk7XG4gIFVzZXIubG9nT3V0KCk7XG4gIGxvY2F0aW9uLnJlbG9hZCh0cnVlKVxuICBwYWdlKCcvJyk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge3NpZ25PdXR9XG4iLCJpbXBvcnQgVXNlciBmcm9tICcuL01vZGVscy9Vc2VyTW9kZWwnXG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSdcbmltcG9ydCBOYXZpZ2F0aW9uVmlld0NvbnN0cnVjdG9yIGZyb20gJy4vTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3RvcidcblxuY29uc3Qgdmlld1NpZ25VcEZvcm0gPSBmdW5jdGlvbihzaWduVXBGb3JtQ29tcG9uZW50KSB7XG4gIGNvbnNvbGUubG9nKCdhZGQgc2lnbiB1cCBmb3JtIHdoZW4gY2xpY2tlZCcpO1xuXG4gICQoJ2hlYWRlcicpLmFwcGVuZChzaWduVXBGb3JtQ29tcG9uZW50KTtcblxuICAkKCcuYmxhY2stb3V0JykuY2xpY2soZSA9PiB7XG4gICAgJChlLmN1cnJlbnRUYXJnZXQpLnJlbW92ZSgpO1xuICAgICQoJy5qcy1zaWduLXVwLWZvcm0nKS5yZW1vdmUoKTtcbiAgfSlcblxuICAkKCcuanMtc2lnbi11cC1mb3JtJykuc3VibWl0KGUgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGNvbnN0IHVzZXJuYW1lID0gJCgnLmpzLXNpZ24tdXAtZm9ybSA6aW5wdXRbbmFtZT11c2VybmFtZV0nKS52YWwoKTtcbiAgICBjb25zdCBwYXNzd29yZCA9ICQoJy5qcy1zaWduLXVwLWZvcm0gOmlucHV0W25hbWU9cGFzc3dvcmRdJykudmFsKCk7XG5cbiAgICBpZiAoJCgnLmpzLWFsZXJ0LXNpZ24tdXAnKSkge1xuICAgICAgJCgnLmpzLWFsZXJ0LXNpZ24tdXAnKS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICBpZiAoIXVzZXJuYW1lIHx8ICFwYXNzd29yZCkge1xuICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLmFwcGVuZCgnPGRpdiBjbGFzcz1cImpzLWFsZXJ0LXNpZ24tdXBcIj5wbGVhc2UgaW5wdXQgYm90aCB1c2VybmFtZSBhbmQgcGFzc3dvcmQ8L2Rpdj4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyh1c2VybmFtZSwgcGFzc3dvcmQpXG5cbiAgICByZXR1cm4gVXNlci5jcmVhdGUodXNlcm5hbWUsIHBhc3N3b3JkKVxuICAgICAgLnRoZW4oKG5ld1VzZXIpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3MnKTtcbiAgICAgICAgVXNlclN0YXRlLmFkZFVzZXIobmV3VXNlcik7XG4gICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5yZW1vdmUoKTtcbiAgICAgICAgJCgnLmJsYWNrLW91dCcpLnJlbW92ZSgpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gJCgnLmpzLXNpZ24taW4tb3V0JykudGV4dCgnU0lHTiBPVVQnKTtcbiAgICAgICAgLy8gJCgnLmpzLXNpZ24tdXAnKS5oaWRlKCk7XG4gICAgICAgIC8vIE5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IuYWRkVXNlclBhZ2VUb05hdigpO1xuICAgICAgICBwYWdlKCcvJyk7XG4gICAgICAgIGxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnZmFpbCcpO1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAkKGUuY3VycmVudFRhcmdldCkuYXBwZW5kKCc8ZGl2PnBsZWFzZSB0cnkgYWdhaW48L2Rpdj4nKVxuICAgICAgfSlcbiAgfSlcbn1cblxuZXhwb3J0IGRlZmF1bHQge3ZpZXdTaWduVXBGb3JtfVxuIiwiaW1wb3J0IERlY2lzaW9uTGlzdFN0YXRlIGZyb20gJy4vTW9kZWxzL0RlY2lzaW9uTGlzdFN0YXRlJ1xuaW1wb3J0IENvbXBvbmVudFN0YXRlIGZyb20gJy4vTW9kZWxzL0NvbXBvbmVudFN0YXRlJ1xuaW1wb3J0IERlY2lzaW9uQ2FyZFZpZXcgZnJvbSAnLi9EZWNpc2lvbkNhcmRWaWV3J1xuaW1wb3J0IFV0aWxGdW5jIGZyb20gJy4vVXRpbHMvQ2xlYXJIVE1MJ1xuaW1wb3J0IFVzZXJTdGF0ZSBmcm9tICcuL01vZGVscy9Vc2VyU3RhdGUnXG5cbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnZGljZScpO1xuXG4vLyBjcmVhdGUgdGhlIGhvbWUgcGFnZVxuLy8gY29udHJvbCBmZXRjaGluZyBsaXN0cyBvZiBkZWNpc2lvbiBkaWNlIGFuZCBpbnB1dCBhcyBodG1sXG5jb25zdCB2aWV3VXNlclBhZ2UgPSBmdW5jdGlvbihjdHgpIHtcbiAgY29uc3QgbmFtZSA9IGN0eC5wYXJhbXMudXNlcm5hbWU7XG4gIGNvbnN0IHVzZXIgPSBVc2VyU3RhdGUuZ2V0U3RhdGUoKTtcbiAgZGVidWcoJ1VzZXJQYWdlVmlld0NvbnN0cnVjdG9yIHN0YXJ0aW5nJyk7XG5cbiAgcmV0dXJuIFByb21pc2UuYWxsKFtcbiAgICAgIERlY2lzaW9uTGlzdFN0YXRlLmdldERpY2UodXNlci5kZWNpc2lvbl9pZCksXG4gICAgICBDb21wb25lbnRTdGF0ZS5nZXRDb21wb25lbnQoJ2RlY2lzaW9uLWNhcmQnKVxuICAgIF0pXG4gICAgLnRoZW4oKHBheWxvYWQpID0+IHtcbiAgICAgIGlmIChwYXlsb2FkWzBdLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb25zb2xlLmxvZygndGhlcmUgaXMgbm8gZGF0YScpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIGRhdGEnKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBVdGlsRnVuYy5jbGVhckh0bWwoJ2pzLW1haW4tY29udGVudCcpO1xuICAgICAgICBwYXlsb2FkWzBdLmZvckVhY2goZGljZSA9PiB7XG4gICAgICAgICAgRGVjaXNpb25DYXJkVmlldy5jcmVhdGVEZWNpc2lvbkNhcmQoZGljZSwgcGF5bG9hZFsxXSk7XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7dmlld1VzZXJQYWdlfVxuIiwiY29uc3QgY2xlYXJIdG1sID0gZnVuY3Rpb24oZWxlbSkge1xuICAkKGAuJHtlbGVtfWApLmh0bWwoJycpO1xuICByZXR1cm47XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7Y2xlYXJIdG1sfTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldFJhbmRvbU51bWJlcihtaW4sIG1heCkge1xuICBtaW4gPSBNYXRoLmNlaWwobWluKTtcbiAgbWF4ID0gTWF0aC5mbG9vcihtYXgpO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbik7XG59O1xuXG4vLyBwcm92aWRlZCBieTpcbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL01hdGgvcmFuZG9tXG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXBsYWNlQWxsKHN0ciwgbWFwT2JqKXtcbiAgdmFyIHJlID0gbmV3IFJlZ0V4cChPYmplY3Qua2V5cyhtYXBPYmopLmpvaW4oXCJ8XCIpLFwiZ2lcIik7XG5cbiAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlLCBmdW5jdGlvbihtYXRjaGVkKXtcbiAgICByZXR1cm4gbWFwT2JqW21hdGNoZWQudG9Mb3dlckNhc2UoKV07XG4gIH0pO1xufVxuXG4vLyBwcm92aWRlZCBieTpcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE1NjA0MTQwL3JlcGxhY2UtbXVsdGlwbGUtc3RyaW5ncy13aXRoLW11bHRpcGxlLW90aGVyLXN0cmluZ3NcbiIsImV4cG9ydHMuUE9SVCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgODA4MDtcblxuZXhwb3J0cy5CQVNFX1VSTCA9ICdsb2NhbGhvc3QnO1xuIiwiaW1wb3J0IE5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9OYXZpZ2F0aW9uVmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBIb21lVmlld0NvbnN0cnVjdG9yIGZyb20gJy4vSG9tZVZpZXdDb25zdHJ1Y3Rvcic7XG5pbXBvcnQgRGljZVZpZXdDb25zdHJ1Y3RvciBmcm9tICcuL0RpY2VQYWdlVmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBEaWNlRWRpdFZpZXdDb25zdHJ1Y3RvciBmcm9tICcuL0RpY2VFZGl0Vmlld0NvbnN0cnVjdG9yJztcbmltcG9ydCBEaWNlQ3JlYXRlVmlld0NvbnN0cnVjdG9yIGZyb20gJy4vRGljZUNyZWF0ZVZpZXdDb25zdHJ1Y3Rvcic7XG5pbXBvcnQgVXNlclBhZ2VWaWV3Q29uc3RydWN0b3IgZnJvbSAnLi9Vc2VyUGFnZVZpZXdDb25zdHJ1Y3Rvcic7XG5pbXBvcnQgVXNlclN0YXRlIGZyb20gJy4vTW9kZWxzL1VzZXJTdGF0ZSc7XG5pbXBvcnQgVXNlciBmcm9tICcuL01vZGVscy9Vc2VyTW9kZWwnO1xuaW1wb3J0IHBhZ2UgZnJvbSAncGFnZSc7XG5cbmlmICh1c2VyQXV0aCA9PT0gJ2F1dGgnKSB7XG4gIGNvbnNvbGUubG9nKCdjaGVja2luZyB1c2VyIGF1dGhlbnRpY2F0aW9uJylcbiAgVXNlci5jaGVja0F1dGgoKVxuICAgIC50aGVuKCh1c2VyT2JqZWN0KSA9PiB7XG4gICAgICBVc2VyU3RhdGUucmVtb3ZlVXNlcigpO1xuICAgICAgVXNlclN0YXRlLmFkZFVzZXIobmV3IFVzZXIodXNlck9iamVjdCkpO1xuICAgIH0pXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ2NhbGxpbmcgbmF2aWdhdGlvbmFsIHZpZXcgY29uc3RydWN0b3IgYWdhaW4nKVxuICAgICAgTmF2aWdhdGlvblZpZXdDb25zdHJ1Y3Rvci5hZGRVc2VyUGFnZVRvTmF2KClcbiAgICB9KVxuICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICB1c2VyQXV0aCA9IHVuYXV0aGVkXG4gICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIH0pXG59XG5cbk5hdmlnYXRpb25WaWV3Q29uc3RydWN0b3IuYWRkTmF2QmFyRnVuY3Rpb25zKCk7XG5cbi8vIGluaXRpYWxpemUgcGFnZS5qcyBmb3Igcm91dGluZyBpbiB0aGUgZnJvbnQtZW5kXG5wYWdlKCcvJywgSG9tZVZpZXdDb25zdHJ1Y3Rvci52aWV3SG9tZSk7XG5wYWdlKCcvZGljZS9uZXcnLCBEaWNlQ3JlYXRlVmlld0NvbnN0cnVjdG9yLm5ld0RpY2UpO1xucGFnZSgnL2RpY2UvOmRlY2lzaW9uSWQnLCBEaWNlVmlld0NvbnN0cnVjdG9yLmRpY2VWaWV3KTtcbnBhZ2UoJy9kaWNlL2VkaXQvOmRlY2lzaW9uSWQnLCBEaWNlRWRpdFZpZXdDb25zdHJ1Y3Rvci5kaWNlRWRpdFZpZXcpO1xuLy8gcGFnZSgnL2Fib3V0Jywgdmlld0Fib3V0KTtcbi8vIHBhZ2UoJy9uZXcnLCBjcmVhdGVEaWNlKTtcbnBhZ2UoJy9wcm9maWxlJywgVXNlclBhZ2VWaWV3Q29uc3RydWN0b3Iudmlld1VzZXJQYWdlKTtcbi8vIHBhZ2UoJy86dXNlcm5hbWUvOmRlY2lzaW9uSWQnLCB2aWV3RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lLzpkZWNpc2lvbklkL2VkaXQnLCBlZGl0RGljZSk7XG4vLyBwYWdlKCcvOnVzZXJuYW1lLzpkZWNpc2lvbklkL2RlbGV0ZScsIGRlbGV0ZURpY2UpO1xuXG5wYWdlKCk7XG5cbmNvbnNvbGUubG9nKHVzZXJBdXRoKVxuIl19
