require('core-js/features/array/flat');
require('core-js/features/object/from-entries');
const fetch = require('node-fetch');
const thwack = require('..');

thwack.addEventListener('request', ({ options }) => ({ ...options, fetch }));

module.exports = thwack;
