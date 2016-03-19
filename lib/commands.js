'use strict';

var _ = require('lodash'),
    async = require('async'),
    AWS = require('aws-sdk'),
    beanstalk = new AWS.ElasticBeanstalk(),
    VALID_SERVICES = ['images', 'www'];

var getVersions, getDeployments, deleteVersion, getVersionsAndStatus, parseApplicationName;

module.exports.parseApplicationEnvironmentName = parseApplicationName = function(name){
  var parts = name.split('-');
  return {
    service: parts[1],
    environment: parts[2]
  };
};

module.exports.getVersions = getVersions = function(service, callback){

  if (VALID_SERVICES.indexOf(service) < 0)
    return callback('Not a valid services name.', new Error('Invalid service name.'));

  var applicationName = 'nr8-' + service;

  beanstalk.describeApplicationVersions({ ApplicationName: applicationName }, function(err, data){
    if (err){
      return callback('Error retrieving application versions.', err);
    }
    callback(null, data.ApplicationVersions);
  });
};

module.exports.getDeployments = getDeployments = function(service, callback){

  if (VALID_SERVICES.indexOf(service) < 0)
    return callback('Not a valid services name.', new Error('Invalid service name.'));

  var applicationName = 'nr8-' + service;

  beanstalk.describeEnvironments({ ApplicationName: applicationName, IncludeDeleted: false }, function(err, data){
    if (err){
      return callback('Error retrieving application environments/deployments.', err);
    }
    callback(null, data.Environments);
  });
};

module.exports.getVersionsAndStatus = getVersionsAndStatus = function(service, callback){

  async.parallel({
    versions: function(done){
      getVersions(service, done);
    },
    deployments: function(done){
      getDeployments(service, done);
    }
  }, function(err, data){
    if (err) callback('Could not retrieve version or deployment data', err);

    var versions = [];

    data.versions.forEach(function(v){

      var version = _.cloneDeep(v);

      var deployments = _.filter(data.deployments, function(d){
        return d.VersionLabel === v.VersionLabel;
      });

      if (deployments.length > 0){
        version.deployments = deployments;
      }
      else {
        version.deployments = [];
      }

      versions.push(version);
    });

    callback(null, versions);
  });

};


module.exports.deleteVersion = deleteVersion =function(service, versionName, callback){

  getVersionsAndStatus(service, function(err, versions){
    if (err) return callback(err, versions);

    var targetVersion = _.find(versions, function(v){
      return v.VersionName === versionName;
    });

    if (!targetVersion){
      return callback('Version ' + versionName + ' does not exist.', new Error('Version not exist.'));
    }

    if (targetVersion.deployments.length > 0){
      var deployedEnvironments = _.map(version.deployments, function(d){
        return d.EnvironmentName.substring(('nr8-' + service).length + 1);
      }).join(', ');
      return callback(
        'Version ' + versionName +
        ' cannot be deleted because it is deployed to some environments: ' +
        deployedEnvironments + '.', new Error('Bad Request'));
    }

    return callback();
  });
};