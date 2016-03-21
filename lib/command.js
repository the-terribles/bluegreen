'use strict';

/**
 * Defines the signature of a command.  You are more than welcome to
 * implement in another way, just keep in mind that you will need to support
 */
class Command {

  /**
   * Determine if this command is a match for the supplied arguments.
   * @param bluegreen {BlueGreen} application instance
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Object} Minimist argv
   * @returns {Boolean} true if a match, false if not.
   */
  isMatch(bluegreen, args, argv){
    throw new Error('Not implemented');
  }

  /**
   * Get a description of the command for help purposes.
   * @returns {{usage: string, description: string, brief: string}}
   */
  description(){
    return {
      name: 'Unknown',
      usage: '<service> command opt1 opt2',
      description: 'not implemented'
    }
  }

  /**
   * Execute this command with the supplied arguments.
   * @param bluegreen {BlueGreen} application instance
   * @param argv {Object} Minimist argv
   * @param callback {Function} (err) : void
   */
  execute(bluegreen, argv, callback){
    throw new Error('Not implemented');
  }

}

module.exports = Command;