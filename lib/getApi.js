'use strict';

const cors = require('cors'),
      express = require('express');

const { v1 } = require('./api');

const getApi = function ({ provider }) {
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const api = express();

  api.use(cors());

  api.use('/api/v1', v1({ provider }));

  return api;
};

module.exports = getApi;
