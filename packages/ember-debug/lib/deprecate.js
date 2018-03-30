/*global __fail__*/
import { DEBUG } from 'ember-env-flags';

import EmberError from './error';

import { ENV } from 'ember-environment';

import { assert } from './index';
import { registerHandler as genericRegisterHandler, invoke } from './handlers';
/**
 @module @ember/debug
 @public
*/
/**
  Allows for runtime registration of handler functions that override the default deprecation behavior.
  Deprecations are invoked by calls to [@ember/application/deprecations/deprecate](https://emberjs.com/api/ember/release/classes/@ember%2Fapplication%2Fdeprecations/methods/deprecate?anchor=deprecate).
  The following example demonstrates its usage by registering a handler that throws an error if the
  message contains the word "should", otherwise defers to the default handler.

  ```javascript
  import { registerDeprecationHandler } from '@ember/debug';

  registerDeprecationHandler((message, options, next) => {
    if (message.indexOf('should') !== -1) {
      throw new Error(`Deprecation message with should: ${message}`);
    } else {
      // defer to whatever handler was registered before this one
      next(message, options);
    }
  });
  ```

  The handler function takes the following arguments:

  <ul>
    <li> <code>message</code> - The message received from the deprecation call.</li>
    <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
      <ul>
        <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
        <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
      </ul>
    <li> <code>next</code> - A function that calls into the previously registered handler.</li>
  </ul>

  @public
  @static
  @method registerDeprecationHandler
  @for @ember/debug
  @param handler {Function} A function to handle deprecation calls.
  @since 2.1.0
*/
let registerHandler = () => {};
let missingOptionsDeprecation,
  missingOptionsIdDeprecation,
  missingOptionsUntilDeprecation,
  deprecate;

if (DEBUG) {
  registerHandler = function registerHandler(handler) {
    genericRegisterHandler('deprecate', handler);
  };

  let formatMessage = function formatMessage(_message, options) {
    let message = _message;

    if (options && options.id) {
      message = message + ` [deprecation id: ${options.id}]`;
    }

    if (options && options.url) {
      message += ` See ${options.url} for more details.`;
    }

    return message;
  };

  registerHandler(function logDeprecationToConsole(message, options) {
    let updatedMessage = formatMessage(message, options);
    console.warn(`DEPRECATION: ${updatedMessage}`); // eslint-disable-line no-console
  });

  let captureErrorForStack;

  if (new Error().stack) {
    captureErrorForStack = () => new Error();
  } else {
    captureErrorForStack = () => {
      try {
        __fail__.fail();
      } catch (e) {
        return e;
      }
    };
  }

  registerHandler(function logDeprecationStackTrace(message, options, next) {
    if (ENV.LOG_STACKTRACE_ON_DEPRECATION) {
      let stackStr = '';
      let error = captureErrorForStack();
      let stack;

      if (error.stack) {
        if (error['arguments']) {
          // Chrome
          stack = error.stack
            .replace(/^\s+at\s+/gm, '')
            .replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2')
            .replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)')
            .split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack
            .replace(/(?:\n@:0)?\s+$/m, '')
            .replace(/^\(/gm, '{anonymous}(')
            .split('\n');
        }

        stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
      }

      let updatedMessage = formatMessage(message, options);

      console.warn(`DEPRECATION: ${updatedMessage}${stackStr}`); // eslint-disable-line no-console
    } else {
      next(...arguments);
    }
  });

  registerHandler(function raiseOnDeprecation(message, options, next) {
    if (ENV.RAISE_ON_DEPRECATION) {
      let updatedMessage = formatMessage(message);

      throw new EmberError(updatedMessage);
    } else {
      next(...arguments);
    }
  });

  missingOptionsDeprecation =
    'When calling `deprecate` you ' +
    'must provide an `options` hash as the third parameter.  ' +
    '`options` should include `id` and `until` properties.';
  missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
  missingOptionsUntilDeprecation = 'When calling `deprecate` you must provide `until` in options.';
  /**
   @module @ember/application
   @public
   */
  /**
    Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only).

    * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.

    @method deprecate
    @for @ember/application/deprecations
    @param {String} message A description of the deprecation.
    @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
    @param {Object} options
    @param {String} options.id A unique id for this deprecation. The id can be
      used by Ember debugging tools to change the behavior (raise, log or silence)
      for that specific deprecation. The id should be namespaced by dots, e.g.
      "view.helper.select".
    @param {string} options.until The version of Ember when this deprecation
      warning will be removed.
    @param {String} [options.url] An optional url to the transition guide on the
      emberjs.com website.
    @static
    @public
    @since 1.0.0
  */
  deprecate = function deprecate(message, test, options) {
    if (ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT !== true) {
      assert(missingOptionsDeprecation, options && (options.id || options.until));
      assert(missingOptionsIdDeprecation, options.id);
      assert(missingOptionsUntilDeprecation, options.until);
    }

    if (
      (!options || (!options.id && !options.until)) &&
      ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true
    ) {
      deprecate(missingOptionsDeprecation, false, {
        id: 'ember-debug.deprecate-options-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options',
      });
    }

    if (options && !options.id && ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true) {
      deprecate(missingOptionsIdDeprecation, false, {
        id: 'ember-debug.deprecate-id-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options',
      });
    }

    if (options && !options.until && ENV._ENABLE_DEPRECATION_OPTIONS_SUPPORT === true) {
      deprecate(missingOptionsUntilDeprecation, options && options.until, {
        id: 'ember-debug.deprecate-until-missing',
        until: '3.0.0',
        url: 'https://emberjs.com/deprecations/v2.x/#toc_ember-debug-function-options',
      });
    }

    invoke('deprecate', ...arguments);
  };
}

export default deprecate;

export {
  registerHandler,
  missingOptionsDeprecation,
  missingOptionsIdDeprecation,
  missingOptionsUntilDeprecation,
};
