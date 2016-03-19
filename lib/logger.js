'use strict';

let _ = require('lodash'),
  moment = require('moment'),
  colors = require('colors/safe');

/**
 * Console-based logger that allows filtering messages by label.
 */
class Logger {

  /**
   * Initialize with options.
   * @param options
   */
  constructor(options){
    options = options || {};
    this.filters = options.filters || ['info', 'warn', 'error'];
    this.log = this._log.bind(this);
  }

  /**
   * Log a message to console.
   * @param labels
   * @param message
   */
  _log(labels, message){
    if (this.shouldOutput(labels)){
      console.log(colors.yellow(moment().toISOString()), labels, Logger.colorize(labels, JSON.stringify(message, null, 2)));
    }
  }

  /**
   * Colorize the message output based on the label.
   * @param labels {Array}
   * @param message {String}
   * @returns {String}
   */
  static colorize(labels, message){
    if (labels.indexOf('error') >= 0) return colors.red(message);
    if (labels.indexOf('warn') >= 0) return colors.yellow(message);
    return colors.green(message);
  }

  /**
   * Should the message be logged?
   * @param labels
   * @returns {boolean}
   */
  shouldOutput(labels){
    if (this.filters.length === 0) return true;
    return _.intersection(this.filters, labels).length > 0;
  }
}

module.exports = Logger;