'use strict';

const isolated = require('isolated'),
      shell = require('shelljs');

const FileSystem = require('../../../lib/providers/FileSystem'),
      getTestsFor = require('../getTestsFor');

suite('FileSystem', async () => {
  const provider = new FileSystem();

  let directory;

  const setupProvider = async () => {
    directory = await isolated();

    await provider.initialize({ directory });
  };
  const teardownProvider = async () => {
    await shell.rm('-rf', directory);
  };

  getTestsFor({ provider, setupProvider, teardownProvider });
});
