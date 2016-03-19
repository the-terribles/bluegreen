'use strict';

let chai = require('chai'),
    expect = chai.expect,
    log = require('../test-logger'),
    path = require('path'),
    loader = require('../../lib/modules/config/bluegreen-config-loader');

describe('Utilities', () => {

  describe('JSON File Loader', () => {

    it('should return false if there is no JSON file present', (next) => {

      loader(path.join(__dirname, 'data/json-file'), log, (err, config) => {

        expect(err).to.be.null;
        expect(config).to.be.false;

        next();
      });
    });

    it('should return an error if target path is not a file', (next) => {

      loader(path.join(__dirname, 'data/json-file/dir/'), log, (err, config) => {

        expect(err).to.not.be.null;

        next();
      });
    });

    it('should return an error if the file is not valid JSON', (next) => {

      loader(path.join(__dirname, 'data/json-file/not-valid/'), log, (err, config) => {

        expect(err).to.not.be.null;

        next();
      });
    });

    it('should return the JSON object', (next) => {

      loader(path.join(__dirname, 'data/json-file/file'), log, (err, config) => {

        expect(err).to.be.null;
        expect(config).to.not.be.false;
        expect(config).to.be.an('object');

        next();
      });
    });
  });
});