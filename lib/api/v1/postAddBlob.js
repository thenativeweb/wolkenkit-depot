'use strict';

const flaschenpost = require('flaschenpost'),
      uuid = require('uuidv4');

const logger = flaschenpost.getLogger();

const postAddBlob = function ({ provider }) {
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  return async function (req, res) {
    let metadata;

    try {
      metadata = JSON.parse(req.headers['x-metadata']);
    } catch (ex) {
      return res.status(400).end();
    }

    const { fileName, contentType = 'application/octet-stream' } = metadata;

    if (!fileName) {
      return res.status(400).end();
    }

    try {
      const id = uuid();

      await provider.addBlob({ id, fileName, contentType, stream: req });

      res.json({ id });
    } catch (ex) {
      logger.error('Failed to add blob.', { err: ex });

      if (ex.code === 'EBLOBALREADYEXISTS') {
        return res.status(409).end();
      }

      res.status(500).end();
    }
  };
};

module.exports = postAddBlob;
