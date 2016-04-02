'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class AttachGateway extends Command {

  /**
   * Match args signature:  <service-name> attach <environment> to <gateway>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    return args.trim().match(/[a-zA-Z0-9\-_]+\s+attach\s+[a-zA-Z0-9\-_]+\s+to\s+[a-zA-Z0-9\-_]+/);
  }

  description(){
    return {
      category: 'Gateways',
      description: 'Attach an environment to a gateway',
      usage: '<service> attach <environment> to <gateway>',
      opts: {
        '--zone': 'Route53 Hosted Zone ID'
      }
    }
  }

  execute(bluegreen, argv, callback){

    let request = {
      service: argv._[0],
      environment: argv._[2],
      gateway: argv._[4]
    };

    if (argv.zone) request.zone = argv.zone;

    bluegreen.request(Requests.Gateway.Attach, request, (err, data) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not attach gateway '${request.gateway}' to environment '${request.environment}' for service '${request.service}'.`
        });
      else
        bluegreen.render(Views.Success,
          { message: `Gateway '${request.gateway}' successfully attached to environment '${request.environment}' for service '${request.service}'.` });
      callback(err);
    });
  }

}

module.exports = AttachGateway;

