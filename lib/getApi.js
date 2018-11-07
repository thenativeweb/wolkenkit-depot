'use strict';

const cors = require('cors'),
      express = require('express');

const { v1 } = require('./api');

const getApi = function ({ addFileAuthorizationOptions, identityProvider, provider }) {
  if (!addFileAuthorizationOptions) {
    throw new Error('Add file authorization options are missing.');
  }
  if (!identityProvider) {
    throw new Error('Identity provider is missing.');
  }
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const api = express();

  api.use(cors({
    allowedHeaders: [ 'content-type', 'authorization', 'x-metadata', 'x-to' ],
    exposedHeaders: [ 'content-type', 'content-disposition', 'x-metadata' ]
  }));

  api.use('/api/v1', v1({ addFileAuthorizationOptions, identityProvider, provider }));

  return api;
};

module.exports = getApi;
