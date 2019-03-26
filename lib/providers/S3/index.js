'use strict';

const Minio = require('minio'),
      toString = require('stream-to-string');

const errors = require('../../errors');

class S3 {
  async initialize ({ endpoint, port, useSsl, accessKey, secretKey, region, bucketName }) {
    const options = {
      endPoint: endpoint || 's3.amazonaws.com',
      accessKey,
      secretKey,
      region: region || 'eu-central-1a'
    };

    if (port) {
      options.port = port;
    }
    if (useSsl !== undefined) {
      options.useSSL = useSsl;
    }

    this.client = new Minio.Client(options);

    this.bucketName = bucketName;
    this.region = options.region;

    const existsBucket = await this.client.bucketExists(this.bucketName);

    if (!existsBucket) {
      throw new errors.BucketNotFound();
    }
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

    let statsData,
        statsMetadata;

    try {
      statsData = await this.client.statObject(this.bucketName, `${id}/data`);
      statsMetadata = await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code !== 'NotFound') {
        throw ex;
      }

      // Intentionally left blank.
    }

    if (statsData || statsMetadata) {
      throw new errors.FileAlreadyExists();
    }

    let contentLength = 0;

    stream.on('data', data => {
      contentLength += data.length;
    });

    await this.client.putObject(this.bucketName, `${id}/data`, stream);

    const metadata = {
      id,
      fileName,
      contentType,
      contentLength,
      isAuthorized
    };

    await this.client.putObject(this.bucketName, `${id}/metadata.json`, JSON.stringify(metadata));
  }

  async getMetadata ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    try {
      await this.client.statObject(this.bucketName, `${id}/data`);
      await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code === 'NotFound') {
        throw new errors.FileNotFound('File not found.');
      }

      throw ex;
    }

    const metadataStream = await this.client.getObject(this.bucketName, `${id}/metadata.json`);
    const rawMetadata = await toString(metadataStream);

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

    try {
      await this.client.statObject(this.bucketName, `${id}/data`);
      await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code === 'NotFound') {
        throw new errors.FileNotFound('File not found.');
      }

      throw ex;
    }

    const stream = await this.client.getObject(this.bucketName, `${id}/data`);

    return stream;
  }

  async removeFile ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    const files = [ `${id}/data`, `${id}/metadata.json` ];

    let notFoundErrors = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        await this.client.statObject(this.bucketName, file);
        await this.client.removeObject(this.bucketName, file);
      } catch (ex) {
        if (ex.code !== 'NotFound') {
          throw ex;
        }

        notFoundErrors += 1;
      }
    }

    if (notFoundErrors === files.length) {
      throw new errors.FileNotFound('File not found.');
    }
  }

  async transferOwnership ({ id, to }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!to) {
      throw new Error('To is missing.');
    }

    try {
      await this.client.statObject(this.bucketName, `${id}/data`);
      await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code === 'NotFound') {
        throw new errors.FileNotFound('File not found.');
      }

      throw ex;
    }

    const metadataStream = await this.client.getObject(this.bucketName, `${id}/metadata.json`);
    const rawMetadata = await toString(metadataStream);

    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized.owner = to;

    await this.client.putObject(this.bucketName, `${id}/metadata.json`, JSON.stringify(metadata));
  }

  async authorize ({ id, isAuthorized }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!isAuthorized) {
      throw new Error('Is authorized is missing.');
    }

    try {
      await this.client.statObject(this.bucketName, `${id}/data`);
      await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code === 'NotFound') {
        throw new errors.FileNotFound('File not found.');
      }

      throw ex;
    }

    const metadataStream = await this.client.getObject(this.bucketName, `${id}/metadata.json`);
    const rawMetadata = await toString(metadataStream);

    const metadata = JSON.parse(rawMetadata);

    metadata.isAuthorized = isAuthorized;

    await this.client.putObject(this.bucketName, `${id}/metadata.json`, JSON.stringify(metadata));
  }
}

module.exports = S3;
