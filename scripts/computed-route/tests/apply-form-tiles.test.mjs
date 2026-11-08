// Tile and form families: the selected look through the tile's own settings, the tick, the hover border on the form, multiSelect and
// the floated label size. Run: node --test tests/apply-form-tiles.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCalibration } from '../lib/cache.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { tiles } from '../lib/apply-family-tiles.mjs';
import { floatedLabel } from '../lib/apply-family-form.mjs';
import { colourValue, partItems } from '../lib/apply-probe-items.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const snapshot = loadSnapshot( path.join( HERE, '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const calFor = ( block ) => loadCalibration( path.join( HERE, '..', 'cache' ), block, 'local-indus' );
const at = ( f ) => ( { 1440: f } );

const tile = ( bg, border, color ) => ( { 'background-color': bg, 'border-top-color': border, 'border-top-width': '2px', 'box-shadow': 'none', color, transform: 'none', translate: 'none', scale: 'none', rotate: 'none' } );
const read = ( { selectedBg, check, hoverBorder, multi = false } ) => ( {
	rest: { tile: tile( 'rgb(247, 249, 250)', 'rgba(0, 0, 0, 0)', 'rgb(44, 62, 80)' ), tplId: '49', dc: 'Page' },
	hover: { tile: tile( 'rgb(247, 249, 250)', hoverBorder, 'rgb(44, 62, 80)' ) },
	selected: { tile: tile( selectedBg, selectedBg, 'rgb(255, 255, 255)' ), check },
	multi,
} );
const tick = { position: 'static', display: 'flex', top: 'auto', width: '14px', color: 'rgb(255, 255, 255)', 'background-color': 'rgba(0, 0, 0, 0)' };
const hidden = { ...tick, position: 'absolute', display: 'none' };
const form = { block: 'sgs/form', attrs: {} };
const ctx = ( d, l, saved = {} ) => ( { target: { ref: 'cr-ref-x-1', tpl: 'Root/9#0' }, block: 'sgs/form-field-tiles', saved, recordsIndex: new Map(), calFor, db, snapshot, all: { blocks: { 'cr-ref-x-0': form } }, draft: at( { probes: d } ), live: at( { probes: l } ) } );
const writes = ( items ) => items.filter( ( i ) => 'op' === i.status ).flatMap( ( i ) => i.writes.map( ( w ) => [ w.attr, w.value ] ) );

test( 'tiles: the selected ground, border and label colour are written to the tile\'s own settings, never the wrapper\'s', () => {
	const d = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	const l = read( { selectedBg: 'rgb(231, 215, 104)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	l.selected.tile.color = 'rgb(44, 62, 80)';
	const w = writes( tiles.decide( ctx( d, l ) ) );
	const attrs = w.map( ( x ) => x[ 0 ] );
	assert.ok( attrs.includes( 'tileSelectedBackgroundColour' ), attrs.join() );
	assert.ok( attrs.includes( 'tileSelectedBorderColour' ), attrs.join() );
	assert.ok( attrs.includes( 'tileSelectedLabelColour' ), attrs.join() );
	assert.ok( ! attrs.some( ( n ) => [ 'backgroundColour', 'borderColour', 'textColour' ].includes( n ) ), attrs.join() );
	// Negative control: identical reads write nothing.
	assert.deepEqual( writes( tiles.decide( ctx( d, d ) ) ), [] );
} );

test( 'tiles: a tick the draft shows in line, over a live tick that is hidden, writes selectedCheckPosition; a shown tick writes none', () => {
	const d = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	const l = read( { selectedBg: 'rgb(10, 126, 168)', check: hidden, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	assert.deepEqual( writes( tiles.decide( ctx( d, l ) ) ), [ [ 'selectedCheckPosition', 'inline-start' ] ] );
	assert.deepEqual( writes( tiles.decide( ctx( d, d ) ) ), [] );
	// Negative control: a draft with no tick writes no position.
	assert.deepEqual( writes( tiles.decide( ctx( { ...d, selected: { ...d.selected, check: null } }, l ) ) ), [] );
} );

test( 'tiles: a hover border differing from the draft is written to the form\'s tile hover border; a transparent one stays transparent', () => {
	const d = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	const l = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgb(10, 126, 168)' } );
	const items = tiles.decide( ctx( d, l ) ).filter( ( i ) => 'op' === i.status && 'sgs/form' === i.block );
	assert.equal( items.length, 1 );
	assert.equal( items[ 0 ].ref, 'cr-ref-x-0' );
	assert.deepEqual( items[ 0 ].writes, [ { attr: 'tileBorderColourHover', value: 'transparent' } ] );
	assert.deepEqual( writes( tiles.decide( ctx( d, d ) ) ), [] );
} );

test( 'tiles: the draft hover drop shadow is written to tileHoverShadow and its colour; no draft shadow, a ring or a matching live shadow writes none', () => {
	const mk = ( shadow ) => {
		const r = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
		r.hover.tile[ 'box-shadow' ] = shadow;
		return r;
	};
	const drop = 'rgba(10, 126, 168, 0.6) 0px 18px 30px -20px';
	const w = writes( tiles.decide( ctx( mk( drop ), mk( 'none' ) ) ) );
	assert.deepEqual( w.map( ( x ) => x[ 0 ] ), [ 'tileHoverShadow', 'tileHoverShadowColour' ] );
	assert.equal( w[ 0 ][ 1 ], '0 18px 30px -20px' );
	assert.equal( w[ 1 ][ 1 ], '#0A7EA899' );
	// Negative controls: the live tile already matches; the draft has no hover shadow; the draft's hover shadow is a ring (the hover layer's).
	assert.deepEqual( writes( tiles.decide( ctx( mk( drop ), mk( drop ) ) ) ), [] );
	assert.deepEqual( writes( tiles.decide( ctx( mk( 'none' ), mk( 'none' ) ) ) ), [] );
	assert.deepEqual( writes( tiles.decide( ctx( mk( 'rgb(10, 126, 168) 0px 0px 0px 3px' ), mk( 'none' ) ) ) ), [] );
} );

test( 'tiles: a hover shadow that is not one drop shadow is reported as no-setting naming the value; a matching live shadow reports nothing', () => {
	const mk = ( shadow ) => {
		const r = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
		r.hover.tile[ 'box-shadow' ] = shadow;
		return r;
	};
	const layers = 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px, rgba(0, 0, 0, 0.1) 0px 12px 24px 0px';
	const rows = tiles.decide( ctx( mk( layers ), mk( 'none' ) ) ).filter( ( i ) => 'tileHoverShadow' === i.prop );
	assert.equal( rows.length, 1 );
	assert.equal( rows[ 0 ].status, 'no-setting' );
	assert.ok( rows[ 0 ].why.includes( layers ) );
	// Negative controls: the live tile already shows it; the draft has none.
	assert.deepEqual( tiles.decide( ctx( mk( layers ), mk( layers ) ) ).filter( ( i ) => 'tileHoverShadow' === i.prop ), [] );
	assert.deepEqual( tiles.decide( ctx( mk( 'none' ), mk( 'none' ) ) ).filter( ( i ) => 'tileHoverShadow' === i.prop ), [] );
} );

test( 'tiles: a draft whose second click keeps the first tile chosen writes multiSelect over a one-answer live field', () => {
	const mk = ( multi ) => read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)', multi } );
	assert.deepEqual( writes( tiles.decide( ctx( mk( true ), mk( false ) ) ) ), [ [ 'multiSelect', true ] ] );
	assert.deepEqual( writes( tiles.decide( ctx( mk( true ), mk( true ) ) ) ), [] );
	assert.deepEqual( writes( tiles.decide( ctx( mk( false ), mk( false ) ) ) ), [] );
	assert.deepEqual( writes( tiles.decide( ctx( mk( null ), mk( false ) ) ) ), [] );
} );

test( 'floated label: a label that shrinks as it floats writes the floated size beside the resting size; one that does not writes nothing', () => {
	const fields = [ { label: { 'font-size': '17px' } } ];
	const d = { fields, focusLabel: { 'font-size': '13px' } };
	const l = { fields, focusLabel: { 'font-size': '17px' } };
	const [ item ] = floatedLabel( { saved: { labelFontSize: { desktop: 17 } }, d, l } );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes, [ { attr: 'labelFloatedFontSize', value: { desktop: '13px' } } ] );
	assert.deepEqual( floatedLabel( { saved: {}, d: { fields, focusLabel: { 'font-size': '17px' } }, l } ), [] );
	assert.deepEqual( floatedLabel( { saved: {}, d, l: { fields, focusLabel: { 'font-size': '13px' } } } ), [] );
	assert.equal( floatedLabel( { saved: { labelFloatedFontSize: { desktop: '13px' } }, d, l } )[ 0 ].status, 'no-setting' );
} );

test( 'floated label: the focused colour and top offset are written where the live label differs; equal to the live default writes nothing', () => {
	const fields = [ { label: { 'font-size': '13px' } } ];
	const d = { fields, focusLabel: { 'font-size': '13px', color: 'rgb(10, 126, 168)', top: '9px' } };
	const l = { fields, focusLabel: { 'font-size': '13px', color: 'rgb(7, 94, 128)', top: '8px' } };
	const items = floatedLabel( { saved: {}, d, l, snapshot: { palette: [] } } );
	assert.deepEqual( items.map( ( i ) => [ i.status, i.writes?.[ 0 ].attr, i.writes?.[ 0 ].value ] ), [
		[ 'op', 'labelFloatedColour', '#0A7EA8' ],
		[ 'op', 'labelFloatedOffset', '9px' ],
	] );
	// Negative control: a draft whose floated colour and offset equal the live defaults writes nothing.
	assert.deepEqual( floatedLabel( { saved: {}, d, l: { fields, focusLabel: d.focusLabel }, snapshot: { palette: [] } } ), [] );
	// A set value the live page still disagrees with is a no-setting row, not a second write.
	const held = floatedLabel( { saved: { labelFloatedColour: '#0A7EA8', labelFloatedOffset: '9px' }, d, l, snapshot: { palette: [] } } );
	assert.deepEqual( held.map( ( i ) => i.status ), [ 'no-setting', 'no-setting' ] );
	// A draft with no focus read (no floating label) writes nothing.
	assert.deepEqual( floatedLabel( { saved: {}, d: { fields }, l, snapshot: {} } ), [] );
} );

test( 'colourValue: transparent, an exact palette colour as its slug, anything else as hex', () => {
	assert.equal( colourValue( 'rgba(0, 0, 0, 0)', snapshot ), 'transparent' );
	assert.equal( colourValue( 'rgb(10, 126, 168)', snapshot ), 'brand-blue' );
	assert.equal( colourValue( 'rgb(11, 127, 169)', snapshot ), '#0B7FA9' );
	assert.equal( colourValue( 'not a colour', snapshot ), null );
} );

test( 'tiles: a two-pixel lift the draft has and the live tile lacks is a hover motion item; a matching lift is not', () => {
	const lift = ( y ) => ( { transform: 0 === y ? 'none' : `matrix(1, 0, 0, 1, 0, ${ y })`, translate: 'none', scale: 'none', rotate: 'none' } );
	const base = read( { selectedBg: 'rgb(10, 126, 168)', check: tick, hoverBorder: 'rgba(0, 0, 0, 0)' } );
	const mk = ( y ) => ( { ...base, hover: { tile: { ...base.hover.tile, ...lift( y ) } } } );
	const items = tiles.decide( ctx( mk( -2 ), mk( 0 ) ) ).filter( ( i ) => 'tile hover motion' === i.prop );
	assert.equal( items.length, 1 );
	assert.equal( items[ 0 ].status, 'no-setting', 'no hover record in an empty index is named, never guessed' );
	assert.deepEqual( tiles.decide( ctx( mk( -2 ), mk( -2 ) ) ).filter( ( i ) => 'tile hover motion' === i.prop ), [] );
	assert.deepEqual( tiles.decide( ctx( mk( 0 ), mk( 0 ) ) ).filter( ( i ) => 'tile hover motion' === i.prop ), [] );
} );

test( 'consent text: a size and a colour differing from the draft are the form\'s consent settings', () => {
	const c = { target: { ref: 'cr-ref-x-0', tpl: 'Root/9#0' }, block: 'sgs/form', saved: {}, recordsIndex: new Map(), calFor, db, snapshot };
	const size = partItems( { ctx: c, element: 'consent-text', prop: 'font-size', drafts: [ '14px' ], lives: [ '19px' ], check: { probe: [ 'consent' ] } } );
	assert.equal( size[ 0 ].status, 'op' );
	assert.equal( size[ 0 ].writes[ 0 ].attr, 'consentFontSize' );
	const colour = partItems( { ctx: c, element: 'consent-text', prop: 'color', drafts: [ 'rgb(74, 85, 99)' ], lives: [ 'rgb(30, 42, 60)' ] } );
	assert.equal( colour[ 0 ].status, 'op' );
	assert.equal( colour[ 0 ].writes[ 0 ].attr, 'consentColour' );
	assert.deepEqual( partItems( { ctx: c, element: 'consent-text', prop: 'font-size', drafts: [ '14px' ], lives: [ '14px' ] } ), [] );
} );
