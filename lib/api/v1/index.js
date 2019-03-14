'use strict';

const express = require('express'),
      Limes = require('limes');

const getFile = require('./getFile'),
      postAddFile = require('./postAddFile'),
      postAuthorize = require('./postAuthorize'),
      postRemoveFile = require('./postRemoveFile'),
      postTransferOwnership = require('./postTransferOwnership');

const v1 = function ({ addFileAuthorizationOptions, identityProviders, provider }) {
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

  const limes = new Limes({ identityProviders });

  const verifyTokenMiddleware = limes.verifyTokenMiddleware({
    issuerForAnonymousTokens: 'https://token.invalid'
  });

  api.get('/file/:id', verifyTokenMiddleware, getFile({ provider }));

  api.post('/add-file', verifyTokenMiddleware, postAddFile({ addFileAuthorizationOptions, provider }));
  api.post('/remove-file', verifyTokenMiddleware, postRemoveFile({ provider }));
  api.post('/transfer-ownership', verifyTokenMiddleware, postTransferOwnership({ provider }));
  api.post('/authorize', verifyTokenMiddleware, postAuthorize({ provider }));

  return api;
};

module.exports = v1;
