// An instance whose block renders nothing on a site (a business-details display type the site has no value for) is read
// as not rendered: it adds nothing to the default paint, is listed rather than counted dead, and cannot shrink the slot
// map. Synthetic readings, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTHS, renderedAt, isRendered, defaultElements, notRenderedSettings, noDefaultRendered } from '../lib/calibrate.mjs';
import { slotMapLosses, slotMapWriteDecision, keepUnmeasured } from '../lib/cache.mjs';
import { calibrationPageFailure } from '../lib/calibrate-read.mjs';
import { ANY_REF_SELECTOR, CAL_PREFIX } from '../lib/calibrate-props.mjs';

const drawn = ( color ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '': { 'background-color': color }, 'span': { 'background-color': color } } ] ) );
const absent = Object.fromEntries( WIDTHS.map( ( w ) => [ w, null ] ) );

// What calibrate.mjs does to each kept instance: the flag comes from the raw reading and its default's.
const kept = ( inst, read, defRead ) => ( { ...inst, read, rendered: isRendered( read, defRead ) } );

test( 'the instance wait matches any instance root, not the first', () => {
	assert.equal( ANY_REF_SELECTOR, `[class*="${ CAL_PREFIX }"]` );
	assert.ok( ! ANY_REF_SELECTOR.includes( `${ CAL_PREFIX }0` ) );
} );

test( 'MUST FAIL: three default variants where variant 0 never renders give a paint from variants 1 and 2', () => {
	const instances = [
		kept( { key: 'default-v0', isDefault: true, variant: 0 }, absent, absent ),
		kept( { key: 'default-v1', isDefault: true, variant: 1 }, drawn( 'red' ), drawn( 'red' ) ),
		kept( { key: 'default-v2', isDefault: true, variant: 2 }, drawn( 'blue' ), drawn( 'blue' ) ),
	];
	assert.deepEqual( instances.map( ( i ) => i.rendered ), [ false, true, true ] );
	const elements = defaultElements( instances );
	assert.deepEqual( Object.keys( elements ).sort(), [ '', 'span' ] );
	assert.equal( elements[ '' ][ 375 ][ 'background-color' ], 'red', 'the first rendered variant keeps a shared path' );
	assert.equal( noDefaultRendered( instances ), false );
} );

test( 'MUST FAIL: a setting whose only instance never rendered is listed as not rendered, not dead', () => {
	const def = drawn( 'red' );
	const instances = [
		kept( { key: 'default-v0', isDefault: true, variant: 0 }, absent, absent ),
		kept( { key: 'default-v1', isDefault: true, variant: 1 }, def, def ),
		kept( { key: 'phone-colour-v0', row: { attr_name: 'phoneColour' }, variant: 0 }, absent, absent ),
		kept( { key: 'copyright-colour-v1', row: { attr_name: 'copyrightColour' }, variant: 1 }, drawn( 'green' ), def ),
		kept( { key: 'both-a-v0', row: { attr_name: 'both' }, variant: 0 }, absent, absent ),
		kept( { key: 'both-b-v1', row: { attr_name: 'both' }, variant: 1 }, drawn( 'green' ), def ),
		kept( { key: 'discover-v0', discover: { attr: 'layout', value: 'a' }, variant: 0 }, absent, absent ),
		kept( { key: 'text-v0', content: true, row: { attr_name: 'label' }, variant: 0 }, absent, absent ),
	];
	assert.deepEqual( notRenderedSettings( instances ), [
		{ setting: 'phoneColour', reason: 'its instance rendered nothing on this site' },
		{ setting: 'layout', reason: 'its instance rendered nothing on this site' },
	] );
	assert.equal( renderedAt( absent ), false );
} );

test( 'a marked instance whose default never rendered counts as not rendered', () => {
	const marked = kept( { key: 'x', row: { attr_name: 'x' } }, drawn( 'green' ), absent );
	assert.equal( marked.rendered, false );
} );

test( 'MUST FAIL: the loss guard does not refuse or drop a setting that was not rendered', () => {
	const prev = { settings: { phoneColour: { slot: '' }, kept: { slot: 'span' } }, discovered: { layout: { color: {} } } };
	const next = { settings: { kept: { slot: 'span' } }, discovered: {} };
	assert.equal( slotMapWriteDecision( prev, next, [], null ).write, false, 'control: without the list the drop is refused' );
	const decision = slotMapWriteDecision( prev, next, [], null, [ 'phoneColour', 'layout' ] );
	assert.deepEqual( decision, { write: true, lost: [] } );
	assert.deepEqual( slotMapLosses( prev, next, [], null, [ 'phoneColour' ] ), [ 'discovered:layout' ] );
	const written = keepUnmeasured( prev, next, [ 'phoneColour', 'layout' ] );
	assert.deepEqual( written.settings, prev.settings );
	assert.deepEqual( written.discovered, prev.discovered );
	assert.equal( keepUnmeasured( null, next, [ 'phoneColour' ] ), next, 'a first write has nothing to keep' );
	const fresh = { settings: { phoneColour: { slot: 'new' }, kept: {} }, discovered: {} };
	assert.equal( keepUnmeasured( prev, fresh, [ 'phoneColour' ] ).settings.phoneColour.slot, 'new', 'a measured entry is never overwritten' );
} );

test( 'MUST FAIL: all default instances absent stays an error', () => {
	const instances = [
		kept( { key: 'default-v0', isDefault: true }, absent, absent ),
		kept( { key: 'default-v1', isDefault: true }, absent, absent ),
		kept( { key: 'marker', row: { attr_name: 'x' } }, drawn( 'green' ), drawn( 'red' ) ),
	];
	assert.equal( noDefaultRendered( instances ), true );
	assert.deepEqual( defaultElements( instances ), {} );
	assert.equal( noDefaultRendered( [ { key: 'marker' } ] ), false, 'no default instance planned is not this error' );
} );

test( 'a page with no rendered instance keeps its HTTP, wrapper and no-wrapper messages', () => {
	assert.match( calibrationPageFailure( { wrappers: 0, status: 500, width: 375 } ), /returned HTTP 500/ );
	assert.match( calibrationPageFailure( { wrappers: 5, status: 200, width: 768 } ), /rendered nothing inside its 5 calibration wrapper\(s\) at 768px/ );
	assert.match( calibrationPageFailure( { wrappers: 0, status: 200, width: 1440 } ), /holds none of the calibration wrappers/ );
} );
