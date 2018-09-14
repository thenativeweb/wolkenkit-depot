'use strict';

const getDefaults = function () {
  const result = {
    commands: {
      removeBlob: {
        forAuthenticated: false,
        forPublic: false
      },
      transferOwnership: {
        forAuthenticated: false,
        forPublic: false
      },
      authorize: {
        forAuthenticated: false,
        forPublic: false
      }
    },
    queries: {
      getBlob: {
        forAuthenticated: false,
        forPublic: false
      }
    }
  };

  return result;
};

module.exports = getDefaults;
