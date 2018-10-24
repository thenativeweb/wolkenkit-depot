'use strict';

const fs = require('fs'),
      path = require('path'),
      { promisify } = require('util');

const isolatedCallback = require('isolated'),
      pumpCallback = require('pump'),
      shell = require('shelljs');

const errors = require('../../errors'),
      { exists } = require('../../files');

const isolated = promisify(isolatedCallback),
      pump = promisify(pumpCallback),
      readFile = promisify(fs.readFile),
      writeFile = promisify(fs.writeFile);

class FileSystem {
  async initialize ({ directory }) {
    if (!directory) {
      this.directory = await isolated();

      return;
    }

    this.directory = directory;
  }

  async addBlob ({ id, fileName, contentType, isAuthorized, stream }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!fileName) {
      throw new Error('File name is missing.');
    }
    if (!contentType) {
      throw new Error('Content type is missing.');
    }
    if (!isAuthorized) {
      throw new Error('isAuthorized is missing.');
    }
    if (!stream) {
      throw new Error('Stream is missing.');
    }

    const blobDirectory = path.join(this.directory, id);
    const blobFileData = path.join(blobDirectory, 'data');
    const blobFileMetadata = path.join(blobDirectory, 'metadata.json');

    if (await exists({ path: blobDirectory })) {
      throw new errors.BlobAlreadyExists('Blob already exists.');
    }

    shell.mkdir('-p', blobDirectory);

    const targetStream = fs.createWriteStream(blobFileData);

    await pump(stream, targetStream);

    const metadata = {
      id,
      fileName,
      contentType,
      isAuthorized
    };

    await writeFile(blobFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }

  async getMetadata ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const blobDirectory = path.join(this.directory, id);
    const blobFileMetadata = path.join(blobDirectory, 'metadata.json');

    if (!await exists({ path: blobDirectory })) {
      throw new errors.BlobNotFound('Blob not found.');
    }

    const rawMetadata = await readFile(blobFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    return {
      id,
      fileName: metadata.fileName,
      contentType: metadata.contentType,
      isAuthorized: metadata.isAuthorized
    };
  }

  async getBlob ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const blobDirectory = path.join(this.directory, id);
    const blobFileData = path.join(blobDirectory, 'data');

    if (!await exists({ path: blobDirectory })) {
      throw new errors.BlobNotFound('Blob not found.');
    }

    const stream = fs.createReadStream(blobFileData);

    return stream;
  }

  async removeBlob ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const blobDirectory = path.join(this.directory, id);

    if (!await exists({ path: blobDirectory })) {
      throw new errors.BlobNotFound('Blob not found.');
    }

    await shell.rm('-rf', blobDirectory);
  }

  async transferOwnership ({ id, to }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!to) {
      throw new Error('To is missing.');
    }

    const blobDirectory = path.join(this.directory, id);
    const blobFileMetadata = path.join(blobDirectory, 'metadata.json');

    if (!await exists({ path: blobDirectory })) {
      throw new errors.BlobNotFound('Blob not found.');
    }

    const rawMetadata = await readFile(blobFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized.owner = to;

    await writeFile(blobFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }

  async authorize ({ id, isAuthorized }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!isAuthorized) {
      throw new Error('Is authorized is missing.');
    }

    const blobDirectory = path.join(this.directory, id);
    const blobFileMetadata = path.join(blobDirectory, 'metadata.json');

    if (!await exists({ path: blobDirectory })) {
      throw new errors.BlobNotFound('Blob not found.');
    }

    const rawMetadata = await readFile(blobFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized = isAuthorized;

    await writeFile(blobFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }
}

module.exports = FileSystem;
