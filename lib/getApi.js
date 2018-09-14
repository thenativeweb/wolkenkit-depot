'use strict';

const cors = require('cors'),
      express = require('express');

const { v1 } = require('./api');

const getApi = function ({ addBlobAuthorizationOptions, identityProvider, provider }) {
  if (!addBlobAuthorizationOptions) {
    throw new Error('Add blob authorization options are missing.');
  }
  if (!identityProvider) {
    throw new Error('Identity provider is missing.');
  }
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const api = express();

  api.use(cors());

  api.use('/api/v1', v1({ addBlobAuthorizationOptions, identityProvider, provider }));

  return api;
};

module.exports = getApi;
