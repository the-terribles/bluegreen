'use strict';

let _ = require('lodash'),
    async = require('async'),
    AWS = require('aws-sdk'),
    RequestTypes = require('../../request-types'),
    beanstalk = new AWS.ElasticBeanstalk(),
    Strategy = require('../../strategy');

/**
 * Uses Elastic Beanstalk to manage versioning, environments, services, etc.
 */
class ElasticBeanstalkStrategy extends Strategy {

  /**
   * Register the Elastic Beanstalk request handlers
   * @param bluegreen {BlueGreen} Application Instance
   * @param callback {Function} (err, registrations) : void
   */
  register(bluegreen, callback){
    callback(null, [
      {
        request: RequestTypes.Versions.List,
        handler: this.getVersionsAndStatus.bind(this)
      },
      {
        request: RequestTypes.Versions.Delete,
        handler: this.deleteVersion.bind(this)
      },
      {
        request: RequestTypes.Environments.List,
        handler: this.getEnvironments.bind(this)
      },
      {
        request: RequestTypes.Versions.Deploy,
        handler: this.deployVersion.bind(this)
      }
    ]);
  }

  /**
   * Get the name of the application (applying a prefix as needed).
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @returns {string}
   */
  static getApplicationName(bluegreen, context){
    let prefix = bluegreen.config.application.prefix || '';
    return `${prefix}${context.service}`;
  }

  /**
   * Parse the application name, converting it to our service name.
   * @param bluegreen
   * @param applicationName
   * @returns {number|*|Number}
   */
  static parseApplicationName(bluegreen, applicationName){
    let prefix = bluegreen.config.application.prefix || '';
    return applicationName.slice(prefix.length);
  }

  /**
   * Transforms the Elastic Beanstalk model for an ApplicationVersion to BlueGreen's model.
   * @param bluegreen
   * @param version
   * @returns {{name: *, description: *, status: *, created: *, updated: *, service: *, eb:SourceBundle: *, deployments: Array}}
   */
  static transformVersion(bluegreen, version){
    return {
      name: version.VersionLabel,
      description: version.Description,
      status: version.Status,
      created: version.DateCreated,
      updated: version.DateUpdated,
      service: ElasticBeanstalkStrategy.parseApplicationName(bluegreen, version.ApplicationName),
      'eb:SourceBundle': version.SourceBundle,
      deployments: []
    };
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
   * Get the Versions of the Application Register in Elastic Beanstalk
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  getVersions(bluegreen, context, callback){

    var ApplicationName = ElasticBeanstalkStrategy.getApplicationName(bluegreen, context);

    beanstalk.describeApplicationVersions({ ApplicationName }, (err, data) => {
      if (err){
        return callback(err, 'Error retrieving application versions.');
      }
      callback(null, _.map(data.ApplicationVersions, (v) => ElasticBeanstalkStrategy.transformVersion(bluegreen, v)));
    });
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

    beanstalk.describeEnvironments(request, (err, data) => {
      if (err){
        return callback(err, 'Error retrieving application environments/deployments.');
      }
      callback(null, _.map(data.Environments, (e) => ElasticBeanstalkStrategy.transformEnvironment(bluegreen, e)));
    });
  }

  /**
   * Get the Versions and Deployment status of a Service in Elastic Beanstalk.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  getVersionsAndStatus(bluegreen, context, callback){
    async.parallel({
      versions: (done) => {
        this.getVersions(bluegreen, context, done);
      },
      deployments: (done) => {
        this.getEnvironments(bluegreen, context, done);
      }
    }, (err, data) => {
      if (err) return callback(err, 'Could not retrieve version or deployment data');

      var versions = [];

      data.versions.forEach((v) => {

        var version = _.cloneDeep(v);

        var deployments = _.filter(data.deployments, (d) => {
          return d.version === v.name;
        });

        if (deployments.length > 0){
          version.deployments = deployments;
        }
        else {
          version.deployments = [];
        }

        versions.push(version);
      });

      callback(null, { service: context.service, versions });
    });
  }

  /**
   * Delete a deployment version from Elastic Beanstalk.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  deleteVersion(bluegreen, context, callback) {

    let ApplicationName = ElasticBeanstalkStrategy.getApplicationName(bluegreen, context),
        VersionLabel = context.version,
        DeleteSourceBundle = bluegreen.config.aws.beanstalk.versioning.deleteSourceBundle;

    this.getVersionsAndStatus(bluegreen, context, (err, response) => {
      if (err) return callback(err, 'Could not retrieve deployment status to determine if a deletion is possible.');

      let targetVersion = _.find(response.versions, (v) => {
        return VersionLabel === v.name;
      });

      if (!targetVersion) return callback(`No matching version [${VersionLabel}] found for service ${context.service}.`);

      if (targetVersion.deployments.length > 0) {
        let environments = _.map(targetVersion.deployments, (d) => d.name).join(', ');
        let errorMessage = `Service '${context.service}' has version '${VersionLabel}' deployed on environments: ${environments}.  Deletion will not continue until those environments have been upgraded or downgraded to a different version.`;
        return callback(new Error(errorMessage), 'Invalid Request');
      }

      beanstalk.deleteApplicationVersion({ ApplicationName, VersionLabel, DeleteSourceBundle }, (err) => {
        if (err) return callback(err, `An error occurred attempting to delete version ${VersionLabel} for service ${context.service}`);
        callback();
      });
    });
  }

  /**
   * Deploy a target version to an Elastic Beanstalk environment.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  deployVersion(bluegreen, context, callback){

    let request = {
      ApplicationName: ElasticBeanstalkStrategy.getApplicationName(bluegreen, context),
      EnvironmentName: context.environment,
      VersionLabel: context.version
    };

    beanstalk.updateEnvironment(request, (err) => {
      if (err) return callback(err, `An error occurred attempting to update environment ${context.environment} for service ${context.service}.  Could not deploy version ${context.version}`);
      callback();
    });
  }
}

module.exports = ElasticBeanstalkStrategy;