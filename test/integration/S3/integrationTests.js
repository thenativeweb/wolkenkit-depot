'use strict';

const getTestsFor = require('../getTestsFor'),
      S3 = require('../../../lib/providers/S3');

suite('S3', async () => {
  const provider = new S3();

  const setupProvider = async () => {
    await provider.initialize({
      endpoint: 'localhost',
      port: 9001,
      useSsl: false,
      accessKey: 'wolkenkit',
      secretKey: 'wolkenkit',
      bucketName: 'integration-tests'
    });
  };
  const teardownProvider = async () => {
    // Intentionally left blank.
  };

  getTestsFor({ provider, setupProvider, teardownProvider });
});
