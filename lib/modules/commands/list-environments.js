'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class ListEnvironments extends Command {

  /**
   * Match args signature:  environments
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Boolean}
   */
  isMatch(bluegreen, args, argv){
    return args.trim() === 'environments';
  }

  description(){
    return {
      category: 'Environments',
      description: 'Show the existing environments for all services',
      usage: 'environments'
    }
  }

  execute(bluegreen, argv, callback){
    bluegreen.request(Requests.Environments.List, {}, (err, environmentsOrMessage) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: environmentsOrMessage || 'Could not retrieve environments.'
        });
      else
        bluegreen.render(Views.Environments, environmentsOrMessage);
      callback(err, environmentsOrMessage);
    });
  }

}

module.exports = ListEnvironments;

