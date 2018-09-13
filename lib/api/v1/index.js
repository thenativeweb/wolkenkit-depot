'use strict';

const express = require('express');

const getBlob = require('./getBlob'),
      postAddBlob = require('./postAddBlob'),
      postRemoveBlob = require('./postRemoveBlob');

const v1 = function ({ provider }) {
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const api = express();

  api.get('/blob/:id', getBlob({ provider }));

  api.post('/add-blob', postAddBlob({ provider }));
  api.post('/remove-blob', postRemoveBlob({ provider }));

  return api;
};

module.exports = v1;
