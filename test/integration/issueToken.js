'use strict';

const fs = require('fs'),
      path = require('path');

const Limes = require('limes');

const limes = new Limes({
  /* eslint-disable no-sync */
  identityProviders: [
    new Limes.IdentityProvider({
      issuer: 'https://auth.thenativeweb.io',
      privateKey: fs.readFileSync(path.join(__dirname, '..', 'shared', 'keys', 'privateKey.pem')),
      certificate: fs.readFileSync(path.join(__dirname, '..', 'shared', 'keys', 'certificate.pem'))
    })
  ]
  /* eslint-enable no-sync */
});

const issueToken = async function (subject, payload) {
  const token = await limes.issueToken({
    issuer: 'https://auth.thenativeweb.io',
    subject,
    payload
  });

  return token;
};

module.exports = issueToken;
