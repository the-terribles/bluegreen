'use strict';

let chai = require('chai'),
  expect = chai.expect,
  log = require('../../../test-logger'),
  path = require('path'),
  loader = require('../../../../lib/modules/config/npm-config-loader');

describe('Modules', () => {

  describe('NPM Config Loader', () => {

    it('should return false if a package.json is present but does not have a bluegreen section', (next) => {

      loader(path.join(__dirname, 'data/has-not'), log, (err, config) => {

        expect(err).to.be.null;
        expect(config).to.be.false;

        next();
      });
    });

    it('should return the bluegreen section if it is present', (next) => {

      loader(path.join(__dirname, 'data/has'), log, (err, config) => {

        expect(err).to.be.null;
        expect(config).to.be.an('object');
        expect(config.foo).to.eq('bar');

        next();
      });
    });
  });
});