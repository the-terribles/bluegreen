'use strict';

/**
 * Strategies are used to handle events or requests in the BlueGreen application.
 * The pattern is essentially an event bus, allowing implementations to override existing
 * implementations without having to modify the core BlueGreen project.
 *
 * Essentially, export a function called "register" in module.exports that when called will
 * supply a list of registrations:
 *
 * [
 *   {
 *     request: 'event-name',
 *     handler: (bluebird, context, callback) => {}
 *   }
 * ]
 *
 * This class is supplied as an example, or a
 */
class Strategy {

  static get instantiate(){
    return true;
  }

  /**
   * Register a list of strategies for handling application events.
   * @param bluegreen {BlueGreen} application instance.
   * @param callback {Function} (err, Array) : void
   */
  register(bluegreen, callback){

    throw new Error('Not implemented');

    // Really, your obligation is more like this:
    return callback(null, [
      {
        request: 'get-version-and-status',
        handler: (bluegreen, context, done) => {
          done(null, "Success!");
        }
      }
    ]);
  }
}

module.exports = Strategy;