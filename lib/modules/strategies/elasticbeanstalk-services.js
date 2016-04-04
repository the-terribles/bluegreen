'use strict';

let _ = require('lodash'),
    async = require('async'),
    RequestTypes = require('../../request-types'),
    ElasticBeanstalkStrategy = require('./elasticbeanstalk-base');

/**
 * Uses Elastic Beanstalk to manage applications.
 */
class ElasticBeanstalkServiceStrategy extends ElasticBeanstalkStrategy {

  register(bluegreen, callback) {
    super.register(bluegreen, (err) => {

      if (err) return callback(err);

      bluegreen.registerRequestHandler({
        request: RequestTypes.Services.Create,
        handler: this.createService.bind(this)
      });

      bluegreen.registerRequestHandler({
        request: RequestTypes.Services.List,
        handler: this.getServices.bind(this)
      });

      bluegreen.registerCommand(new (require('../commands/create-service'))());
      bluegreen.registerCommand(new (require('../commands/list-services'))());

      callback(null);
    });
  }

  static transformService(instance){
    return {
      name: instance.ApplicationName,
      created: instance.DateCreated,
      updated: instance.DateUpdated
    };
  }

  /**
   * Get all services registered in Elastic Beanstalk.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  getServices(bluegreen, context, callback){
    this.beanstalk.describeApplications({}, (err, response) => {
      if (err) return callback(err, 'Could not list the services in Elastic Beanstalk.');
      callback(null, _.map(response.Applications, ElasticBeanstalkServiceStrategy.transformService));
    });
  }

  /**
   * Create a new Service by creating an "Application" in Elastic Beanstalk.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  createService(bluegreen, context, callback){
    this.beanstalk.createApplication({
      ApplicationName: context.service,
      Description: context.description
    }, (err) => {
      if (err) return callback(err, 'Could not create service in Elastic Beanstalk.');
      callback();
    });
  }
}

module.exports = ElasticBeanstalkServiceStrategy;