'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class ListGatewaysForService extends Command {

  /**
   * Match args signature:  <service> gateways
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Boolean}
   */
  isMatch(bluegreen, args, argv){
    return args.trim().match(/[a-zA-Z0-9\-_]+\s+gateways/);
  }

  description(){
    return {
      category: 'Gateways',
      description: 'Show the Gateways for a specific service.',
      usage: '<service> gateways'
    }
  }

  execute(bluegreen, argv, callback){
    bluegreen.request(Requests.Gateway.List, { service: argv._[0] }, (err, gatewaysOrMessage) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: gatewaysOrMessage || 'Could not retrieve Gateways.'
        });
      else
        bluegreen.render(Views.Gateways, gatewaysOrMessage);
      callback(err, gatewaysOrMessage);
    });
  }

}

module.exports = ListGatewaysForService;

