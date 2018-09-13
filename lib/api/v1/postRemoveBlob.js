'use strict';

const flaschenpost = require('flaschenpost');

const logger = flaschenpost.getLogger();

const postRemoveBlob = function ({ provider }) {
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

    const { id } = metadata;

    if (!id) {
      return res.status(400).end();
    }

    try {
      await provider.removeBlob({ id });

      res.status(200).end();
    } catch (ex) {
      logger.error('Failed to remove blob.', { id, err: ex });

      if (ex.code === 'EBLOBNOTFOUND') {
        return res.status(404).end();
      }

      res.status(500).end();
    }
  };
};

module.exports = postRemoveBlob;
