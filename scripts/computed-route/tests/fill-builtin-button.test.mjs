// A built-in button's look from the draft (lib/fill-builtin-button.mjs, the button kit): the buy box's flow opener (prefix flowOpener,
// part flow-opener) gets its preset choice `flowOpenerStyle` written when the draft's button, resting and hovered, equals one site
// preset, and the draft's own look (the prefixed settings, resting by lib/fill-part-look.mjs and hovered here) when none does.
// The numbers are Eye Care's: the opener is a solid #141414 button (white-ish text, no border, 22px sides, 56px high, hover #2a2a2a
// and a 2px lift); its site presets are a 52px-high, 28px-sided primary and an outline for dark pages (transparent, currentColor
// text), so neither equals it and the draft's colours are written. Tests marked MUST FAIL fail on code that never matches or never
// drops what a preset gives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { buildLook, READ_PROPS } from '../lib/fill-part-look.mjs';
import { applyBuiltinButtons, declaredButtons, presetReads, HOVER_PROPS } from '../lib/fill-builtin-button.mjs';
import { presetMisses } from '../lib/fill-preset.mjs';

const PART = 'flow-opener';
const BLOCK = 'sgs/buybox';
const row = ( name, extra = {} ) => ( { block_slug: BLOCK, attr_name: name, attr_type: 'string', source: 'sgs', css_element: PART, ...extra } );
const ROWS = [
	row( 'flowOpenerStyle', { role: 'button-preset' } ),
	row( 'flowOpenerColourBackground', { role: 'color', css_property: 'background-color' } ), row( 'flowOpenerColourText', { role: 'color', css_property: 'color' } ),
	row( 'flowOpenerColourBorder', { role: 'color', css_property: 'border-color' } ),
	row( 'flowOpenerColourBackgroundHover', { role: 'color', css_property: 'background-color', css_state: 'hover' } ),
	row( 'flowOpenerColourTextHover', { role: 'color', css_property: 'color', css_state: 'hover' } ),
	row( 'flowOpenerColourBorderHover', { role: 'color', css_property: 'border-color', css_state: 'hover' } ),
	row( 'flowOpenerBorderWidth', { attr_type: 'object', role: 'visual', css_property: 'border-width', tier_shape: 'box_only' } ),
	row( 'flowOpenerPadding', { attr_type: 'object', role: 'layout', css_property: 'padding', tier_shape: 'box_only' } ),
	row( 'flowOpenerMinHeight', { attr_type: 'object', role: 'layout', css_property: 'min-height', tier_shape: 'tier_object' } ),
	row( 'flowOpenerFontSize', { attr_type: 'object', role: 'typography', css_property: 'font-size', tier_shape: 'tier_object' } ), row( 'flowOpenerFontSizeUnit', { role: 'typography', css_element: null } ),
	row( 'flowOpenerFontWeight', { role: 'typography', css_property: 'font-weight' } ), row( 'flowOpenerTextTransform', { role: 'typography', css_property: 'text-transform' } ),
];
const db = openDb( fixtureDb( { blocks: [ { slug: BLOCK, title: 'Buy box', category: 'sgs', type: 'dynamic' } ], block_attributes: ROWS } ) );
const rowsOf = () => ROWS.map( ( r ) => ( { css_property: null, css_state: null, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, ...r } ) );
const NAMES = new Set( ROWS.map( ( r ) => r.attr_name ) );
const SNAPSHOT = { palette: [], spacing: [], fontSizes: [] };

// The computed values of a solid dark button, with `over` changing any of them.
const styles = ( over = {} ) => ( {
	...Object.fromEntries( READ_PROPS.map( ( p ) => [ p, '' ] ) ),
	color: 'rgb(250, 248, 245)', 'background-color': 'rgb(20, 20, 20)', 'font-family': 'Inter, sans-serif', 'font-size': '13px', 'font-weight': '400', 'line-height': 'normal',
	'letter-spacing': '1.56px', 'text-transform': 'uppercase', 'text-decoration-line': 'none', 'text-align': 'center', 'box-shadow': 'none', 'min-height': '56px', 'decl:min-height': '56px', transform: 'none',
	...Object.fromEntries( [ 'top', 'bottom' ].flatMap( ( s ) => [ [ `padding-${ s }`, '0px' ] ] ) ), 'padding-left': '22px', 'padding-right': '22px',
	...Object.fromEntries( [ 'top', 'right', 'bottom', 'left' ].flatMap( ( s ) => [ [ `border-${ s }-width`, '0px' ], [ `border-${ s }-style`, 'none' ], [ `border-${ s }-color`, 'rgb(250, 248, 245)' ] ] ) ),
	...Object.fromEntries( [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].map( ( c ) => [ `border-${ c }-radius`, '0px' ] ) ),
	...over,
} );
const hovered = ( over = {} ) => ( { 'background-color': 'rgb(42, 42, 42)', color: 'rgb(250, 248, 245)', 'border-top-color': 'rgb(250, 248, 245)', 'border-top-width': '0px', 'border-top-style': 'none', 'box-shadow': 'none', transform: 'matrix(1, 0, 0, 1, 0, -2)', ...over } );
const instance = ( s, h, text = 'Add my prescription' ) => ( { key: 'div:0>button:0', tag: 'button', text, box: { w: 335, h: 56 }, styles: s, ...( h ? { hover: h } : {} ) } );
const readsOf = ( s = styles(), h = hovered(), count = 1 ) => ( { [ PART ]: Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, Array.from( { length: count }, () => instance( s, h ) ) ] ) ) } );

// Eye Care's presets for the dark opener's own look, and ones that differ from it in one value.
const INK = { background: '#141414', text: '#faf8f5', border: '#faf8f5', 'border-width': '0px', 'border-radius': '0px', padding: '0px 22px 0px 22px', 'font-size': '13px', 'font-weight': '400', 'min-height': '56px', 'hover-background': '#2a2a2a', 'hover-text': '#faf8f5', 'hover-border': '#faf8f5', 'hover-transform': 'matrix(1, 0, 0, 1, 0, -2)' };
const EYE_CARE = {
	primary: { background: '#141414', text: '#faf8f5', border: '#faf8f5', 'border-width': '0px', 'border-radius': '0px', padding: '0px 28px 0px 28px', 'font-size': '13px', 'font-weight': '400', 'min-height': '52px', 'hover-background': '#2a2a2a', 'hover-text': '#faf8f5', 'hover-border': '#faf8f5', 'hover-transform': 'matrix(1, 0, 0, 1, 0, -3)' },
	outline: { background: 'transparent', text: 'currentColor', border: 'color-mix(in srgb, currentColor 75%, transparent)', 'border-width': '1px', 'border-radius': '0px', padding: '0px 28px 0px 28px', 'font-size': '13px', 'font-weight': '400', 'min-height': '52px', 'hover-background': 'rgba(250, 248, 245, 0.14)', 'hover-text': 'currentColor', 'hover-border': 'currentColor', 'hover-transform': 'matrix(1, 0, 0, 1, 0, -3)' },
};

function run( { reads = readsOf(), presets = EYE_CARE, rows = rowsOf(), buttons, database = db } = {} ) {
	const build = buildLook( { block: BLOCK, rows, names: NAMES, locators: { anchors: {}, parts: { [ PART ]: {} } }, reads, snapshot: null } );
	const before = build.writes.map( ( w ) => w.attr );
	const out = applyBuiltinButtons( { block: BLOCK, build, rows, names: NAMES, db: database, reads, presets, snapshot: SNAPSHOT, buttons: buttons ?? [ { prefix: 'flowOpener', part: PART } ], schemaOf: () => null } );
	return { build, out, before, attrs: build.writes.map( ( w ) => w.attr ), value: ( a ) => build.writes.find( ( w ) => w.attr === a )?.value };
}

test( 'the block.json declaration is read: the buy box declares its flow opener', () => {
	assert.deepEqual( declaredButtons( 'sgs/buybox' ).map( ( b ) => [ b.prefix, b.part ] ), [ [ 'flowOpener', 'flow-opener' ] ] );
	assert.deepEqual( declaredButtons( 'sgs/container' ), [] );
} );

test( 'MUST FAIL: a draft button that equals a site preset, resting and hovered, writes the preset and drops what the preset gives', () => {
	const { out, attrs, value, before } = run( { presets: { ink: INK } } );
	assert.ok( before.includes( 'flowOpenerColourBackground' ) && before.includes( 'flowOpenerPadding' ), 'part-look alone writes the look' );
	assert.equal( value( 'flowOpenerStyle' ), 'ink' );
	for ( const gone of [ 'flowOpenerColourBackground', 'flowOpenerColourText', 'flowOpenerBorderWidth', 'flowOpenerPadding', 'flowOpenerMinHeight', 'flowOpenerFontSize', 'flowOpenerFontSizeUnit', 'flowOpenerFontWeight' ] ) {
		assert.ok( ! attrs.includes( gone ), `${ gone } is the preset's` );
	}
	assert.ok( attrs.includes( 'flowOpenerTextTransform' ), 'a value the preset does not hold stays' );
	assert.equal( out.buttons[ 0 ].preset, 'ink' );
	assert.match( out.notes.join( '\n' ), /equal the ink preset, so flowOpenerStyle is ink/ );
} );

test( 'Eye Care: the dark solid opener matches neither the primary preset (52px high, 28px sides, a 3px lift) nor the outline one; its own colours are written', () => {
	const { out, attrs, value, build } = run();
	assert.ok( ! attrs.includes( 'flowOpenerStyle' ), 'no preset is written' );
	assert.equal( value( 'flowOpenerColourBackground' ).toLowerCase(), '#141414' );
	assert.equal( value( 'flowOpenerColourText' ).toLowerCase(), '#faf8f5' );
	assert.equal( value( 'flowOpenerColourBackgroundHover' ).toLowerCase(), '#2a2a2a', 'the hovered background is written to the hover row' );
	assert.ok( ! attrs.includes( 'flowOpenerColourTextHover' ), 'a hovered colour equal to the resting one is not written' );
	assert.equal( build.settings.flowOpenerColourBackgroundHover.status, 'written' );
	assert.match( out.buttons[ 0 ].misses.primary.join( ' ' ), /padding|min-height|hover-transform/ );
	assert.match( out.buttons[ 0 ].misses.outline.join( ' ' ), /background: the preset holds transparent/ );
	assert.deepEqual( out.buttons[ 0 ].hover, [ 'flowOpenerColourBackgroundHover' ] );
} );

test( 'MUST FAIL: Eye Care\'s outline preset (cream text for dark pages) does not match a dark outlined draft button', () => {
	const outlined = styles( { color: 'rgb(20, 20, 20)', 'background-color': 'rgb(255, 255, 255)', 'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'rgb(20, 20, 20)', 'border-left-width': '1px', 'border-right-width': '1px', 'border-bottom-width': '1px', 'min-height': '52px', 'decl:min-height': '52px', 'padding-left': '28px', 'padding-right': '28px' } );
	const reads = readsOf( outlined, hovered( { 'background-color': 'rgb(243, 240, 235)', color: 'rgb(20, 20, 20)', 'border-top-color': 'rgb(20, 20, 20)', 'border-top-width': '1px', 'border-top-style': 'solid', transform: 'matrix(1, 0, 0, 1, 0, -3)' } ) );
	const { out, attrs, value } = run( { reads, presets: { outline: EYE_CARE.outline } } );
	assert.ok( ! attrs.includes( 'flowOpenerStyle' ) );
	assert.equal( out.buttons[ 0 ].preset, null );
	assert.equal( value( 'flowOpenerColourBackground' ).toLowerCase(), '#ffffff' );
	assert.equal( value( 'flowOpenerColourText' ).toLowerCase(), '#141414' );
	assert.equal( value( 'flowOpenerColourBorder' ).toLowerCase(), '#141414' );
	assert.equal( value( 'flowOpenerColourBackgroundHover' ).toLowerCase(), '#f3f0eb' );
	assert.match( out.notes.join( '\n' ), /no site preset equals the draft's button/ );
} );

test( 'a preset that differs from the draft in one hover value is not matched (negative control)', () => {
	const { out, attrs } = run( { presets: { ink: { ...INK, 'hover-background': '#333333' } } } );
	assert.ok( ! attrs.includes( 'flowOpenerStyle' ) );
	assert.match( out.buttons[ 0 ].misses.ink.join( ' ' ), /hover-background: the preset holds #333333, the draft rgb\(42, 42, 42\)/ );
} );

test( 'MUST FAIL: draft instances of the button that differ match no preset', () => {
	const reads = readsOf();
	reads[ PART ][ 1440 ].push( instance( styles( { 'background-color': 'rgb(0, 0, 255)' } ), hovered() ) );
	const { out, attrs } = run( { reads, presets: { ink: INK } } );
	assert.ok( ! attrs.includes( 'flowOpenerStyle' ) );
	assert.match( out.notes.join( '\n' ), /instances of the button differ/ );
} );

test( 'a hovered look that was not read matches no preset and writes no hover colour (fails closed)', () => {
	const { out, attrs } = run( { reads: readsOf( styles(), null ), presets: { ink: INK } } );
	assert.ok( ! attrs.includes( 'flowOpenerStyle' ) );
	assert.ok( ! attrs.includes( 'flowOpenerColourBackgroundHover' ) );
	assert.match( out.notes.join( '\n' ), /hovered look was not read at every width, so no preset is matched/ );
	assert.match( out.notes.join( '\n' ), /not read at 1440, so no hover colour is written/ );
} );

test( 'no draft button, no preset choice in the database, and no allowed variant each write nothing here and say so', () => {
	assert.match( run( { reads: {}, presets: { ink: INK } } ).out.notes.join( '\n' ), /the draft draws no such button/ );
	const without = ROWS.filter( ( r ) => 'flowOpenerStyle' !== r.attr_name );
	const noChoice = run( { rows: rowsOf().filter( ( r ) => 'flowOpenerStyle' !== r.attr_name ), presets: { ink: INK }, database: openDb( fixtureDb( { blocks: [ { slug: BLOCK, title: 'Buy box', category: 'sgs', type: 'dynamic' } ], block_attributes: without } ) ) } );
	assert.match( noChoice.out.notes.join( '\n' ), /holds no preset choice flowOpenerStyle for the part/ );
	assert.ok( ! noChoice.attrs.includes( 'flowOpenerStyle' ) );
	assert.match( run( { presets: { default: {}, link: {} } } ).out.notes.join( '\n' ), /holds no variant flowOpenerStyle allows/ );
	assert.deepEqual( run( { buttons: [] } ).out.buttons, [] );
} );

test( 'presetReads: a hovered look equal to the resting one is no state look; one that differs is a hover look', () => {
	const flat = presetReads( readsOf( styles(), { ...hovered(), ...Object.fromEntries( HOVER_PROPS.map( ( p ) => [ p, styles()[ p ] ] ) ) } )[ PART ], PART );
	assert.deepEqual( flat.states[ 1440 ].looks[ PART ], [] );
	const lift = presetReads( readsOf()[ PART ], PART );
	assert.equal( lift.states[ 1440 ].looks[ PART ][ 0 ].rendered[ 'background-color' ], 'rgb(42, 42, 42)' );
	assert.ok( lift.agree && lift.hovered );
} );

test( 'presetMisses names what each variant holds against the draft, and leaves a matching variant out', () => {
	const reads = presetReads( readsOf()[ PART ], PART );
	const miss = presetMisses( { presets: { ink: INK, primary: EYE_CARE.primary }, reads, id: PART, snapshot: SNAPSHOT } );
	assert.equal( miss.ink, undefined );
	assert.match( miss.primary[ 0 ], /^padding: the preset holds 0px 28px 0px 28px, the draft 0px 22px 0px 22px at 375px$/ );
} );
