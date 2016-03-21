'use strict';

/**
 * Dumps the output of commands to the console as JSON.  Use this if you need to
 * integrate on BlueGreen but need to do it via the command line.
 */
class ConsoleJsonViewLayer {

  render(bluebird, layout, data) {
    console.log(JSON.stringify({ type: layout, data }, null, 2));
  }
}

module.exports = ConsoleJsonViewLayer;

