'use strict';

let _ = require('lodash'),
    utils = require('../../utils'),
    async = require('async'),
    AWS = require('aws-sdk'),
    route53 = new AWS.Route53(),
    RequestTypes = require('../../request-types'),
    Strategy = require('../../strategy'),
    BG_TXT_PREFIX = 'bluegreen-';

/**
 * Uses Route53 (AWS DNS) as a Gateway
 */
class Route53GatewayStrategy extends Strategy {

  /**
   * Register the Route 53 Request Handlers
   * @param bluegreen {BlueGreen} Application Instance
   * @param callback {Function} (err, registrations) : void
   */
  register(bluegreen, callback){

    bluegreen.registerRequestHandler({
      request: RequestTypes.Gateway.Create,
      handler: this.createGatewayForService.bind(this)
    });

    bluegreen.registerRequestHandler({
      request: RequestTypes.Gateway.List,
      handler: this.listGateways.bind(this)
    });

    bluegreen.registerRequestHandler({
      request: RequestTypes.Gateway.Attach,
      handler: this.attachEnvironmentToGateway.bind(this)
    });

    bluegreen.registerCommand(new (require('../commands/list-gateways'))());
    bluegreen.registerCommand(new (require('../commands/list-gateways-for-service'))());
    bluegreen.registerCommand(new (require('../commands/attach-gateway'))());
    bluegreen.registerCommand(new (require('../commands/create-gateway'))());

    callback(null);
  }

  /**
   * Convert the Route 53 Resource Record entry to a Gateway object
   * @param record {Object} Resource Record
   * @returns {Object} Gateway object
   */
  static transformGateway(record){
    let gateway = {
      name: record.gateway,
      service: record.service,
      environment: record.environment,
      uri: record.Name.substring(BG_TXT_PREFIX.length),
      'r53:Name': record.Name,
      'r53:HostedZoneId': record.zone,
      'r53:HostedZoneName': record.root
    };

    if (record.A){
      gateway['r53:Alias'] = record.A.AliasTarget.DNSName;
      gateway['r53:AliasHostedZoneId'] = record.A.AliasTarget.HostedZoneId;
    }

    return gateway;
  }

  /**
   * Return a function that either immediately returns the Zone from the context (if present)
   * or performs a lookup in Route 53 for a Singleton zone (i.e. only one zone for the account).
   * @param context
   * @returns {Function} (Function(err, HostZoneId) : void) : void
   */
  getZoneLookupFn(context){
    if (context.zone) return this.lookupHostedZone(context.zone);
    return this.checkForSingletonZone.bind(this);
  }

  /**
   * If there is only one Route53 Hosted Zone, use it.  Otherwise return an error since
   * we will not know what Zone to use for DNS.
   * @param next
   */
  checkForSingletonZone(next){
    route53.listHostedZones({}, (err, data) => {
      if (err) next(err);
      else if (data.HostedZones.length === 1){
        return next(null, data.HostedZones[0].Id, data.HostedZones[0].Name);
      }

      let zones = _.map(data.HostedZones, (z) => {
        return `${z.Name}: ${z.Id}`;
      }).join(', ');

      next(new Error('More than one hosted zone in AWS Environment.  ' +
                     'You will need to configure BlueGreen to use one or specify the target zone ' +
                     'when invoking this command.  The following are your available zones: ' +
                     zones));
    });
  }

  /**
   * Lookup the Hosted Zone... We specifically need it's name, which is really the DNS root for the Zone.
   * @param hostedZoneId {String}
   * @returns {Function}
   */
  lookupHostedZone(hostedZoneId){
    return (next) => {
      route53.getHostedZone({ Id : hostedZoneId }, (err, data) => {
        if (err) return next(err);
        next(null, data.HostedZone.Id, data.HostedZone.Name);
      });
    }
  }

  /**
   * Parse the TXT record to extract BlueGreen metadata.
   * @param record {Object}
   */
  static parseBlueGreenMetadata(record){
    let txtValue = Route53GatewayStrategy.getBlueGreenTXTRecord(record),
        parts = txtValue.split(':');
    if (parts.length === 2){
      let decoded = new Buffer(parts[1], 'base64').toString();
      return utils.tryParseJSONSync(decoded);
    }
    return null;
  }

  /**
   * Grab the BlueGreen metadata hash of the TXT record or return false.
   * @param record {Object}
   * @returns {Record}
   */
  static getBlueGreenTXTRecord(record){
    if (record.ResourceRecords.length > 0){
      let rrs = _.map(record.ResourceRecords, (r) => JSON.parse(r.Value));
      return _.find(rrs, (r) => r.indexOf('bluegreen') === 0);
    }
    return false;
  }

  /**
   * Is this a BlueGreen TXT record?
   * @param record {Object} record to test.
   * @returns {Boolean} True if it is a TXT record, False if it is not.
   */
  static isBlueGreenTXTRecord(record){
    if (record.Type === 'TXT'){
      return !!Route53GatewayStrategy.getBlueGreenTXTRecord(record);
    }
    return false;
  }

  /**
   * Loop through the recordset merging TXT and A records that point to the same RR Name.
   * The TXT record represents the BlueGreen Gateway Metadata and the A Record the binding to
   * an ELB alias.
   * @param records
   * @returns {Array}
   */
  static mergeTXTandARecords(records){
    let txtRecords = _.filter(records, Route53GatewayStrategy.isBlueGreenTXTRecord);
    txtRecords.forEach((TXT) => {
      let gatewayName = TXT.Name.substring(BG_TXT_PREFIX.length);
      let A = _.find(records, (R) => {
        return R.Type === 'A' && gatewayName === R.Name;
      });
      if (A) TXT.A = A;
    });

    return txtRecords;
  }

  /**
   * Dehydrate the BlueGreen Gateway metadata and append it to the record.  Return True/False
   * depending on whether the operation was successful (used for filtering).
   * @param record {Object}
   * @returns {boolean} True if metadata was parsed, False if not.
   */
  static dehydrateMetadata(record){
    let parsed = Route53GatewayStrategy.parseBlueGreenMetadata(record);
    if (!parsed) return false;
    record.gateway = parsed.gateway;
    record.service = parsed.service;
    record.environment = parsed.environment || null;
    return true;
  }

  /**
   * Encode the metadata (as Base64 string) so it can be stored on a TXT record.
   * @param gateway {String}
   * @param service {String}
   * @param environment {String}
   * @returns {String}
   */
  static hydrateMetadata(gateway, service, environment){
    let encoded = new Buffer(JSON.stringify({ gateway, service, environment })).toString('base64');
    return `"bluegreen:${encoded}"`
  }

  /**
   * Loop through the records, parsing the Gateway metadata.  If the metadata can't be parsed,
   * filter out the record.
   * @param records {Array}
   * @param hostedZone {String}
   * @returns {Array}
   */
  static addMetadataAndFilterInvalidRecords(records, hostedZone){
     return _.filter(records, (r) => Route53GatewayStrategy.dehydrateMetadata(r, hostedZone));
  }

  /**
   * Build the TXT Record that stores the Gateway Metadata
   * @param zoneName
   * @param context
   * @returns {{Name: string, Type: string, TTL: number, ResourceRecords: *[]}}
   */
  static buildTXTRecord(zoneName, context){
    let rrname = context.rrname || context.gateway;
    return {
      Name: `${BG_TXT_PREFIX}${rrname}.${zoneName}`,
      Type: 'TXT',
      TTL: 0,
      ResourceRecords: [
        {
          Value: Route53GatewayStrategy.hydrateMetadata(context.gateway, context.service, context.environment || null)
        }
      ]
    };
  }

  /**
   * Build the RR that points the Gateway at the Environment (CNAME or A depending on environment)
   * @param zoneName {String}
   * @param context {Object}
   * @param environment {Object}
   * @returns {Object}
   */
  static buildGatewayToEnvironmentDNSRecord(zoneName, context, environment){
    let rrname = context.rrname || context.gateway;

    let record = {
      Name: `${rrname}.${zoneName}`
    };

    if (environment['r53:Alias']){
      record.Type = 'A';
      record.AliasTarget = {
        HostedZoneId: environment['r53:HostedZoneId'],
        DNSName: environment['r53:CNAME'],
        EvaluateTargetHealth: false
      };
    }
    else {
      record.Type = 'CNAME';
      record.TTL = 0;
      record.ResourceRecords = [{ Value: environment.url }];
    }

    return record;
  }

  /**
   * Get the Gateways used by BlueGreen (optionally, filter by service)
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  listGateways(bluegreen, context, callback){

    let serviceFilter = (context.service)? (s) => s.service === context.service : _.identity,
        hostedZone = null,
        hostedZoneName = null;

    async.waterfall([
      // Lookup the zone that holds the service records
      this.getZoneLookupFn(context),
      // Pull resource records from Route 53.
      (HostedZoneId, HostedZoneName, next) => {
        hostedZone = HostedZoneId;
        hostedZoneName = HostedZoneName;
        route53.listResourceRecordSets({ HostedZoneId }, next)
      },
      // Find the essential DNS records needed to describe a Gateway
      (data, next) => next(null, Route53GatewayStrategy.mergeTXTandARecords(data.ResourceRecordSets)),
      // Append zone information.
      (records, next) => next(null, _.map(records, (r) => { r.zone = hostedZone; r.root = hostedZoneName; return r; })),
      // Parse the TXT record and filter invalid records
      (records, next) => next(null, Route53GatewayStrategy.addMetadataAndFilterInvalidRecords(records, hostedZone)),
      // Service Filter (if applicable)
      (records, next) => next(null, _.filter(records, serviceFilter)),
      // Transform the records.
      (records, next) => next(null, _.map(records, Route53GatewayStrategy.transformGateway))
    ], (err, gateways) => {
      if (err) {
        let message = (context.service)?
                        `An error occurred attempting to list gateways for service ${context.service}` :
                        'An error occurred attempting to list gateways.';
        callback(err, message);
      }
      return callback(null, gateways);
    });
  }

  /**
   * Create a Gateway for the specified Service.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  createGatewayForService(bluegreen, context, callback){

    this.listGateways(bluegreen, context, (err, gateways) => {
      if (err)
        return callback(err, 'An error occurred looking up Gateway information preventing Gateway creation.');

      let target = _.find(gateways, (g) =>{ return context.service === g.service && context.gateway === g.name; });

      if (target) return callback(null, { created: false, gateway: target });

      async.waterfall([
        this.getZoneLookupFn(context),
        // Create the TXT Record
        (HostedZoneId, HostZoneName, next) => {

          let TXT = Route53GatewayStrategy.buildTXTRecord(HostZoneName, context);

          let request = {
            ChangeBatch: {
              Changes: [{
                Action: 'CREATE',
                ResourceRecordSet: TXT
              }]
            },
            HostedZoneId
          };

          route53.changeResourceRecordSets(request, (err, data) => {
            if (err) return next(err);

            TXT.zone = HostedZoneId;
            TXT.service = context.service;
            TXT.gateway = context.gateway;

            next(null, Route53GatewayStrategy.transformGateway(TXT));
          });
        }
      ], (err, gateway) => {
        if (err)
          return callback(err, `Could not create gateway '${context.gateway}' for service '${context.service}'.`);
        callback(null, gateway);
      });
    });
  }

  /**
   * Attach the specified environment to a Gateway.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  attachEnvironmentToGateway(bluegreen, context, callback){

    async.waterfall([
      // Data Collection, which can be done in parallel.
      (next) => {
        async.parallel({
          gateways: (done) => this.listGateways(bluegreen, context, done),
          environments: (done) => bluegreen.request(RequestTypes.Environments.List, context, done),
          zone: (done) => this.getZoneLookupFn(context).call(this, (err, id, name) => {
            if (err) return done(err);
            done(null, { id, name });
          })
        }, (err, results) => {
          if (err) return next(err);
          return next(null, results.gateways, results.environments, results.zone);
        });
      },
      // Filter and find the target gateway and environment
      (gateways, environments, zone, next) => {

        // Find the target Gateway
        let gateway = _.find(gateways, (g) => {
          return g.name === context.gateway && g.service === context.service;
        });

        // Find the Target Environment
        let environment = _.find(environments, (e) => {
          return e.name === context.environment && e.service === context.service;
        });

        // Return error if either gateway of environment is null.
        if (!gateway) return next(new Error(`Gateway '${context.gateway}' does not exist.`));
        if (!environment) return next(new Error(`Environment '${context.environment}' does not exist.`));

        next(null, gateway, environment, zone);
      },
      // Attach the Gateway to the Environment
      (gateway, environment, zone, next) => {

        let TXT = Route53GatewayStrategy.buildTXTRecord(zone.name, context),
            G2E   = Route53GatewayStrategy.buildGatewayToEnvironmentDNSRecord(zone.name, context, environment);

        let request = {
          ChangeBatch: {
            Changes: [
              { Action: 'UPSERT', ResourceRecordSet: TXT },
              { Action: 'UPSERT', ResourceRecordSet: G2E }
            ]
          },
          HostedZoneId: zone.id
        };

        route53.changeResourceRecordSets(request, (err, data) => {
          if (err) return next(err);
          next();
        });
      }
    ], (err) => {
      if (err)
        return callback(err, `Could not attach gateway '${context.gateway}' to environment ` +
                             `'${context.environment}' for service '${context.service}'.`);

      callback(null, `Successfully attached gateway '${context.gateway}' to environment ` +
                     `'${context.environment}' for service '${context.service}'.`);
    });


  }

  /**
   * Detach the specified environment from a Gateway.
   * @param bluegreen {BlueGreen} Application Instance
   * @param context {Object} Request Data
   * @param callback {Function} (err, versions) : void
   */
  detachEnvironmentFromGateway(bluegreen, context, callback){

  }
}

module.exports = Route53GatewayStrategy;