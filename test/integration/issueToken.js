'use strict';

const fs = require('fs'),
      path = require('path');

const Limes = require('limes');

const limes = new Limes({
  /* eslint-disable no-sync */
  identityProviders: [
    {
      issuer: 'https://auth.thenativeweb.io',
      privateKey: fs.readFileSync(path.join(__dirname, '..', 'shared', 'keys', 'privateKey.pem')),
      certificate: fs.readFileSync(path.join(__dirname, '..', 'shared', 'keys', 'certificate.pem'))
    }
  ]
  /* eslint-enable no-sync */
});

const issueToken = function (subject, payload) {
  return limes.issueTokenFor({
    issuer: 'https://auth.thenativeweb.io',
    subject,
    payload
  });
};

module.exports = issueToken;
