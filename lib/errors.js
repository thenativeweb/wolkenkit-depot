'use strict';

const defekt = require('defekt');

const errors = defekt([
  'BlobAlreadyExists',
  'BlobNotFound'
]);

module.exports = errors;
