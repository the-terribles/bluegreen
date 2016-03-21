'use strict';

let _ = require('lodash'),
  async = require('async'),
  AWS = require('aws-sdk'),
  elb = new AWS.ELB(),
  RequestTypes = require('../../request-types'),
  Strategy = require('../../strategy');

/**
 * Uses Elastic Load Balancer as a Gateway
 */
class ELBGatewayStrategy extends Strategy {

  /**
   * Register the Docker request handlers
   * @param bluegreen {BlueGreen} Application Instance
   * @param callback {Function} (err, registrations) : void
   */
  register(bluegreen, callback){
    callback(null, [
      {
        request: RequestTypes.Gateway.Create,
        handler: this.createGatewayForService.bind(this)
      },
      {
        request: RequestTypes.Gateway.List,
        handler: this.listGateways.bind(this)
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

  static transformGateway(lb){

    let lbname = ELBGatewayStrategy.parseLoadBalancerName(lb.LoadBalancerName);

    return {
      service: lbname.service,
      name: lbname.gateway,
      'elb:DNSName': lbname.DNSName
    };
  }

  /**
   *
   * example:  bluegreen-<service>-<gateway-name>
   *
   * @param lbname {String} Name of the Load Balancer
   */
  static parseLoadBalancerName(lbname){

    let matches = lbname.match(/^bluegreen-([a-zA-Z0-9\-._]+)-([a-zA-Z0-9\-._]+)$/);

    if (matches){
      return {
        service: matches[1],
        gateway: matches[2]
      };
    }

    return null;
  }

  /**
   * Get the Gateways used by BlueGreen (optionally, filter by service)
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  listGateways(bluegreen, context, callback){
    elb.describeLoadBalancers((err, data) => {
      if (err) return callback(err, 'Could not retrieve list of Gateways from AWS.');

      let serviceLoadBalancers = _.filter(data.LoadBalancerDescriptions, (lb) => {
        let lbname = ELBGatewayStrategy.parseLoadBalancerName(lb.LoadBalancerName);
        // This means they follow BlueGreen's naming convention, which means they are
        // managed by our workflow.
        if (lbname) {
          // If we are filtering by service.
          if (context.service){
            return lbname.service === context.service;
          }
          // Otherwise, this is a match.
          return true;
        }
        return false;
      });


      callback(null, _.map(serviceLoadBalancers, ELBGatewayStrategy.transformGateway));
    });
  }

  createGatewayForService(bluegreen, context, callback){

  }
}

module.exports = ELBGatewayStrategy;