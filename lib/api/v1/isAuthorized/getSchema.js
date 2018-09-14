'use strict';

const getAuthorizationSchema = function () {
  const result = {
    type: 'object',
    properties: {
      owner: {
        type: [ 'integer', 'number', 'string' ]
      },
      commands: {
        type: 'object',
        properties: {
          removeBlob: {
            type: 'object',
            properties: {
              forAuthenticated: {
                type: 'boolean'
              },
              forPublic: {
                type: 'boolean'
              }
            },
            additionalProperties: false,
            required: [ 'forAuthenticated', 'forPublic' ]
          },
          transferOwnership: {
            type: 'object',
            properties: {
              forAuthenticated: {
                type: 'boolean'
              },
              forPublic: {
                type: 'boolean'
              }
            },
            additionalProperties: false,
            required: [ 'forAuthenticated', 'forPublic' ]
          },
          authorize: {
            type: 'object',
            properties: {
              forAuthenticated: {
                type: 'boolean'
              },
              forPublic: {
                type: 'boolean'
              }
            },
            additionalProperties: false,
            required: [ 'forAuthenticated', 'forPublic' ]
          }
        },
        additionalProperties: false,
        required: [ 'removeBlob', 'transferOwnership', 'authorize' ]
      },
      queries: {
        type: 'object',
        properties: {
          getBlob: {
            type: 'object',
            properties: {
              forAuthenticated: {
                type: 'boolean'
              },
              forPublic: {
                type: 'boolean'
              }
            },
            additionalProperties: false,
            required: [ 'forAuthenticated', 'forPublic' ]
          }
        },
        additionalProperties: false,
        required: [ 'getBlob' ]
      }
    },
    required: [ 'owner', 'commands', 'queries' ],
    additionalProperties: false
  };

  return result;
};

module.exports = getAuthorizationSchema;
