'use strict';

let _ = require('lodash'),
  async = require('async'),
  RequestTypes = require('../../request-types'),
  ElasticBeanstalkStrategy = require('./elasticbeanstalk-base');

/**
 * Uses Elastic Beanstalk to manage application versions.
 */
class ElasticBeanstalkEnvironmentStrategy extends ElasticBeanstalkStrategy {

  register(bluegreen, callback) {
    super.register(bluegreen, (err) => {

      if (err) return callback(err);

      bluegreen.registerRequestHandler({
        request: RequestTypes.Environments.List,
        handler: this.getEnvironments.bind(this)
      });

      bluegreen.registerCommand(new (require('../commands/list-environments'))());
      bluegreen.registerCommand(new (require('../commands/list-environments-for-service'))());

      callback(null);
    });
  }

  /**
   * Resolve the Host ID of the Elastic Beanstalk Environment
   * @param environment {Object}
   * @returns {String|null}
   */
  static resolveHostId(environment){
    let region = environment.EndpointURL.split('.')[1];
    switch(region){
      case 'us-east-1' : return 'Z117KPS5GTRQ2G';
      case 'us-west-1' : return 'Z1LQECGX5PH1X';
      case 'us-west-2' : return 'Z38NKT9BP95V3O';
      case 'eu-west-1' : return 'Z2NYPWQ7DFZAZH';
      case 'eu-central-1' : return 'Z1FRNW7UH4DEZJ';
      case 'ap-northeast-1' : return 'Z1R25G3KIG2GBW';
      case 'ap-northeast-2' : return 'Z3JE5OI70TWKCP';
      case 'ap-southeast-1' : return 'Z16FZ9L249IFLT';
      case 'ap-southeast-2' : return 'Z2PCDNR3VC2G1N';
      case 'sa-east-1' : return 'Z10X7K2B4QSOFV';
      default: return null;
    }
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
      'r53:Alias': true,
      'r53:CNAME': environment.CNAME,
      'r53:HostedZoneId': ElasticBeanstalkEnvironmentStrategy.resolveHostId(environment),
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