'use strict';

const cors = require('cors'),
      express = require('express');

const { v1 } = require('./api');

const getApi = function ({
  corsOrigin,
  addFileAuthorizationOptions,
  identityProviders,
  provider
}) {
  if (!corsOrigin) {
    throw new Error('CORS origin is missing.');
  }
  if (!addFileAuthorizationOptions) {
    throw new Error('Add file authorization options are missing.');
  }
  if (!identityProviders) {
    throw new Error('Identity providers are missing.');
  }
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const api = express();

  api.use(cors({
    origin: corsOrigin,
    allowedHeaders: [ 'content-type', 'authorization', 'x-metadata', 'x-to' ],
    exposedHeaders: [ 'content-type', 'content-disposition', 'x-metadata' ]
  }));

  api.use('/api/v1', v1({ addFileAuthorizationOptions, identityProviders, provider }));

  return api;
};

module.exports = getApi;
