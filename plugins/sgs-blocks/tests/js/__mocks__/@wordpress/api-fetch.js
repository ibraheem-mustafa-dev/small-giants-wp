'use strict';
// Mock for @wordpress/api-fetch — every request resolves empty.
const apiFetch = () => Promise.resolve( [] );
apiFetch.use = () => {};
apiFetch.createNonceMiddleware = () => () => {};
module.exports = apiFetch;
module.exports.default = apiFetch;
