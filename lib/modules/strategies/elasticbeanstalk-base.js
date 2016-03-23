'use strict';

let AWS = require('aws-sdk'),
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
    this.beanstalk = beanstalk;
    this.getRegistrations(bluegreen, (err, registrations) => {
      callback(err, registrations);
    });
  }

  /**
   * Get the registrations from subclasses of this class.
   * @param bluegreen {BlueGreen}
   * @param next {Function} (err, registrations) : void
   */
  getRegistrations(bluegreen, next){
    throw new Error('Not implemented');
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
}

module.exports = ElasticBeanstalkStrategy;