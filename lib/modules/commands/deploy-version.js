'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class DeployVersion extends Command {

  /**
   * Match args signature:  <service-name> deploy version <version>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    return args.trim().match(/[a-zA-Z0-9\-_]+\s+deploy\s+[a-zA-Z0-9\-_.]+\s+to\s+.+/);
  }

  description(){
    return {
      category: 'Versions',
      description: 'Create a version of the service',
      usage: '<service> deploy <version> to <environment>'
    }
  }

  execute(bluegreen, argv, callback){
    let service = argv._[0],
        version = argv._[2],
        environment = argv._[4];

    bluegreen.request(Requests.Versions.Deploy, { service, version, environment }, (err, data) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not deploy version ${version} to ${environment} for service ${service}`
        });
      else
        bluegreen.render(Views.Success, { message: `Service '${service}' version '${version}' was successfully deployed to ${environment}.` });
      callback(err);
    });
  }

}

module.exports = DeployVersion;


