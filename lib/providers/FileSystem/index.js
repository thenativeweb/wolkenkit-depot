'use strict';

const fs = require('fs'),
      path = require('path'),
      { promisify } = require('util');

const isolated = require('isolated'),
      pumpCallback = require('pump'),
      shell = require('shelljs');

const errors = require('../../errors'),
      { exists } = require('../../files');

const pump = promisify(pumpCallback),
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

  async addFile ({ id, fileName, contentType, isAuthorized, stream }) {
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

    const fileDirectory = path.join(this.directory, id);
    const fileFileData = path.join(fileDirectory, 'data');
    const fileFileMetadata = path.join(fileDirectory, 'metadata.json');

    if (await exists({ path: fileDirectory })) {
      throw new errors.FileAlreadyExists('File already exists.');
    }

    shell.mkdir('-p', fileDirectory);

    const targetStream = fs.createWriteStream(fileFileData);

    let contentLength = 0;

    stream.on('data', data => {
      contentLength += data.length;
    });

    await pump(stream, targetStream);

    const metadata = {
      id,
      fileName,
      contentType,
      contentLength,
      isAuthorized
    };

    await writeFile(fileFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }

  async getMetadata ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const fileDirectory = path.join(this.directory, id);
    const fileFileMetadata = path.join(fileDirectory, 'metadata.json');

    if (!await exists({ path: fileDirectory })) {
      throw new errors.FileNotFound('File not found.');
    }

    const rawMetadata = await readFile(fileFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    return {
      id,
      fileName: metadata.fileName,
      contentType: metadata.contentType,
      contentLength: metadata.contentLength,
      isAuthorized: metadata.isAuthorized
    };
  }

  async getFile ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const fileDirectory = path.join(this.directory, id);
    const fileFileData = path.join(fileDirectory, 'data');

    if (!await exists({ path: fileDirectory })) {
      throw new errors.FileNotFound('File not found.');
    }

    const stream = fs.createReadStream(fileFileData);

    return stream;
  }

  async removeFile ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const fileDirectory = path.join(this.directory, id);

    if (!await exists({ path: fileDirectory })) {
      throw new errors.FileNotFound('File not found.');
    }

    await shell.rm('-rf', fileDirectory);
  }

  async transferOwnership ({ id, to }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!to) {
      throw new Error('To is missing.');
    }

    const fileDirectory = path.join(this.directory, id);
    const fileFileMetadata = path.join(fileDirectory, 'metadata.json');

    if (!await exists({ path: fileDirectory })) {
      throw new errors.FileNotFound('File not found.');
    }

    const rawMetadata = await readFile(fileFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized.owner = to;

    await writeFile(fileFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }

  async authorize ({ id, isAuthorized }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!isAuthorized) {
      throw new Error('Is authorized is missing.');
    }

    const fileDirectory = path.join(this.directory, id);
    const fileFileMetadata = path.join(fileDirectory, 'metadata.json');

    if (!await exists({ path: fileDirectory })) {
      throw new errors.FileNotFound('File not found.');
    }

    const rawMetadata = await readFile(fileFileMetadata, { encoding: 'utf8' });
    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized = isAuthorized;

    await writeFile(fileFileMetadata, JSON.stringify(metadata), { encoding: 'utf8' });
  }
}

module.exports = FileSystem;
