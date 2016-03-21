'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class DebugCodebaseVersion extends Command {

  /**
   * Match args signature:  debug:codebase-version
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    let matches = args.trim().match(/debug:codebase-version/);
    return matches;
  }

  description(){
    return {
      category: 'Debug',
      description: 'Show the version that will be used on version creation.',
      usage: 'debug:codebase-version'
    }
  }

  execute(bluegreen, argv, callback){
    bluegreen.request(Requests.Versions.FindCodebaseVersion, {}, (err, data) => {
      bluegreen.render(Views.Debug.CodebaseVersion, { version: data, error: err });
      callback();
    });
  }

}

module.exports = DebugCodebaseVersion;

