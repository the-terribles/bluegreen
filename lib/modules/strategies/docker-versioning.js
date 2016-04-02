'use strict';

let _ = require('lodash'),
  async = require('async'),
  RequestTypes = require('../../request-types'),
  Docker = require('dockerode'),
  Strategy = require('../../strategy');

/**
 * Uses Docker to package and upload containers to a Registry
 */
class ElasticBeanstalkStrategy extends Strategy {

  /**
   * Register the Docker request handlers
   * @param bluegreen {BlueGreen} Application Instance
   * @param callback {Function} (err, registrations) : void
   */
  register(bluegreen, callback){

    bluegreen.registerRequestHandler({
      request: RequestTypes.BuildDockerImage,
      handler: this.buildImage.bind(this)
    });

    bluegreen.registerRequestHandler({
      request: RequestTypes.PushDockerImage,
      handler: this.pushImage.bind(this)
    });

    callback(null);
  }

  buildImage(bluegreen, context, callback){
    let version = context.version;
  }

  login(bluegreen, context, callback){

  }

  pushImage(bluegreen, context, callback){

  }
}

module.exports = ElasticBeanstalkStrategy;