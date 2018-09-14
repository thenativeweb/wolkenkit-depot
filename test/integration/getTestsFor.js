'use strict';

const fs = require('fs'),
      http = require('http'),
      path = require('path'),
      { promisify } = require('util'),
      { Readable } = require('stream');

const assert = require('assertthat'),
      freePort = require('freeport-promise'),
      nodeenv = require('nodeenv'),
      requestPromise = require('request-promise-native'),
      uuid = require('uuidv4');

const getApi = require('../../lib/getApi'),
      issueToken = require('./issueToken'),
      postAddBlob = require('./postAddBlob');

const readFile = promisify(fs.readFile);

const getTestsFor = function ({ provider, setupProvider, teardownProvider }) {
  suite('api', () => {
    let restore;

    suiteSetup(() => {
      // Disable SSL certificate checks to allow running these tests with a
      // self-signed certificate.
      restore = nodeenv({
        NODE_TLS_REJECT_UNAUTHORIZED: '0'
      });
    });

    suiteTeardown(() => {
      restore();
    });

    let port;

    const startServer = async function ({ addBlobAuthorizationOptions }) {
      await setupProvider();

      const identityProviderCertificate = await readFile(path.join(__dirname, '..', 'shared', 'keys', 'certificate.pem'));

      const api = getApi({
        addBlobAuthorizationOptions,
        identityProvider: {
          name: 'auth.wolkenkit.io',
          certificate: identityProviderCertificate
        },
        provider
      });

      port = await freePort();

      await new Promise(resolve => {
        http.createServer(api).listen(port, resolve);
      });
    };

    setup(async () => {
      await startServer({
        addBlobAuthorizationOptions: {
          forAuthenticated: true,
          forPublic: true
        }
      });
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

      test('returns the status code 400 if the x-metadata header contains malformed isAuthorized.', async () => {
        const isAuthorized = {
          foo: 'bar'
        };
        const headers = {
          'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png', isAuthorized })
        };

        const response = await postAddBlob(port, headers);

        assert.that(response.statusCode).is.equalTo(400);
      });

      test('returns an id if the x-metadata header contains valid isAuthorized.', async () => {
        const isAuthorized = {
          commands: {
            removeBlob: {
              forAuthenticated: true,
              forPublic: false
            },
            transferOwnership: {
              forAuthenticated: false,
              forPublic: false
            },
            authorize: {
              forAuthenticated: false,
              forPublic: false
            }
          },
          queries: {
            getBlob: {
              forAuthenticated: true,
              forPublic: true
            }
          }
        };
        const headers = {
          'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png', isAuthorized })
        };

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

        const metadata = JSON.parse(res.headers['x-metadata']);

        assert.that(res.headers['content-type']).is.equalTo('application/octet-stream');
        assert.that(res.headers['content-disposition']).is.equalTo(`inline; filename=${fileName}`);

        assert.that(metadata.id).is.equalTo(id);
        assert.that(metadata.fileName).is.equalTo(fileName);
        assert.that(metadata.contentType).is.equalTo(contentType);

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

        const metadata = JSON.parse(res.headers['x-metadata']);

        assert.that(res.headers['content-type']).is.equalTo(contentType);
        assert.that(res.headers['content-disposition']).is.equalTo(`inline; filename=${fileName}`);

        assert.that(metadata.id).is.equalTo(id);
        assert.that(metadata.fileName).is.equalTo(fileName);
        assert.that(metadata.contentType).is.equalTo(contentType);

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

    suite('authorization', () => {
      const tokenOwner = issueToken('Jane Doe');

      suite('adding blobs', () => {
        suite('when access is limited to authenticated users', () => {
          setup(async () => {
            await startServer({
              addBlobAuthorizationOptions: {
                forAuthenticated: true,
                forPublic: false
              }
            });
          });

          test('grants access to authenticated users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' }),
              authorization: `Bearer ${tokenOwner}`
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(200);
          });

          test('denies access to public users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' })
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(401);
          });
        });

        suite('when access is limited to authenticated and public users', () => {
          setup(async () => {
            await startServer({
              addBlobAuthorizationOptions: {
                forAuthenticated: true,
                forPublic: true
              }
            });
          });

          test('grants access to authenticated users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' }),
              authorization: `Bearer ${tokenOwner}`
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(200);
          });

          test('grants access to public users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' })
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(200);
          });
        });

        suite('when access is forbidden', () => {
          setup(async () => {
            await startServer({
              addBlobAuthorizationOptions: {
                forAuthenticated: false,
                forPublic: false
              }
            });
          });

          test('denies access to authenticated users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' }),
              authorization: `Bearer ${tokenOwner}`
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(401);
          });

          test('denies access to public users.', async () => {
            const headers = {
              'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' })
            };

            const response = await postAddBlob(port, headers);

            assert.that(response.statusCode).is.equalTo(401);
          });
        });
      });

      suite('when access is limited to owner', () => {
        let id;

        setup(async () => {
          const isAuthorized = {
            queries: {
              getBlob: { forAuthenticated: false, forPublic: false }
            }
          };
          const headersAdd = {
            'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png', isAuthorized }),
            authorization: `Bearer ${tokenOwner}`
          };
          const responseAdd = await postAddBlob(port, headersAdd);

          id = responseAdd.body.id;
        });

        test('grants access to the owner.', async () => {
          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOwner}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('denies access to authenticated users.', async () => {
          const tokenOther = issueToken('John Doe');

          await assert.that(async () => {
            await requestPromise({
              method: 'GET',
              uri: `http://localhost:${port}/api/v1/blob/${id}`,
              headers: {
                authorization: `Bearer ${tokenOther}`
              },
              resolveWithFullResponse: true
            });
          }).is.throwingAsync(ex => ex.statusCode === 401);
        });

        test('denies access to public users.', async () => {
          await assert.that(async () => {
            await requestPromise({
              method: 'GET',
              uri: `http://localhost:${port}/api/v1/blob/${id}`,
              resolveWithFullResponse: true
            });
          }).is.throwingAsync(ex => ex.statusCode === 401);
        });
      });

      suite('when access is limited to authenticated users', () => {
        let id;

        setup(async () => {
          const isAuthorized = {
            queries: {
              getBlob: { forAuthenticated: true, forPublic: false }
            }
          };
          const headersAdd = {
            'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png', isAuthorized }),
            authorization: `Bearer ${tokenOwner}`
          };
          const responseAdd = await postAddBlob(port, headersAdd);

          id = responseAdd.body.id;
        });

        test('grants access to the owner.', async () => {
          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOwner}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('grants access to authenticated users.', async () => {
          const tokenOther = issueToken('John Doe');

          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOther}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('denies access to public users.', async () => {
          await assert.that(async () => {
            await requestPromise({
              method: 'GET',
              uri: `http://localhost:${port}/api/v1/blob/${id}`,
              resolveWithFullResponse: true
            });
          }).is.throwingAsync(ex => ex.statusCode === 401);
        });
      });

      suite('when access is limited to authenticated and public users', () => {
        let id;

        setup(async () => {
          const isAuthorized = {
            queries: {
              getBlob: { forAuthenticated: true, forPublic: true }
            }
          };
          const headersAdd = {
            'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png', isAuthorized }),
            authorization: `Bearer ${tokenOwner}`
          };
          const responseAdd = await postAddBlob(port, headersAdd);

          id = responseAdd.body.id;
        });

        test('grants access to the owner.', async () => {
          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOwner}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('grants access to authenticated users.', async () => {
          const tokenOther = issueToken('John Doe');

          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOther}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('grants access to public users.', async () => {
          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });
      });

      suite('when access is set to defaults', () => {
        let id;

        setup(async () => {
          const headersAdd = {
            'x-metadata': JSON.stringify({ fileName: 'wolkenkit.png' }),
            authorization: `Bearer ${tokenOwner}`
          };
          const responseAdd = await postAddBlob(port, headersAdd);

          id = responseAdd.body.id;
        });

        test('grants access to the owner.', async () => {
          const responseGet = await requestPromise({
            method: 'GET',
            uri: `http://localhost:${port}/api/v1/blob/${id}`,
            headers: {
              authorization: `Bearer ${tokenOwner}`
            },
            resolveWithFullResponse: true
          });

          assert.that(responseGet.statusCode).is.equalTo(200);
        });

        test('denies access to authenticated users.', async () => {
          const tokenOther = issueToken('John Doe');

          await assert.that(async () => {
            await requestPromise({
              method: 'GET',
              uri: `http://localhost:${port}/api/v1/blob/${id}`,
              headers: {
                authorization: `Bearer ${tokenOther}`
              },
              resolveWithFullResponse: true
            });
          }).is.throwingAsync(ex => ex.statusCode === 401);
        });

        test('denies access to public users.', async () => {
          await assert.that(async () => {
            await requestPromise({
              method: 'GET',
              uri: `http://localhost:${port}/api/v1/blob/${id}`,
              resolveWithFullResponse: true
            });
          }).is.throwingAsync(ex => ex.statusCode === 401);
        });
      });
    });
  });
};

module.exports = getTestsFor;
