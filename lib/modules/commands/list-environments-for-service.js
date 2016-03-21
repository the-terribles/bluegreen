'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class ListEnvironmentsForService extends Command {

  /**
   * Match args signature:  <service-name> environments
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    let matches = args.trim().match(/[a-zA-Z0-9\-_]+\s+environments/);
    return matches;
  }

  description(){
    return {
      category: 'Environments',
      description: 'Show the environments available for a service',
      usage: '<service> environments'
    }
  }

  execute(bluegreen, argv, callback){
    let service = argv._[0];
    bluegreen.request(Requests.Environments.List, { service }, (err, environmentsOrMessage) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: environmentsOrMessage || `Could not retrieve environments for service: ${service}.`
        });
      else
        bluegreen.render(Views.Environments, environmentsOrMessage);
      callback(err, environmentsOrMessage);
    });
  }

}

module.exports = ListEnvironmentsForService;

