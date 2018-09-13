'use strict';

const FileSystem = require('./FileSystem'),
      S3 = require('./S3');

const providers = {
  FileSystem,
  S3
};

module.exports = providers;
