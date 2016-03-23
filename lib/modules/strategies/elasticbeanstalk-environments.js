'use strict';

let _ = require('lodash'),
  async = require('async'),
  RequestTypes = require('../../request-types'),
  ElasticBeanstalkStrategy = require('./elasticbeanstalk-base');

/**
 * Uses Elastic Beanstalk to manage application versions.
 */
class ElasticBeanstalkEnvironmentStrategy extends ElasticBeanstalkStrategy {

  getRegistrations(bluegreen, callback) {
    return callback(null, [
      {
        request: RequestTypes.Environments.List,
        handler: this.getEnvironments.bind(this)
      }
    ]);
  }

  /**
   * Transforms the Elastic Beanstalk model for an Environment to a BlueGreen Deployment
   * @param bluegreen
   * @param environment
   * @returns {Object}
   */
  static transformEnvironment(bluegreen, environment){
    return {
      name: environment.EnvironmentName,
      description: environment.Description,
      "eb:EnvironmentId": environment.EnvironmentId,
      service: ElasticBeanstalkStrategy.parseApplicationName(bluegreen, environment.ApplicationName),
      version: environment.VersionLabel,
      created: environment.DateCreated,
      updated: environment.DateUpdated,
      status: environment.Status,
      url: environment.EndpointURL,
      'eb:CNAME': environment.CNAME,
      'eb:AbortInProgress': environment.AbortableOperationInProgress,
      'eb:Health': environment.Health,
      'eb:HealthStatus': environment.HealthStatus
    };
  }


  /**
   * Get the Deployments of a Service in Elastic Beanstalk.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  getEnvironments(bluegreen, context, callback){

    let request = {
      IncludeDeleted: false
    };

    if (context.service){
      request.ApplicationName = ElasticBeanstalkStrategy.getApplicationName(bluegreen, context);
    }

    this.beanstalk.describeEnvironments(request, (err, data) => {
      if (err){
        return callback(err, 'Error retrieving application environments/deployments.');
      }
      callback(null, _.map(data.Environments, (e) => ElasticBeanstalkEnvironmentStrategy.transformEnvironment(bluegreen, e)));
    });
  }
}

module.exports = ElasticBeanstalkEnvironmentStrategy;