/**
 * Baseline file loading and finding keys.
 */

'use strict';

const fs = require( 'fs' );
const { BASELINE_FILE } = require( './lib-config' );

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
	return Array.isArray( data.accepted ) ? data.accepted : [];
}

function findingKey( f ) {
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

module.exports = {
	findingKey,
	loadBaseline,
};
