'use strict';

const flaschenpost = require('flaschenpost'),
      merge = require('lodash/merge'),
      uuid = require('uuidv4');

const { hasAccess, getDefaults, isValid } = require('./isAuthorized');

const logger = flaschenpost.getLogger();

const postAddBlob = function ({ addBlobAuthorizationOptions, provider }) {
  if (!addBlobAuthorizationOptions) {
    throw new Error('Add blob authorization options are missing.');
  }
  if (!provider) {
    throw new Error('Provider is missing.');
  }

  const authorizationOptions = {
    commands: {
      addBlob: addBlobAuthorizationOptions
    }
  };

  return async function (req, res) {
    const { user } = req;

    if (!hasAccess({ user, to: 'commands.addBlob', authorizationOptions, isConstructor: true })) {
      return res.status(401).end();
    }

    let metadata;

    try {
      metadata = JSON.parse(req.headers['x-metadata']);
    } catch (ex) {
      return res.status(400).send('Header x-metadata is malformed.');
    }

    const {
      fileName,
      contentType = 'application/octet-stream'
    } = metadata;

    if (!fileName) {
      return res.status(400).send('File name is missing.');
    }

    const isAuthorized = merge({}, getDefaults(), metadata.isAuthorized || {});

    isAuthorized.owner = req.user.sub;

    if (!isValid(isAuthorized)) {
      return res.status(400).send('Is authorized is malformed.');
    }

    try {
      const id = uuid();

      await provider.addBlob({ id, fileName, contentType, isAuthorized, stream: req });

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
