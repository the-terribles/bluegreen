'use strict';

let _ = require('lodash'),
  async = require('async'),
  exec = require('child_process').exec,
  RequestTypes = require('../../request-types'),
  Strategy = require('../../strategy');

/**
 * Uses Docker to package and upload containers to a Registry
 */
class GitStrategy extends Strategy {

  /**
   * Register the Docker request handlers
   * @param bluegreen {BlueGreen} Application Instance
   * @param callback {Function} (err, registrations) : void
   */
  register(bluegreen, callback){
    callback(null, [
      {
        request: RequestTypes.Versions.FindCodebaseVersion,
        handler: this.getVersionFromLastTag.bind(this)
      }
    ]);
  }

  /**
   * Get the latest version using the last Git Tag in the CWD.
   * @param bluegreen
   * @param context
   * @param callback
   */
  getVersionFromLastTag(bluegreen, context, callback){
    exec('git describe --abbrev=0 --tags', (err, stdout, stderr) => {
      if (err) return callback(err, stderr);
      callback(null, stdout.toString());
    });
  }
}

module.exports = GitStrategy;