'use strict';

let Views = require('../../view-types'),
    Requests = require('../../request-types'),
    Command = require('../../command');

class CreateGateway extends Command {

  /**
   * Match args signature:  <service-name> create gateway <name>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    return args.trim().match(/[a-zA-Z0-9\-_]+\s+create\s+gateway\s+[a-zA-Z0-9\-_]+/);
  }

  description(){
    return {
      category: 'Gateways',
      description: 'Create a gateway for the service',
      usage: '<service> create gateway <name>'
    }
  }

  execute(bluegreen, argv, callback){

    let request = {
      service: argv._[0],
      gateway: argv._[3]
    };

    if (argv.rrname) request.rrname = argv.rrname;

    bluegreen.request(Requests.Gateway.Create, request, (err, gateway) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not create gateway '${request.gateway}' for service '${request.service}'.`
        });
      else
        bluegreen.render(Views.Success,
          { message: `Gateway '${request.gateway}' for service '${request.service}' created successfully.` });
        bluegreen.render(Views.Gateways, [gateway]);
      callback(err);
    });
  }

}

module.exports = CreateGateway;

