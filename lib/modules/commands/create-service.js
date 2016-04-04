'use strict';

let Views = require('../../view-types'),
    Requests = require('../../request-types'),
    Command = require('../../command');

class CreateService extends Command {

  /**
   * Match args signature:  <service-name> create service <service-name>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    return args.trim().match(/create\s+service\s+.+/);
  }

  description(){
    return {
      category: 'Services',
      description: 'Create a new service',
      usage: 'create service <service-name>'
    }
  }

  execute(bluegreen, argv, callback){

    let service = argv._[2],
        description = argv.description || `${service} - managed by BlueGreen`,
        doNotCreateEnvironments = argv.noEnvironments;

    bluegreen.request(Requests.Services.Create, { service, description }, (err, data) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not create service ${service}`
        });
      else
        bluegreen.render(Views.Success, { message: `Service '${service}' created successfully.` });
      callback(err);
    });
  }

}

module.exports = CreateService;

