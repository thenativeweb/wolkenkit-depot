'use strict';

const flaschenpost = require('flaschenpost');

const logger = flaschenpost.getLogger();

const prepareErrorHandling = function () {
  const fail = function (ex) {
    logger.fatal(ex.message || 'Unhandled error happened.', { ex });

    /* eslint-disable no-process-exit */
    process.exit(1);
    /* eslint-enable no-process-exit */
  };

  process.on('uncaughtException', fail);
  process.on('unhandledRejection', fail);
};

module.exports = prepareErrorHandling;
