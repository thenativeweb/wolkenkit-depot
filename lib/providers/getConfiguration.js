'use strict';

const camelCase = require('lodash/camelCase'),
      mapKeys = require('lodash/mapKeys'),
      pickBy = require('lodash/pickBy'),
      processenv = require('processenv'),
      upperFirst = require('lodash/upperFirst');

const getConfiguration = function () {
  const environmentVariables = processenv();

  const configuration = mapKeys(
    pickBy(
      environmentVariables,
      (value, key) => key.startsWith('PROVIDER_')
    ),
    (value, key) => camelCase(key.replace(/^PROVIDER_/g, ''))
  );

  configuration.type = upperFirst(configuration.type) || 'FileSystem';

  return configuration;
};

module.exports = getConfiguration;
