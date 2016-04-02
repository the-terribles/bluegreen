'use strict';

/**
 * Maps requests to strategies that fulfill those requests.
 */
module.exports = {

  Versions: {
    List: 'list-versions',
    Create: 'create-version',
    Delete: 'delete-version',
    Deploy: 'deploy-version',

    /**
     * When you're using BlueGreen inside a codebase,
     * it may not be necessary to specify the service
     * version when creating a new one.  Strategies like
     * "git" will attempt to determine the appropriate version.
     */
    FindCodebaseVersion: 'find-codebase-version'
  },

  Environments: {
    List: 'list-environments'
  },

  BuildDockerImage: 'build-docker-image',
  PushDockerImage: 'push-docker-image',

  Gateway: {
    Create: 'create-gateway',
    List: 'list-gateways',
    Attach: 'attach-gateway',
    Detach: 'detach-gateway',
    Swap: 'swap-gateway',
    TearDown: 'teardown-gateway'
  }
};