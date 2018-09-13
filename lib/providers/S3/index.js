'use strict';

const Minio = require('minio'),
      toString = require('stream-to-string');

const errors = require('../../errors');

class S3 {
  async initialize ({ endpoint, port, useSSL, accessKey, secretKey, region, bucketName }) {
    const options = {
      endPoint: endpoint || 's3.amazonaws.com',
      accessKey,
      secretKey,
      region: region || 'eu-central-1a'
    };

    if (port) {
      options.port = port;
    }
    if (useSSL !== undefined) {
      options.useSSL = useSSL;
    }

    this.client = new Minio.Client(options);

    this.bucketName = bucketName;
    this.region = options.region;

    try {
      await this.client.makeBucket(this.bucketName, this.region);
    } catch (ex) {
      if (ex.code !== 'BucketAlreadyOwnedByYou') {
        throw ex;
      }
    }
  }

  async addBlob ({ id, fileName, contentType, stream }) {
    if (!id) {
      throw new Error('Id is missing.');
    }
    if (!fileName) {
      throw new Error('File name is missing.');
    }
    if (!contentType) {
      throw new Error('Content type is missing.');
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
      throw new errors.BlobAlreadyExists();
    }

    const metadata = {
      id,
      fileName,
      contentType
    };

    await this.client.putObject(this.bucketName, `${id}/data`, stream);
    await this.client.putObject(this.bucketName, `${id}/metadata.json`, JSON.stringify(metadata));
  }

  async getBlob ({ id }) {
    if (!id) {
      throw new Error('Id is missing.');
    }

    try {
      await this.client.statObject(this.bucketName, `${id}/data`);
      await this.client.statObject(this.bucketName, `${id}/metadata.json`);
    } catch (ex) {
      if (ex.code === 'NotFound') {
        throw new errors.BlobNotFound('Blob not found.');
      }

      throw ex;
    }

    const stream = await this.client.getObject(this.bucketName, `${id}/data`);
    const metadataStream = await this.client.getObject(this.bucketName, `${id}/metadata.json`);

    const rawMetadata = await toString(metadataStream);
    const metadata = JSON.parse(rawMetadata);

    return {
      id,
      fileName: metadata.fileName,
      contentType: metadata.contentType,
      stream
    };
  }

  async removeBlob ({ id }) {
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
      throw new errors.BlobNotFound('Blob not found.');
    }
  }
}

module.exports = S3;
