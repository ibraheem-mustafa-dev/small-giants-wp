// Proves a marked calibration reading kept as its difference from its default (lib/calibrate.mjs::diffReads) gives
// slotFor and discoverEffects the same answer as the whole reading, while holding only what changed. A navigation
// instance draws its bar, mega panel and drawer (422 elements x 142 properties x 3 widths); kept whole, 1,264 of them
// outgrew the 8 GB heap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { diffReads, slotFor, discoverEffects, WIDTHS } from '../lib/calibrate.mjs';

const ITEM = '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(1)';
const LINK = `${ ITEM } > .sgs-nav-bar-menu__link`;
const PANEL = '@controls > .sgs-nav-drawer__body';
const props = ( over = {} ) => ( { color: 'rgb(0, 0, 0)', 'font-size': '16px', 'padding-top': '8px', 'transition-duration': '0.2s, 0.2s', 'grid-template-columns': 'none', ...over } );
// The type scale differs by width, as a real reading does, so each width is compared with its own default.
const reading = ( link, panel, extra = {} ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '': props( { 'font-size': `${ w / 25 }px` } ), [ ITEM ]: props(), [ LINK ]: props( link ), [ PANEL ]: props( panel ), ...extra } ] ) );

const def = reading( {}, {} );
// The marker changes the link's colour; the drawer's transition list is the same timing written in another order and a
// value differs only by whitespace (both count as unchanged for the slot finder); one element exists only when marked.
const mark = reading( { color: 'rgb(18, 52, 86)' }, { 'transition-duration': '0.2s,0.2s', 'grid-template-columns': 'none ' }, { [ `${ LINK } > .sgs-nav-bar-menu__badge` ]: props( { color: 'rgb(18, 52, 86)' } ) } );
const row = { attr_name: 'linkColour', css_property: 'color', css_element: 'link', tier_shape: null, css_state: null };
const marker = { label: 'colour', attrs: { linkColour: '#123456' }, expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, 'rgb(18, 52, 86)' ] ) ) };

test( 'MUST FAIL: a marked reading keeps only what differs from its default', () => {
	const d = diffReads( def, mark );
	for ( const w of WIDTHS ) {
		assert.deepEqual( Object.keys( d[ w ] ).sort(), [ LINK, `${ LINK } > .sgs-nav-bar-menu__badge`, PANEL ].sort() );
		assert.deepEqual( d[ w ][ LINK ], { color: 'rgb(18, 52, 86)' } );
		assert.equal( d[ w ][ '' ], undefined, 'an element equal to the default is not kept' );
	}
} );

test( 'MUST FAIL: the slot finder gives the same answer on the difference as on the whole reading', () => {
	assert.deepEqual( slotFor( row, marker, def, diffReads( def, mark ) ), slotFor( row, marker, def, mark ) );
	assert.equal( slotFor( row, marker, def, diffReads( def, mark ) ).slot, LINK );
} );

test( 'MUST FAIL: discovered effects are the same on the difference as on the whole reading', () => {
	assert.deepEqual( discoverEffects( def, diffReads( def, mark ) ), discoverEffects( def, mark ) );
} );

test( 'negative control: a marker that changes nothing stays dead on its difference', () => {
	const same = diffReads( def, reading( {}, {} ) );
	WIDTHS.forEach( ( w ) => assert.deepEqual( same[ w ], {} ) );
	assert.deepEqual( slotFor( row, marker, def, same ), { dead: true } );
} );

test( 'negative control: a width the marked reading lacks stays absent, and a missing default keeps every value', () => {
	assert.deepEqual( diffReads( def, { 1440: mark[ 1440 ] } ), { 1440: diffReads( def, mark )[ 1440 ] } );
	assert.deepEqual( diffReads( undefined, { 375: { '': { color: 'red' } } } ), { 375: { '': { color: 'red' } } } );
} );
