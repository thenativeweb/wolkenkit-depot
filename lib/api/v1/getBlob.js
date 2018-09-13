'use strict';

const { promisify } = require('util');

const flaschenpost = require('flaschenpost'),
      pumpCallback = require('pump');

const pump = promisify(pumpCallback);

const logger = flaschenpost.getLogger();

const getBlob = function ({ provider }) {
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  return async function (req, res) {
    const { id } = req.params;

    try {
      const { fileName, contentType, stream } = await provider.getBlob({ id });

      res.set('content-type', contentType);
      res.set('content-disposition', `inline; filename=${fileName}`);
      res.set('x-metadata', JSON.stringify({ id, fileName, contentType }));

      await pump(stream, res);
    } catch (ex) {
      logger.error('Failed to get blob.', { id, err: ex });

      if (ex.code === 'EBLOBNOTFOUND') {
        return res.status(404).end();
      }

      res.status(500).end();
    }
  };
};

module.exports = getBlob;
