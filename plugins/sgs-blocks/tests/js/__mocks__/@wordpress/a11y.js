'use strict';
// Mock for @wordpress/a11y — live-region announcements are no-ops in tests.
module.exports = {
	speak: () => {},
	setup: () => {},
};
