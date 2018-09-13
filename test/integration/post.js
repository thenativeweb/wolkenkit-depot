'use strict';

const shell = require('shelljs');

const post = async function () {
  shell.exec([
    'docker kill minio-integration; docker rm -v minio-integration'
  ].join(';'));
};

module.exports = post;
