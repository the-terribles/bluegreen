'use strict';

var async = require('async'),
    argv = require('minimist')(process.argv.slice(2)),
    BlueGreen = require('./lib/bluegreen'),
    bluegreen = new BlueGreen();

/**
 * Initialize BlueGreen, run the command, and exit.
 */
async.series([
  (next) => bluegreen.init(next),
  (next) => bluegreen.run(argv, next)
], (err) => {
  process.exit((err)? 1 : 0);
});
