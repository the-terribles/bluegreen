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
      case Views.Success : return this.renderSuccess(data);
      case Views.Help  : return this.renderHelp(data);
      case Views.VersionsAndStatus : return this.renderVersionsAndStatus(data);
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

  renderHelp(data){

  }

  renderSuccess(data){
    console.log('\n' + colors.green(data.message) + '\n');
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
}

module.exports = ConsoleViewLayer;