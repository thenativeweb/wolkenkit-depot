'use strict';

const fs = require('fs'),
      path = require('path'),
      { promisify } = require('util');

const pumpCallback = require('pump'),
      request = require('request');

const pump = promisify(pumpCallback);

const postAddBlob = async function (port, headers) {
  const file = fs.createReadStream(path.join(__dirname, '..', 'shared', 'data', 'wolkenkit.png'));

  const response = await new Promise(async (resolve, reject) => {
    const req = request({
      method: 'POST',
      uri: `http://localhost:${port}/api/v1/add-blob`,
      headers,
      json: true
    }, (err, res) => {
      if (err) {
        return reject(err);
      }

      resolve(res);
    });

    try {
      await pump(file, req);
    } catch (ex) {
      reject(ex);
    }
  });

  return response;
};

module.exports = postAddBlob;
