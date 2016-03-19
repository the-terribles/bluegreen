'use strict';


let fs = require('fs'),
  path = require('path');

let logErrorAndNotfiy, loadJsonFile, tryParseJSON;

/**
 * Load a JSON file from Disk.  If the file is not found, this will not return an error, but rather
 * a "false" value.  This is because on many occasions, we will be optionally looking for a file.
 * @param filePath {String} path to the json file to load.
 * @param log {Function} logger implementation
 * @param callback {Function} (err, Object|false) : void
 */
module.exports.loadJsonFile = loadJsonFile = (filePath, log, callback) => {
  fs.stat(filePath, (err, stat) => {
    if (err) {
      if (err.code === 'ENOENT'){
        return callback(null, false);
      }
      return logErrorAndNotfiy(err, 'Could not stat bluegreen.json file.', log, callback);
    }
    if (stat.isFile()){
      fs.readFile(filePath, (err, data) => {
        if (err) return logErrorAndNotfiy(err, 'Could not read bluegreen.json file.', log, callback);
        tryParseJSON(data, (err, config) => {
          if (err) return logErrorAndNotfiy(err, 'Could not parse bluegreen.json file (not valid JSON).  Check your syntax.', log, callback);
          return callback(null, config);
        });
      });
    }
    // Not a file.
    else logErrorAndNotfiy(null, 'bluegreen.json exists but is not a file.', log, callback);
  });
};

/**
 * Solution to a very common JS pattern.
 * @param err {Error} returned by some action (optional).  Supply null and an error will be created
 *                    using the message.
 * @param message {String} Message to show to the user describing the context of the error.
 * @param log {Function} Log messages
 * @param callback {Function} to notify the caller.
 */
module.exports.logErrorAndNotfiy = logErrorAndNotfiy = (err, message, log, callback) => {
  err = err || new Error(message);
  log(['error'], { message, error: err });
  return callback(err);
};

/**
 * Try parsing the JSON and notify the callback if there is an error.
 * @param possiblyJSON {String} JSON string to parse.
 * @param callback {Function} to notify the caller.
 */
module.exports.tryParseJSON = tryParseJSON = (possiblyJSON, callback) => {
  try {
    let obj = JSON.parse(possiblyJSON);
    callback(null, obj);
  }
  catch (e) {
    callback(e);
  }
};