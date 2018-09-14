'use strict';

const flaschenpost = require('flaschenpost');

const { hasAccess } = require('./isAuthorized');

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
      return res.status(400).send('Header x-metadata is malformed.');
    }

    const { id } = metadata;

    if (!id) {
      return res.status(400).send('Id is missing.');
    }

    const { user } = req;

    try {
      const { isAuthorized } = await provider.getMetadata({ id });

      if (!hasAccess({ user, to: 'commands.removeBlob', authorizationOptions: isAuthorized })) {
        return res.status(401).end();
      }

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
