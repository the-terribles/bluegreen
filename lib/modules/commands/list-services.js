'use strict';

let Views = require('../../view-types'),
  Requests = require('../../request-types'),
  Command = require('../../command');

class ListServices extends Command {

  /**
   * Match args signature:  services
   * @param args {String} joined Minimist argv._ Array
   * @param argv {Array} Minimist argv
   * @returns {Boolean}
   */
  isMatch(bluegreen, args, argv){
    return args.trim() === 'services';
  }

  description(){
    return {
      category: 'Services',
      description: 'Show all services managed by BlueGreen',
      usage: 'services'
    }
  }

  execute(bluegreen, argv, callback){
    bluegreen.request(Requests.Services.List, {}, (err, servicesOrMessage) => {
      if (err)
        bluegreen.render(Views.Error, {
          error: err,
          message: servicesOrMessage || 'Could not retrieve environments.'
        });
      else
        bluegreen.render(Views.Services, servicesOrMessage);
      callback(err, servicesOrMessage);
    });
  }

}

module.exports = ListServices;

