'use strict';

let Views = require('../../view-types'),
    Requests = require('../../request-types'),
    Command = require('../../command');

class ShowVersionsForService extends Command {

  /**
   * Match args signature:  <service-name> versions
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    let matches = args.trim().match(/[a-zA-Z0-9\-_]+\s+versions/);
    return matches;
  }

  description(){
    return {
      description: 'Show the versions available for a service',
      usage: '<service> versions'
    }
  }

  execute(bluegreen, argv, callback){
    let service = argv._[0];
    bluegreen.request(Requests.GetVersionsAndStatus, { service }, (err, versionsOrMessage) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: versionsOrMessage || `Could not retrieve versions for service: ${service}.`
        });
      else
        bluegreen.render(Views.VersionsAndStatus, versionsOrMessage);
      callback(err, versionsOrMessage);
    });
  }

}

module.exports = ShowVersionsForService;

