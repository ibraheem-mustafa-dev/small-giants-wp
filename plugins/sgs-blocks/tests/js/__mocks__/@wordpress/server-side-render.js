'use strict';
// Mock for @wordpress/server-side-render — the preview renders nothing in tests.
const ServerSideRender = () => null;
module.exports = ServerSideRender;
module.exports.default = ServerSideRender;
