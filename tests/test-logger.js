'use strict';

let _ = require('lodash'),
    Logger = require('../lib/logger');

let getLogLevels = () => {
  return {
    filters: _.map(process.env.SHOW_LOGGING.split(','), (level) => level.trim())
  }
};

/**
 * The general behavior is to show no logging.  If you want to see some debug output, you will need to set
 * the environment variable SHOW_LOGGING, supplying the levels you want to see:
 *
 * e.g. SHOW_LOGGING="info,debug,warn,error"  OR  SHOW_LOGGING="info, debug, warn, error"
 *
 * White space is trimmed.
 *
 * @type {_.noop}
 */
module.exports = (process.env.SHOW_LOGGING)? (new Logger( getLogLevels() )).log : _.noop;
