'use strict';

const fs = require('fs'),
      { promisify } = require('util');

const access = promisify(fs.access);

const exists = async function ({ path }) {
  if (!path) {
    throw new Error('Path is missing.');
  }

  try {
    await access(path);
  } catch (ex) {
    return false;
  }

  return true;
};

module.exports = exists;
