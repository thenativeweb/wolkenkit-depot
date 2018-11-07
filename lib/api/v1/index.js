'use strict';

const express = require('express'),
      Limes = require('limes');

const getFile = require('./getFile'),
      postAddFile = require('./postAddFile'),
      postAuthorize = require('./postAuthorize'),
      postRemoveFile = require('./postRemoveFile'),
      postTransferOwnership = require('./postTransferOwnership');

const v1 = function ({ addFileAuthorizationOptions, identityProvider, provider }) {
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

  const limes = new Limes({
    identityProviderName: identityProvider.name,
    certificate: identityProvider.certificate
  });

  const verifyTokenMiddlewareExpress = limes.verifyTokenMiddlewareExpress();

  api.get('/file/:id', verifyTokenMiddlewareExpress, getFile({ provider }));

  api.post('/add-file', verifyTokenMiddlewareExpress, postAddFile({ addFileAuthorizationOptions, provider }));
  api.post('/remove-file', verifyTokenMiddlewareExpress, postRemoveFile({ provider }));
  api.post('/transfer-ownership', verifyTokenMiddlewareExpress, postTransferOwnership({ provider }));
  api.post('/authorize', verifyTokenMiddlewareExpress, postAuthorize({ provider }));

  return api;
};

module.exports = v1;
