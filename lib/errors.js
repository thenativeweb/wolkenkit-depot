'use strict';

const defekt = require('defekt');

const errors = defekt([
  'BucketNotFound',
  'FileAlreadyExists',
  'FileNotFound'
]);

module.exports = errors;
