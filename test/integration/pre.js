'use strict';

const Minio = require('minio'),
      oneLine = require('common-tags/lib/oneLine'),
      retry = require('async-retry'),
      shell = require('shelljs');

const pre = async function () {
  /* eslint-disable no-process-env */
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
  /* eslint-enable no-process-env */

  shell.exec(oneLine`
    docker run
      -d
      -p 9001:9000
      -e "MINIO_ACCESS_KEY=wolkenkit"
      -e "MINIO_SECRET_KEY=wolkenkit"
      --name minio-integration
      minio/minio:latest
      server
      /data
  `);

  await retry(async () => {
    const client = new Minio.Client({
      endPoint: 'localhost',
      port: 9001,
      useSSL: false,
      accessKey: 'wolkenkit',
      secretKey: 'wolkenkit'
    });

    await client.bucketExists('integration-tests');
  });
};

module.exports = pre;
