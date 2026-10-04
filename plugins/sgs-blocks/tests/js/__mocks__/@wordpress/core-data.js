'use strict';
// Mock for @wordpress/core-data — no entities exist in tests.
module.exports = {
	store: 'core',
	useEntityRecords: () => ( { records: [], hasResolved: true, isResolving: false } ),
	useEntityRecord: () => ( { record: null, hasResolved: true, isResolving: false } ),
	useEntityProp: () => [ undefined, () => {} ],
};
