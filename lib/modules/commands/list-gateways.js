'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class ListGateways extends Command {

  /**
   * Match args signature:  gateways
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Boolean}
   */
  isMatch(bluegreen, args, argv){
    return args.trim() === 'gateways';
  }

  description(){
    return {
      category: 'Gateways',
      description: 'Show the existing Gateways for all services',
      usage: 'gateways',
      opts: {
        '--zone': 'Route53 Hosted Zone ID'
      }
    }
  }

  execute(bluegreen, argv, callback){

    if (argv.zone) request.zone = argv.zone;

    bluegreen.request(Requests.Gateway.List, {}, (err, gatewaysOrMessage) => {
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

module.exports = ListGateways;

