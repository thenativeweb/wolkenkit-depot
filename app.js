'use strict';

const prepareErrorHandling = require('./lib/process/prepareErrorHandling');

prepareErrorHandling();

const fs = require('fs'),
      http = require('http'),
      path = require('path'),
      { promisify } = require('util');

const flaschenpost = require('flaschenpost'),
      getCorsOrigin = require('get-cors-origin'),
      processenv = require('processenv'),
      tailwind = require('tailwind'),
      Value = require('validate-value');

const getApi = require('./lib/getApi'),
      getProviderConfiguration = require('./lib/providers/getConfiguration'),
      providers = require('./lib/providers');

const readFile = promisify(fs.readFile);

const logger = flaschenpost.getLogger();

const addFileAuthorizationOptions = processenv('IS_AUTHORIZED_COMMANDS_ADD_FILE', { forAuthenticated: true, forPublic: false }),
      apiCorsOrigin = getCorsOrigin(processenv('API_CORS_ORIGIN')),
      httpPort = processenv('HTTP_PORT', 80),
      statusCorsOrigin = processenv('STATUS_CORS_ORIGIN', '*'),
      statusPort = processenv('STATUS_PORT', 3333);

const providerConfiguration = getProviderConfiguration();

(async () => {
  try {
    const identityProviders = await Promise.all(
      processenv('IDENTITYPROVIDERS', []).map(async identityProvider => ({
        issuer: identityProvider.issuer,
        certificate: await readFile(path.join(identityProvider.certificate, 'certificate.pem'))
      }))
    );

    const value = new Value({
      type: 'object',
      properties: {
        forAuthenticated: { type: 'boolean' },
        forPublic: { type: 'boolean' }
      },
      additionalProperties: false,
      required: [ 'forAuthenticated', 'forPublic' ]
    });

    if (!value.isValid(addFileAuthorizationOptions)) {
      throw new Error('Environment variable \'IS_AUTHORIZED_COMMANDS_ADD_FILE\' is malformed.');
    }

    const provider = new providers[providerConfiguration.type]();

    await provider.initialize(providerConfiguration);

    const api = getApi({
      corsOrigin: apiCorsOrigin,
      addFileAuthorizationOptions,
      identityProviders,
      provider
    });

    await new Promise((resolve, reject) => {
      try {
        http.createServer(api).listen(httpPort, resolve);
      } catch (ex) {
        reject(ex);
      }
    });

    const app = tailwind.createApp({});

    await app.status.use(new app.wires.status.http.Server({
      port: statusPort,
      corsOrigin: statusCorsOrigin
    }));

    logger.info('Server started.', { httpPort });
  } catch (ex) {
    logger.fatal('An unexpected error occured.', { err: ex });

    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
})();
