'use strict';

let _ = require('lodash'),
    colors = require('colors'),
    moment = require('moment'),
    Views = require('../../view-types'),
    Table = require('easy-table');

class ConsoleViewLayer {

  render(bluebird, layout, data){
    switch(layout){
      case Views.Error : return this.renderError(data);
      case Views.Warn  : return this.renderWarn(data);
      case Views.Success : return this.renderSuccess(data);
      case Views.Help  : return this.renderHelp(bluebird, data);
      case Views.VersionsAndStatus : return this.renderVersionsAndStatus(data);
      case Views.Environments : return this.renderEnvironments(data);

      case Views.Gateways : return this.renderGateways(data);
      
      case Views.Debug.CodebaseVersion: return this.renderDebugShowCreateVersion(data);

      default: return this.renderError({
        error: new Error('Missing View'),
        message: `Could not find template: ${layout}`
      });
    }
  }

  padLeftRightString(stringToPad, maxLength, padCharacter){
    padCharacter = padCharacter || ' ';
    let sidePaddingLength = Math.floor((maxLength - stringToPad.length) / 2),
        sidePadding = _.map(_.range(sidePaddingLength), () => padCharacter).join('');
    return `${sidePadding}${stringToPad}${sidePadding}`;
  }

  static formatCommandPlaceholders(usage){
    return usage.replace(/(<[a-zA-Z0-9-_]+>)/g, function(match, p1, offset, string){
      return colors.magenta('<') + colors.cyan(match.slice(1, match.length - 1)) + colors.magenta('>');
    });
  }

  renderHelp(bluebird, commands){

    console.log(colors.magenta(`\nBlueGreen shell v${bluebird.version}`));
    console.log('A simplified workflow for BlueGreen deployments...\n');

    let groups = _.groupBy(commands, 'category');

    _.keys(groups).forEach((group) => {

      console.log(colors.yellow(group.toUpperCase()));

      groups[group].forEach((command) => {
        console.log('-', command.description);
        console.log('  ', colors.blue('bluegreen'), colors.green(ConsoleViewLayer.formatCommandPlaceholders(command.usage)));

        if (command.opts){
          console.log('    ', colors.gray('With Options:'));

          _.toPairs(command.opts).forEach((pair) => {
            console.log('      ', colors.magenta(pair[0]) + ':', pair[1])
          })
        }

        console.log('');
      });
      
    });
  }

  renderSuccess(data){
    console.log('\n' + colors.green(data.message) + '\n');
  }

  renderWarn(data){
    console.log('\n' + colors.yellow(data.message) + '\n');
  }

  renderError(data){
    console.log('\n');

    let message = data.message || 'Oops, an error has occurred.';

    console.log(colors.bgRed(this.padLeftRightString(message, 80)) + '\n');

    if (data.error && data.error.stack){
      console.log(colors.red(`\t${data.error.stack}`));
    }
  }

  static colorizeStatus(status){
    switch(status.toLowerCase()){
      case 'failed': return colors.red(status);
      case 'unprocessed': return colors.yellow(status);
      case 'processing': return colors.cyan(status);
      default: return colors.green(status);
    }
  };

  renderVersionsAndStatus(context){

    let service = context.service,
        versions = context.versions;

    if (!versions || versions.length === 0){
      return console.log(colors.yellow('No versions are registered.'));
    }

    var buffer = colors.magenta('\nVersions for Service "' + service.toUpperCase() + '"') + '\n\n';

    var t = new Table();

    versions.forEach(function(version){
      t.cell('Version ID', colors.blue(version.name));
      t.cell('Status', ConsoleViewLayer.colorizeStatus(version.status));
      t.cell('Created', moment(version.created).fromNow());

      var deployedEnvironments = _.map(version.deployments, function(d){
        return d.name.substring(('nr8-' + service).length + 1);
      }).join(', ');

      t.cell('Deployments', deployedEnvironments);
      t.newRow();
    });

    buffer += t.toString();

    console.log(buffer);
  }

  renderGateways(gateways){

    if (!gateways || gateways.length === 0){
      return console.log(colors.yellow('No gateways are registered.'));
    }

    let buffer = '',
      t = new Table(),
      serviceNames = _.map(_.uniqBy(gateways, 'service'), 'service');

    if (serviceNames.length === 1){
      buffer += colors.magenta(`\nGateways for Service "${serviceNames[0].toUpperCase()}"\n\n`);
    }
    else {
      buffer += colors.magenta(`\nGateways\n\n`);
    }

    gateways.forEach(function(gateway){
      t.cell('Service', colors.blue(gateway.service));
      t.cell('Gateway Name', colors.green(gateway.name));

      // Environment can be null, so account for it.
      let environment = colors.cyan('<unattached>');
      if (gateway.environment) environment = colors.yellow(gateway.environment);

      t.cell('Attached Environment', environment);
      t.cell('URI', gateway.uri);
      t.newRow();
    });

    buffer += t.toString();

    console.log(buffer);
  }

  renderEnvironments(environments){

    if (!environments || environments.length === 0){
      return console.log(colors.yellow('No environments are registered.'));
    }

    let buffer = '',
        t = new Table(),
        serviceNames = _.map(_.uniqBy(environments, 'service'), 'service');

    if (serviceNames.length === 1){
      buffer += colors.magenta(`\nEnvironments for Service "${serviceNames[0].toUpperCase()}"\n\n`);
    }
    else {
      buffer += colors.magenta(`\nEnvironments\n\n`);
    }

    environments.forEach(function(environment){
      t.cell('Service', colors.blue(environment.service));
      t.cell('Environment Name', colors.green(environment.name));
      t.cell('Deployed Version', environment.version);
      t.cell('Status', environment.status);
      t.cell('Created', moment(environment.created).fromNow());
      t.cell('Updated', moment(environment.updated).fromNow());
      t.newRow();
    });

    buffer += t.toString();

    console.log(buffer);
  }

  renderDebugShowCreateVersion(context){
    if (context.error){
      console.log(colors.cyan('\nCould not determine the effective version from the codebase:'));
      console.log(colors.red(context.error));
    }
    else {
      console.log(colors.green(context.version));
    }
  }

}

module.exports = ConsoleViewLayer;