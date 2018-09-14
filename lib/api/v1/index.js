'use strict';

const express = require('express'),
      Limes = require('limes');

const getBlob = require('./getBlob'),
      postAddBlob = require('./postAddBlob'),
      postRemoveBlob = require('./postRemoveBlob');

const v1 = function ({ addBlobAuthorizationOptions, identityProvider, provider }) {
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

  const limes = new Limes({
    identityProviderName: identityProvider.name,
    certificate: identityProvider.certificate
  });

  const verifyTokenMiddlewareExpress = limes.verifyTokenMiddlewareExpress();

  api.get('/blob/:id', verifyTokenMiddlewareExpress, getBlob({ provider }));

  api.post('/add-blob', verifyTokenMiddlewareExpress, postAddBlob({ addBlobAuthorizationOptions, provider }));
  api.post('/remove-blob', verifyTokenMiddlewareExpress, postRemoveBlob({ provider }));

  return api;
};

module.exports = v1;
