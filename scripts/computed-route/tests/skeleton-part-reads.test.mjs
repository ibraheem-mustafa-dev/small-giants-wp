// The draft elements a block draws as its own parts, whatever they paint (lib/skeleton-part-reads.mjs::hostParts and
// lib/skeleton-part-pairing.mjs::pairAbsorbed with `looks: null`): a button's icon that only sets a colour paints no box, so
// paint conservation never listed it and its part's settings (the icon colour) stayed unread; each declared part of a block
// is now paired with the absorbed element that is that part, and read at the part's calibrated slots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hostParts, hostKeyOf } from '../lib/skeleton-part-reads.mjs';
import { pairAbsorbed } from '../lib/skeleton-part-pairing.mjs';

const at = ( tag, width, extra = {} ) => ( { 1440: { _tag: tag, _position: 'static', width: `${ width }px`, 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', ...extra } } );
const el = ( key, tag, kids = [], extra = {} ) => ( { key, tag, kids, visible: { 1440: true }, box: { 1440: { w: extra.w ?? 100, h: extra.h ?? 40 } }, position: { 1440: 'static' }, words: extra.words ?? '', attrs: {} } );
const kids = ( e ) => e.kids;
const finder = ( e ) => ( { tpl: e.key } );

// A button block: its root link, an icon span holding a glyph, and a label. The icon's settings paint a colour and a size only.
const BUTTON = {
	elements: { '': at( 'a', 200 ), '.btn__icon': at( 'span', 20 ), '.btn__icon > svg': at( 'svg', 20 ), '.btn__label': at( 'span', 120 ) },
	settings: { iconColour: { slot: '.btn__icon', slots: [ '.btn__icon' ], property: 'color' }, iconBackground: { slot: '.btn__icon', slots: [ '.btn__icon' ], property: 'background-color' }, labelSize: { slot: '.btn__label', property: 'font-size' } },
	text: { label: { path: '.btn__label' } },
};
const draftButton = () => {
	const arrow = el( 'Root/3#0', 'span', [], { w: 20, words: '→' } );
	const words = el( 'Root/4#0', 'span', [], { w: 120, words: 'Apply now' } );
	return { arrow, words, host: el( 'Root/2#0', 'a', [ words, arrow ], { w: 200 } ) };
};

test( 'MUST FAIL: hostParts names the elements absorbed into a block node, through the row chain, and its drawn parts', () => {
	const rows = new Map( [
		[ 'H', { key: 'H', action: null, parts: [ 'svg1' ] } ],
		[ 'A', { key: 'A', action: 'absorbed', into: 'H' } ],
		[ 'B', { key: 'B', action: 'absorbed', into: 'A' } ],
		[ 'C', { key: 'C', action: 'remove', into: 'H' } ],
		[ 'D', { key: 'D', action: 'absorbed', into: 'Z' } ],
		[ 'E', { key: 'E', action: null, into: 'H' } ],
	] );
	const parts = hostParts( { rows, isNode: ( k ) => 'H' === k } );
	assert.deepEqual( [ ...( parts.get( 'H' ) ?? [] ) ].sort(), [ 'A', 'B', 'svg1' ] );
	assert.equal( parts.size, 1, 'a removed element, one with an unknown host and a kept row belong to no host' );
	assert.equal( hostKeyOf( rows.get( 'B' ), rows, ( k ) => 'H' === k ), 'H' );
	assert.equal( hostKeyOf( rows.get( 'D' ), rows, ( k ) => 'H' === k ), null );
} );

test( 'MUST FAIL: an absorbed icon that paints no box is the icon part and is read at its slot, whatever the part\'s settings paint', () => {
	const { arrow, host } = draftButton();
	const run = ( looks, calibration = BUTTON ) => pairAbsorbed( { host, absorbed: [ { element: arrow, looks } ], kids, calibration, finder } );
	assert.deepEqual( run( null ).slots, { '.btn__icon': { tpl: 'Root/3#0' } }, 'no look filter: the glyph pairs with the icon part' );
	assert.deepEqual( run( null ).paired.map( ( p ) => p.part ), [ '.btn__icon' ] );
	assert.deepEqual( run( [] ).slots, {}, 'positive control for the old path: with no look to match, an unpainted element reads nothing' );
} );

test( 'negative control: no declared part, a part with no settings, or a worded element that is not the part reads nothing', () => {
	const { arrow, words, host } = draftButton();
	const run = ( e, calibration ) => pairAbsorbed( { host, absorbed: [ { element: e, looks: null } ], kids, calibration, finder } );
	assert.deepEqual( run( arrow, { elements: {}, settings: {}, text: {} } ).slots, {}, 'a block with no measured part is unchanged' );
	assert.deepEqual( run( arrow, { ...BUTTON, settings: { labelSize: BUTTON.settings.labelSize } } ).slots, {}, 'the icon part has no setting to read, so no slot is given' );
	assert.deepEqual( run( words, BUTTON ).slots, { '.btn__label': { tpl: 'Root/4#0' } }, 'the label pairs with the label part, not the icon' );
	assert.equal( run( words, BUTTON ).slots[ '.btn__icon' ], undefined );
} );
