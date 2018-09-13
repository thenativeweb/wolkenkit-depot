'use strict';

const http = require('http'),
      { Readable } = require('stream');

const assert = require('assertthat'),
      freePort = require('freeport-promise'),
      requestPromise = require('request-promise-native'),
      uuid = require('uuidv4');

const getApi = require('../../lib/getApi'),
      postAddBlob = require('./postAddBlob');

const getTestsFor = function ({ provider, setupProvider, teardownProvider }) {
  suite('api', () => {
    let port;

    setup(async () => {
      await setupProvider();

      const api = getApi({ provider });

      port = await freePort();

      http.createServer(api).listen(port);
    });

    teardown(async () => {
      await teardownProvider();
    });

    suite('/api/v1/add-blob', () => {
      test('returns the status code 400 if the x-metadata header is not set.', async () => {
        const headers = {};

        const response = await postAddBlob(port, headers);

        assert.that(response.statusCode).is.equalTo(400);
      });

      test('returns the status code 400 if the x-metadata header is not json formatted.', async () => {
        const headers = {
          'x-metadata': 'not-json'
        };

        const response = await postAddBlob(port, headers);

        assert.that(response.statusCode).is.equalTo(400);
      });

      test('returns the status code 400 if the x-metadata header does not contain the file name.', async () => {
        const headers = {
          'x-metadata': JSON.stringify({})
        };

        const response = await postAddBlob(port, headers);

        assert.that(response.statusCode).is.equalTo(400);
      });

      test('returns an id.', async () => {
        const headers = { 'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' }) };

        const response = await postAddBlob(port, headers);

        assert.that(response.statusCode).is.equalTo(200);
        assert.that(response.body).is.ofType('object');
        assert.that(response.body.id).is.ofType('string');
      });
    });

    suite('/api/v1/blob/:id', () => {
      test('returns the status code 404 if the requested blob was not found.', async () => {
        const id = uuid();

        await assert.that(async () => {
          await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            resolveWithFullResponse: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 404);
      });

      test('returns a stream with x-metadata header and a default content type.', async () => {
        const fileName = 'wolkenkit.png';
        const contentType = 'application/octet-stream';

        const headers = { 'x-metadata': JSON.stringify({ fileName }) };
        const response = await postAddBlob(port, headers);

        const { id } = response.body;

        const res = await requestPromise({
          method: 'GET',
          uri: `http://localhost:${port}/api/v1/blob/${id}`,
          resolveWithFullResponse: true
        });

        assert.that(res.headers['content-type']).is.equalTo('application/octet-stream');
        assert.that(res.headers['x-metadata']).is.equalTo(JSON.stringify({ id, fileName, contentType }));
        assert.that(res.headers['content-disposition']).is.equalTo(`inline; filename=${fileName}`);

        assert.that(res).is.instanceOf(Readable);
      });

      test('returns a stream with x-metadata header and the given content type.', async () => {
        const fileName = 'wolkenkit.png';
        const contentType = 'image/png';

        const headers = { 'x-metadata': JSON.stringify({ fileName, contentType }) };
        const response = await postAddBlob(port, headers);

        const { id } = response.body;

        const res = await requestPromise({
          method: 'GET',
          uri: `http://localhost:${port}/api/v1/blob/${id}`,
          resolveWithFullResponse: true
        });

        assert.that(res.headers['content-type']).is.equalTo(contentType);
        assert.that(res.headers['x-metadata']).is.equalTo(JSON.stringify({ id, fileName, contentType }));
        assert.that(res.headers['content-disposition']).is.equalTo(`inline; filename=${fileName}`);

        assert.that(res).is.instanceOf(Readable);
      });
    });

    suite('/api/v1/remove-blob', () => {
      test('returns the status code 400 if the x-metadata header is not set.', async () => {
        const headers = {};

        await assert.that(async () => {
          await requestPromise({
            method: 'POST',
            uri: `http://localhost:${port}/api/v1/remove-blob`,
            headers,
            json: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 400);
      });

      test('returns the status code 400 if the x-metadata header is not json formatted.', async () => {
        const headers = {
          'x-metadata': 'not-json'
        };

        await assert.that(async () => {
          await requestPromise({
            method: 'POST',
            uri: `http://localhost:${port}/api/v1/remove-blob`,
            headers,
            json: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 400);
      });

      test('returns the status code 400 if the x-metadata header does not contain the id.', async () => {
        const headers = {
          'x-metadata': JSON.stringify({})
        };

        await assert.that(async () => {
          await requestPromise({
            method: 'POST',
            uri: `http://localhost:${port}/api/v1/remove-blob`,
            headers,
            json: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 400);
      });

      test('returns the status code 404 if the blob was not found.', async () => {
        const id = 'not-exists';
        const headers = {
          'x-metadata': JSON.stringify({ id })
        };

        await assert.that(async () => {
          await requestPromise({
            method: 'POST',
            uri: `http://localhost:${port}/api/v1/remove-blob`,
            headers,
            json: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 404);
      });

      test('returns the status code 200.', async () => {
        const headersAdd = {
          'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' })
        };
        const responseAdd = await postAddBlob(port, headersAdd);

        const { id } = responseAdd.body;
        const headersRemove = {
          'x-metadata': JSON.stringify({ id })
        };

        const responseRemove = await requestPromise({
          method: 'POST',
          uri: `http://localhost:${port}/api/v1/remove-blob`,
          headers: headersRemove,
          resolveWithFullResponse: true
        });

        assert.that(responseRemove.statusCode).is.equalTo(200);
      });

      test('actually removes the blob.', async () => {
        const headersAdd = {
          'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' })
        };
        const responseAdd = await postAddBlob(port, headersAdd);

        const { id } = responseAdd.body;
        const headersRemove = {
          'x-metadata': JSON.stringify({ id })
        };

        await requestPromise({
          method: 'POST',
          uri: `http://localhost:${port}/api/v1/remove-blob`,
          headers: headersRemove,
          resolveWithFullResponse: true
        });

        await assert.that(async () => {
          await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            resolveWithFullResponse: true
          });
        }).is.throwingAsync(ex => ex.statusCode === 404);
      });
    });
  });
};

module.exports = getTestsFor;
