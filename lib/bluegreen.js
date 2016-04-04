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
          },
          configTemplate: {
            SolutionStackName: 'Multicontainer Docker 1.9 version 2.0.8'
          }
        },
        elb: {
          prototypes: {
            instance: {
              Listeners: [
                {
                  InstancePort: 80,
                  LoadBalancerPort: 80,
                  Protocol: 'HTTP',
                  InstanceProtocol: 'HTTP'
                }
              ]
            },
            health: {
              HealthCheck: {
                HealthyThreshold: 3,
                Interval: 10,
                Target: 'HTTP:80/ping',
                Timeout: 5,
                UnhealthyThreshold: 5
              }
            }
          }
        }
      }
    };

    this.config = null;
    this.commands = [];
    this.requestHandlers = [];
    this.viewLayer = null;

    this.modules = {
      // Modules related to configuration.
      strategies: {
        services: './modules/strategies/elasticbeanstalk-services',
        versions: './modules/strategies/elasticbeanstalk-versions',
        environments: './modules/strategies/elasticbeanstalk-environments',
        gateways: './modules/strategies/route53-gateway',
        codebase: './modules/strategies/git'
      },
      // Register the view module.
      views: {
        console: './modules/views/console',
        json: './modules/views/console-json'
      }
    }
  }

  get version(){
    return '0.0.1';
  }

  /**
   * Initialize a module defined using module object specification.
   * @param mod {String} module to instantiate.
   * @returns {Object} instance of the module.
   * @private
   */
  __initializeModule(mod){
    let classOrAnonymousObject = require(mod);
    return (classOrAnonymousObject.instantiate)? new classOrAnonymousObject() : classOrAnonymousObject;
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
          console.log('Calling Register');
          return next(new Error('Strategy module does not have a register function.'));
        }

        strategyModule.register(this, (err) => {
          if (err) return next(err);
          return next();
        });
      };
    });

    async.series(strategyRegistrationTasks, (err) => {
      if (err) return utils.logErrorAndNotfiy(err, 'Failed to register strategies with bluegreen', this.log, callback);
      return callback();
    });
  }

  /**
   * Initialize the view layer by loading the module.
   * @param callback {Function} (err) : void
   * @private
   */
  __initViewLayer(callback){
    if (this.argv.json){
      this.viewLayer = new (require(this.modules.views.json))(this);
    }
    else if (this.argv.render){
      if (this.modules.views[this.argv.render]){
        this.viewLayer = new (require(this.modules.views[this.argv.render]))(this);
      }
      else {
        return callback(new Error(`Unknown view type: ${this.argv.render}`));
      }
    }
    else {
      this.viewLayer = new (require(this.modules.views.console))(this);
    }
    callback();
  }

  /**
   * Initialize the BlueGreen application.
   * @param argv {Object} Minimist argv
   * @param callback {Function} (err) : void
   */
  init(argv, callback){
    this.argv = argv;
    this.args = argv._.join(' ');
    async.series([
        this.__initConfig.bind(this),
        this.__initStrategies.bind(this),
        this.__initViewLayer.bind(this)
      ],
      (err) => {
        if (err) return utils.logErrorAndNotfiy(err[0], err[1], this.log, callback);
        callback();
      }
    );
  }

  /**
   * Get the help descriptions from all of the commands.
   * @returns {Array}
   */
  getHelp(){
    return _.map(this.commands, (c) => c.description());
  }

  /**
   * Run the command specified by the argv (Minimist parsing of the command line).
   * @param callback {Function} (err) : void
   */
  run(callback){
    if (this.args.trim().toLowerCase() === 'help'){
      let help = this.getHelp();
      this.render(Views.Help, help);
      callback(null, help);
    }
    else {

      let targetCommand = _.find(this.commands, (command) => {
        return command.isMatch(this, this.args, this.argv);
      });

      if (targetCommand) return targetCommand.execute(this, this.argv, callback);

      let help = this.getHelp();
      this.render(Views.Warn, {message: `No command matches this signature: ${this.args}`});
      this.render(Views.Help, help);

      callback(new Error('Bad command.'), help);
    }
  }

  /**
   * Request the handling of an action and return the result to the callback.
   * @param requestType {String} request type.
   * @param context {Object} event context
   * @param callback {Function} (err, results) : void
   */
  request(requestType, context, callback){
    let requestHandler = _.find(this.requestHandlers, (s) => {
      return s.request === requestType;
    });
    if (!requestHandler) return callback(new Error('No matching implementation for this request type.'));
    requestHandler.handler(this, context, callback);
  }

  /**
   * Render data to the registered outlet.
   * @param layout {String} view type
   * @param data {Object} data to apply to the view.
   */
  render(layout, data){
    this.viewLayer.render(this, layout, data);
  }

  /**
   * Register a command with BlueGreen
   * @param command {Object}
   */
  registerCommand(command){
    this.commands.push(command);
  }

  /**
   * Regiter a handler with BlueGreen
   * @param handler {Object}
   */
  registerRequestHandler(handler){
    this.requestHandlers.push(handler);
  }
}

module.exports = BlueGreen;