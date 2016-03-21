'use strict';

let Views = require('../../view-types'),
    Requests = require('../../request-types'),
    Command = require('../../command');

class DeleteVersionForService extends Command {

  /**
   * Match args signature:  <service-name> delete version <version>
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Array|{index: number, input: string}}
   */
  isMatch(bluegreen, args, argv){
    let matches = args.trim().match(/[a-zA-Z0-9\-_]+\s+delete\s+version\s+.+/);
    return matches;
  }

  description(){
    return {
      category: 'Versions',
      description: 'Delete a version of the service',
      usage: '<service> delete version <version>'
    }
  }

  execute(bluegreen, argv, callback){
    let service = argv._[0],
        version = argv._[3];
    
    bluegreen.request(Requests.Versions.Delete, { service, version }, (err, data) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: data || `Could not delete version ${version} for service ${service}`
        });
      else
        bluegreen.render(Views.Success, { message: `Service '${service}' version '${version}' deleted successfully.` });
      callback(err);
    });
  }

}

module.exports = DeleteVersionForService;

