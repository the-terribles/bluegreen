'use strict';

let _ = require('lodash'),
    utils = require('./utils'),
    async = require('async'),
    Logger = require('./logger'),
    Views = require('./view-types');

/**
 * Entry point for the application.
 */
class BlueGreen {

  /**
   * Initialize the service with the default module configuration.
   */
  constructor(options){
    options = options || {};

    // This is critically important since it defines how configuration is
    // loaded by bluegreen.
    this.configLoaders = options.configLoaders || [
      './modules/config/npm-config-loader',
      './modules/config/bluegreen-config-loader'
    ];

    let logger = null;

    if (options.logger) logger = options.logger;

    if (logger === null){
      let loggerOptions = options.loggerOptions || {};
      logger = new Logger(loggerOptions);
    }

    this.log = logger.log;

    this.defaults = {
      application: {
        prefix: 'nr8-'
      },
      aws: {
        beanstalk: {
          versioning: {
            deleteSourceBundle: true
          }
        }
      }
    };

    this.config = null;
    this.commands = [];
    this.strategies = [];
    this.viewLayer = null;

    this.modules = {
      // Modules related to configuration.
      commands: [
        './modules/commands/show-versions',
        './modules/commands/delete-version'
      ],
      strategies: [
        {
          path: './modules/strategies/elasticbeanstalk',
          instantiate: true
        }
      ],
      // Register the view module.
      views: './modules/views/console'
    }
  }

  /**
   * Initialize a module defined using module object specification.
   * @param mod {String|Object} module to instantiate.
   * @returns {Object} instance of the module.
   * @private
   */
  __initializeModule(mod){
    if (_.isString(mod)) return require(mod);
    let classOrAnonymousObject = require(mod.path);
    return (mod.instantiate)? new classOrAnonymousObject() : classOrAnonymousObject;
  }

  /**
   * Initialize the configuration by calling the registered configLoaders.
   * @param callback {Function} (err) : void
   * @private
   */
  __initConfig(callback){
    let loaders = _.map(this.configLoaders, (modulePath) => require(modulePath)),
        index = -1;

    async.whilst(
      () => {
        if (index === (loaders.length - 1)) return false;
        return this.config === null;
      },
      (next) => {
        index += 1;
        loaders[index].call(null, process.cwd(), this.log, (err, config) => {
          if (err) next(err);
          this.config = (config)? config : null;
          next();
        });
      },
      (err) => {
        if (err) callback([err, 'Could not initialize BlueGreen due to configuration issue.']);
        this.config = this.config || {};
        this.config = _.merge(this.defaults, this.config);
        return callback(err);
      }
    );
  }

  /**
   * Initialize the strategies by loading their modules.
   * @param callback {Function} (err) : void
   * @private
   */
  __initStrategies(callback){
    let strategyRegistrationTasks = _.map(this.modules.strategies, (mod) => {
      let strategyModule = this.__initializeModule(mod);
      return (next) => {
        if (!strategyModule.register) {
          return next(new Error('Strategy module does not have a register function.'));
        }

        strategyModule.register(this, (err, strategies) => {
          if (err) return next(err);
          if (_.isArray(strategies)){
            Array.prototype.push.apply(this.strategies, strategies);
            return next();
          }
          else {
            return next(new Error('Expected an array of strategies to be returned, but got something else.'));
          }
        });
      };
    });

    async.series(strategyRegistrationTasks, (err) => {
      if (err) return utils.logErrorAndNotfiy(err, 'Failed to register strategies with bluegreen', this.log, callback);
      return callback();
    });
  }

  /**
   * Initialize commands by loading their modules.
   * @param callback {Function} (err) : void
   * @private
   */
  __initCommands(callback){
    this.commands = _.map(this.modules.commands, (modulePath) => new (require(modulePath)));
    callback();
  }

  /**
   * Initialize the view layer by loading the module.
   * @param callback {Function} (err) : void
   * @private
   */
  __initViewLayer(callback){
    this.viewLayer = new (require(this.modules.views))(this);
    callback();
  }

  /**
   * Initialize the BlueGreen application.
   * @param callback {Function} (err) : void
   */
  init(callback){
    async.series([
        this.__initConfig.bind(this),
        this.__initStrategies.bind(this),
        this.__initCommands.bind(this),
        this.__initViewLayer.bind(this)
      ],
      (err) => {
        if (err) return utils.logErrorAndNotfiy(err[0], err[1], this.log, callback);
        callback();
      }
    );
  }

  /**
   * Run the command specified by the argv (Minimist parsing of the command line).
   * @param argv {Object} Minimist argv
   * @param callback {Function} (err) : void
   */
  run(argv, callback){
    let args = argv._.join(' '),
        targetCommand = _.find(this.commands, (command) => {
          return command.isMatch(this, args, argv);
        });
    if (targetCommand) return targetCommand.execute(this, argv, callback);
    let error = new Error('No matching command.');
    this.render(Views.Error, { error });
    this.render(Views.Help);
    callback(error);
  }

  /**
   * Request the handling of an action and return the result to the callback.
   * @param requestType {String} request type.
   * @param context {Object} event context
   * @param callback {Function} (err, results) : void
   */
  request(requestType, context, callback){
    let strategy = _.find(this.strategies, (s) => {
      return s.request === requestType;
    });
    if (!strategy) return callback(new Error('No matching implementation for this request type.'));
    strategy.handler(this, context, callback);
  }

  /**
   * Render data to the registered outlet.
   * @param layout {String} view type
   * @param data {Object} data to apply to the view.
   */
  render(layout, data){
    this.viewLayer.render(this, layout, data);
  }
}

module.exports = BlueGreen;