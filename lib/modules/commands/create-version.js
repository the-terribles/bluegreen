'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class CreateVersion extends Command {

  /**
   * Match args signature:  <service-name> create version <version>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    let matches = args.trim().match(/[a-zA-Z0-9\-_]+\s+create\s+version\s+.+/);
    return matches;
  }

  description(){
    return {
      category: 'Versions',
      description: 'Create a version of the service',
      usage: '<service> create version <version>'
    }
  }

  execute(bluegreen, argv, callback){
    let service = argv._[0],
        version = argv._[3];

    bluegreen.request(Requests.Versions.Create, { service, version }, (err, data) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not create version ${version} for service ${service}`
        });
      else
        bluegreen.render(Views.Success, { message: `Service '${service}' version '${version}' created successfully.` });
      callback(err);
    });
  }

}

module.exports = CreateVersion;

