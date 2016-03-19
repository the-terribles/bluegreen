'use strict';

var chai = require('chai'),
    expect = chai.expect,
    commands = require('../../lib/commands');


describe('Commands', function(){

  it('should be able to parse the name of the EB application environment', function(){

    var app = commands.parseApplicationEnvironmentName('nr8-images-blue');

    expect(app.service).to.eq('images');
    expect(app.environment).to.eq('blue');

    app = commands.parseApplicationEnvironmentName('nr8-images-green');

    expect(app.service).to.eq('images');
    expect(app.environment).to.eq('green');

    app = commands.parseApplicationEnvironmentName('nr8-www-blue');

    expect(app.service).to.eq('www');
    expect(app.environment).to.eq('blue');

    app = commands.parseApplicationEnvironmentName('nr8-www-green');

    expect(app.service).to.eq('www');
    expect(app.environment).to.eq('green');
  });
});