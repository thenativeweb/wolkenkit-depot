'use strict';

const prepareErrorHandling = require('./lib/process/prepareErrorHandling');

prepareErrorHandling();

const fs = require('fs'),
      http = require('http'),
      path = require('path'),
      { promisify } = require('util');

const flaschenpost = require('flaschenpost'),
      processenv = require('processenv'),
      spdy = require('spdy'),
      tailwind = require('tailwind'),
      Value = require('validate-value');

const getApi = require('./lib/getApi'),
      getProviderConfiguration = require('./lib/providers/getConfiguration'),
      providers = require('./lib/providers');

const readFile = promisify(fs.readFile);

const logger = flaschenpost.getLogger();

const keysDirectory = processenv('KEYS');

const addBlobAuthorizationOptions = processenv('IS_AUTHORIZED_COMMANDS_ADD_BLOB', { forAuthenticated: true, forPublic: false }),
      httpPort = processenv('HTTP_PORT', 80),
      httpsPort = processenv('HTTPS_PORT', 443),
      identityProviderCertificatePath = processenv('IDENTITYPROVIDER_CERTIFICATE'),
      identityProviderName = processenv('IDENTITYPROVIDER_NAME'),
      statusCorsOrigin = processenv('STATUS_CORS_ORIGIN', '*'),
      statusPort = processenv('STATUS_PORT', 3333);

const providerConfiguration = getProviderConfiguration();

(async () => {
  try {
    const certificate = await readFile(path.join(keysDirectory, 'certificate.pem'), { encoding: 'utf8' }),
          privateKey = await readFile(path.join(keysDirectory, 'privateKey.pem'), { encoding: 'utf8' });

    const identityProviderCertificate = await readFile(path.join(identityProviderCertificatePath, 'certificate.pem'));

    const value = new Value({
      type: 'object',
      properties: {
        forAuthenticated: { type: 'boolean' },
        forPublic: { type: 'boolean' }
      },
      additionalProperties: false,
      required: [ 'forAuthenticated', 'forPublic' ]
    });

    if (!value.isValid(addBlobAuthorizationOptions)) {
      throw new Error('Environment variable \'IS_AUTHORIZED_COMMANDS_ADD_BLOB\' is malformed.');
    }

    const provider = new providers[providerConfiguration.type]();

    await provider.initialize(providerConfiguration);

    const api = getApi({
      addBlobAuthorizationOptions,
      identityProvider: {
        name: identityProviderName,
        certificate: identityProviderCertificate
      },
      provider
    });

    await new Promise((resolve, reject) => {
      try {
        http.createServer(api).listen(httpPort, resolve);
      } catch (ex) {
        reject(ex);
      }
    });

    await new Promise((resolve, reject) => {
      try {
        spdy.createServer({
          key: privateKey,
          cert: certificate
        }, api).listen(httpsPort, resolve);
      } catch (ex) {
        reject(ex);
      }
    });

    const app = tailwind.createApp({});

    await app.status.use(new app.wires.status.http.Server({
      port: statusPort,
      corsOrigin: statusCorsOrigin
    }));

    logger.info('Server started.', {
      ports: {
        https: httpsPort,
        http: httpPort
      }
    });
  } catch (ex) {
    logger.fatal('An unexpected error occured.', { err: ex });

    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  }
})();
