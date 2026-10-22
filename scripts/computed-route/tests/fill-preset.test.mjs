// FR-48-51: a draft button whose base and hover looks equal one buttonPresets variant is written as that variant and none of the
// per-instance values; a button that matches nothing, or only part of a variant, and any block that is not a preset button
// stay as the resolver wrote them. Run against the real framework DB (the blocks that hold a preset setting are found by query).
import test from 'node:test';
import assert from 'node:assert/strict';
import { presetWrites, matchPreset, presetBlocks } from '../lib/fill-preset.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const PRESETS = {
	primary: { background: '#0a7ea8', text: '#ffffff', border: '#ffffff', 'border-width': '0px', 'border-radius': '999px', padding: '12px 18px 12px 18px', 'font-size': '15px', 'font-weight': '600', 'min-height': '48px', 'hover-background': '#2c3e50', 'hover-text': '#d8ca50', 'hover-border': '#d8ca50' },
	secondary: { background: '#0a7ea8', text: '#ffffff', border: '#0a7ea8', 'border-width': '2px', 'border-radius': '999px', padding: '12px 22px 12px 22px', 'font-size': '17px', 'font-weight': '600', 'min-height': '48px', 'hover-background': 'var(--wp--preset--color--primary)', 'hover-text': '#ffffff', 'hover-border': 'var(--wp--preset--color--primary)', 'hover-transform': 'matrix(1.05, 0, 0, 1.05, 0, -2.1)' },
};
const rawSnapshot = { settings: { custom: { buttonPresets: PRESETS } } };
const snapshot = { palette: [ { slug: 'primary', colour: parseColour( '#0a7ea8' ) } ], spacing: [], fontSizes: [] };
const BLUE = 'rgb(10, 126, 168)';
const WHITE = 'rgb(255, 255, 255)';
const SECONDARY = { 'background-color': BLUE, color: WHITE, 'border-top-color': BLUE, 'border-top-width': '2px', 'border-top-left-radius': '999px', 'padding-top': '12px', 'padding-right': '22px', 'padding-bottom': '12px', 'padding-left': '22px', 'font-size': '17px', 'font-weight': '600', 'min-height': '48px' };
const HOVER = { rendered: { 'background-color': BLUE, color: WHITE, 'border-top-color': BLUE, transform: 'matrix(1.05, 0, 0, 1.05, 0, -2.1)' } };
const readsOf = ( styles = SECONDARY, hover = HOVER ) => ( {
	widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles } } ] ) ),
	states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { '0:': hover ? [ { states: [ 'hover' ], declared: {}, ...hover } ] : [] } } ] ) ),
} );
const w = ( prop, attr, before = null ) => ( { node: 'r0', slot: '', prop, attr, before, after: 'x', widths: [ 1440 ] } );
const WRITES = () => [ w( 'background-color', 'colourBackground' ), w( 'padding-top', 'padding' ), w( 'font-size', 'fontSize', '15px' ), w( 'text-align', 'textAlign' ), { ...w( 'color', 'colourTextHover' ), state: 'hover' } ];
function run( { block = 'sgs/button', reads = readsOf(), presets = PRESETS } = {} ) {
	const flat = [ { name: block, attributes: { colourBackground: 'x', padding: { top: '12px' }, fontSize: 'x', textAlign: 'center', colourTextHover: 'x' }, ref: 'r0' } ];
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '' } ] } ];
	const res = presetWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: presets } } }, snapshot, writes: WRITES(), db } );
	return { flat, ...res };
}

test( 'the blocks that hold a preset variant are found in the framework DB, and a heading is not one', () => {
	const blocks = presetBlocks( db, [ 'primary', 'secondary', 'outline' ] );
	assert.equal( blocks[ 'sgs/button' ], 'inheritStyle' );
	assert.equal( blocks[ 'sgs/heading' ], undefined );
} );

test( 'MUST FAIL WITHOUT THE MATCH: a button whose base and hover looks equal the secondary preset is written as that variant alone', () => {
	const r = run();
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, 'secondary' );
	assert.deepEqual( r.writes.map( ( x ) => x.attr ).sort(), [ 'inheritStyle', 'textAlign' ], 'the colour, padding, size and hover values are not written; an unrelated value stays' );
	assert.deepEqual( Object.keys( r.flat[ 0 ].attributes ).sort(), [ 'fontSize', 'inheritStyle', 'textAlign' ] );
	assert.equal( r.flat[ 0 ].attributes.colourBackground, undefined );
	assert.equal( r.flat[ 0 ].attributes.padding, undefined );
	assert.equal( r.flat[ 0 ].attributes.fontSize, '15px', 'a value Fill replaced goes back to what the skeleton held' );
	assert.match( r.notes[ 0 ], /equal the secondary preset/ );
} );

test( 'a button that matches no variant, or only part of one, keeps its per-instance values', () => {
	const bigger = run( { reads: readsOf( { ...SECONDARY, 'font-size': '19px' } ) } );
	assert.equal( bigger.flat[ 0 ].attributes.inheritStyle, undefined );
	assert.equal( bigger.writes.length, 5 );
	const noHoverLift = run( { reads: readsOf( SECONDARY, { rendered: { ...HOVER.rendered, transform: 'none' } } ) } );
	assert.equal( noHoverLift.flat[ 0 ].attributes.inheritStyle, undefined, 'a hover value that differs is no match' );
	const noHover = run( { reads: readsOf( SECONDARY, null ) } );
	assert.equal( noHover.flat[ 0 ].attributes.inheritStyle, undefined, 'no hover look is the base value, which is not the preset hover' );
	const missing = run( { reads: readsOf( { ...SECONDARY, 'min-height': undefined } ) } );
	assert.equal( missing.flat[ 0 ].attributes.inheritStyle, undefined, 'a value the read did not return fails closed' );
} );

test( 'a block that is not a preset button is never given a variant, whatever it looks like', () => {
	const r = run( { block: 'sgs/heading' } );
	assert.equal( r.flat[ 0 ].attributes.inheritStyle, undefined );
	assert.equal( r.writes.length, 5 );
	assert.equal( run( { presets: {} } ).writes.length, 5, 'a theme with no presets writes none' );
} );

test( 'matchPreset: the first variant all of whose values equal the draft; a var() colour is the palette colour', () => {
	assert.deepEqual( matchPreset( { presets: PRESETS, reads: readsOf(), id: '0:', snapshot } ).variant, 'secondary' );
	assert.equal( matchPreset( { presets: PRESETS, reads: readsOf(), id: '0:', snapshot: { palette: [] } } ), null, 'an unknown palette slug fails closed' );
	assert.equal( matchPreset( { presets: PRESETS, reads: readsOf(), id: 'other', snapshot } ), null );
} );
