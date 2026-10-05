/**
 * Assertion helper for the self-test fixtures.
 */

'use strict';

function assertTrue( cond, msg, failures ) {
	if ( ! cond ) {
		failures.push( msg );
	}
}

module.exports = {
	assertTrue,
};
