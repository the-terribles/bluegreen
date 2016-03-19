'use strict';

let path = require('path'),
    utils = require('../../utils');

/**
 * Attempts to load a JSON file called "bluegreen.json" from the current working directory.
 * @param cwd {String} Current Working directory.
 * @param log {Function} logger implementation
 * @param callback {Function} (err, Object|false) : void
 */
module.exports = (cwd, log, callback) => {
  utils.loadJsonFile(path.join(cwd, 'bluegreen.json'), log, callback);
};