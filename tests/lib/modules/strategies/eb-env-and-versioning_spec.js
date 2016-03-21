'use strict';

let chai = require('chai'),
  expect = chai.expect,
  log = require('../../../test-logger'),
  path = require('path'),
  Beanstalk = require('../../../../lib/modules/strategies/eb-env-and-versioning');

describe('Modules', () => {

  describe('Strategies', () => {

    describe('ElasticBeanstalk', () => {

      it('should parse the application name from EB if a prefix was used', () => {

        let conf = { config: { application: { prefix: 'prefix-' }}};

        let actualApplicationName = Beanstalk.parseApplicationName(conf, 'prefix-www');

        expect(actualApplicationName).to.eq('www');

      });

      it('should parse the application name from EB if a prefix was NOT used', () => {

        let conf = { config: { application: { prefix: '' }}};

        let actualApplicationName = Beanstalk.parseApplicationName(conf, 'www');

        expect(actualApplicationName).to.eq('www');
      });

    });
  });
});