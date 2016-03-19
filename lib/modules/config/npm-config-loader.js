'use strict';

let path = require('path'),
    utils = require('../../utils');

/**
 * Pulls the BlueGreen configuration from an NPM package manifest.
 * @param cwd {String} Current Working directory.
 * @param log {Function} logger implementation
 * @param callback {Function} (err, Object|false) : void
 */
module.exports = (cwd, log, callback) => {
  utils.loadJsonFile(path.join(cwd, 'package.json'), log, (err, packageConfig) => {
    if (err) utils.logErrorAndNotfiy(err, 'Error encountered loading package.json from the filesystem', log, callback);
    // No bluegreen configuration section.
    if (!packageConfig.hasOwnProperty('bluegreen')) return callback(null, false);
    // Return the bluegreen configuration.
    return callback(null, packageConfig.bluegreen);
  });
};