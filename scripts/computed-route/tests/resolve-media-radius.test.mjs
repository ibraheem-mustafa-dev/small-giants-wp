// A radius setting the media atoms generate (`_generated: "media-atoms"` in block.json: the hero's splitRadius, the media block's
// radius) is read per device as a corner object: plugins/sgs-blocks/includes/media/atoms/shape.php::sgs_media_atom_shape_emit
// takes `sgs_media_own( ..., 'Radius', device )` and prints a corner only for a key of that array, so a plain length per device
// (`{ desktop: '22px' }`) prints no rule. lib/resolve.mjs::radiusWrite writes it as corners per device. A radius with no media
// contract and no box family (the burger's, which holds one length per device) keeps its plain length.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve, blockSchema } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const cal = ( settings ) => ( { settings } );
const SLOT = '.sgs-hero__media > .sgs-media-el';
const CORNERS = ( v ) => ( { topLeft: v, topRight: v, bottomRight: v, bottomLeft: v } );

test( 'MUST FAIL: the hero\'s split radius is written as corners per device, not a length per device', () => {
	assert.equal( blockSchema( 'sgs/hero' ).splitRadius._generated, 'media-atoms', 'the block names the contract that reads the value' );
	const r = resolve( { block: 'sgs/hero', slot: SLOT, prop: 'border-radius', perWidth: { 1440: '22px' } },
		{ db, snapshot, calibration: cal( { splitRadius: { slot: SLOT, slots: [ SLOT ], property: 'border-radius', forms: [] } } ) } );
	assert.deepEqual( r.writes, [ { attr: 'splitRadius', value: { desktop: CORNERS( '22px' ) }, merge: 'deep' } ], JSON.stringify( r ) );
} );

test( 'the media block\'s radius takes the same shape, per device', () => {
	const r = resolve( { block: 'sgs/media', slot: '.sgs-media-el', prop: 'border-radius', perWidth: { 375: '4px', 1440: '8px' } },
		{ db, snapshot, calibration: cal( { radius: { slot: '.sgs-media-el', slots: [ '.sgs-media-el' ], property: 'border-radius', forms: [] } } ) } );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { mobile: CORNERS( '4px' ), desktop: CORNERS( '8px' ) }, JSON.stringify( r ) );
} );

test( 'negative control: a per-device radius no media atom reads keeps its plain length', () => {
	assert.equal( blockSchema( 'sgs/nav-bar-menu' ).burgerBorderRadius._generated, undefined );
	const r = resolve( { block: 'sgs/nav-bar-menu', slot: '.sgs-nav-bar-menu__burger', prop: 'border-radius', perWidth: { 1440: '12px' } },
		{ db, snapshot, calibration: cal( { burgerBorderRadius: { slot: '.sgs-nav-bar-menu__burger', slots: [ '.sgs-nav-bar-menu__burger' ], property: 'border-radius', forms: [] } } ) } );
	assert.deepEqual( r.writes?.[ 0 ]?.value, { desktop: '12px' }, JSON.stringify( r ) );
} );
