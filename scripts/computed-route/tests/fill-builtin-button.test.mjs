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
import { applyBuiltinButtons, declaredButtons, presetReads, kitValueShapes, translateY, HOVER_PROPS } from '../lib/fill-builtin-button.mjs';
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
	// The kit's two newest groups (src/components/button-kit/registry.json: contentAlign, hoverLift). The framework database holds no row for them until its next reseed; the tests use fixture rows.
	row( 'flowOpenerContentAlign', { attr_type: 'object', role: 'layout', css_property: 'justify-content', tier_shape: 'tier_object' } ),
	row( 'flowOpenerHoverLiftDistance', { role: 'styling', css_property: 'transform', css_state: 'hover' } ),
	// Add to Cart's two, for the opener that follows it (sgs/buybox declares the opener `follows: 'addToCart'`).
	row( 'addToCartContentAlign', { attr_type: 'object', role: 'layout', css_property: 'justify-content', tier_shape: 'tier_object', css_element: 'add-to-cart' } ),
	row( 'addToCartHoverLiftDistance', { role: 'styling', css_property: 'transform', css_state: 'hover', css_element: 'add-to-cart' } ),
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

function run( { reads = readsOf(), presets = EYE_CARE, rows = rowsOf(), buttons, database = db, names = NAMES } = {} ) {
	const build = buildLook( { block: BLOCK, rows, names, locators: { anchors: {}, parts: { [ PART ]: {} } }, reads, snapshot: null } );
	const before = build.writes.map( ( w ) => w.attr );
	const out = applyBuiltinButtons( { block: BLOCK, build, rows, names, db: database, reads, presets, snapshot: SNAPSHOT, buttons: buttons ?? [ { prefix: 'flowOpener', part: PART } ], schemaOf: () => null } );
	return { build, out, before, attrs: build.writes.map( ( w ) => w.attr ), value: ( a ) => build.writes.find( ( w ) => w.attr === a )?.value };
}

test( 'the block.json declaration is read: the buy box declares its flow opener', () => {
	// Other blocks adopt the kit over time (the container's carousel arrows, the buy box's Add to Cart), so the check is that
	// the opener's declaration is read, and that a block with no built-in button reads as none.
	assert.ok( declaredButtons( 'sgs/buybox' ).some( ( b ) => 'flowOpener' === b.prefix && 'flow-opener' === b.part ) );
	assert.deepEqual( declaredButtons( 'sgs/heading' ), [] );
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
	assert.equal( value( 'flowOpenerColourTextHover' ).toLowerCase(), '#faf8f5', 'a hovered colour equal to the resting one is written too: the block own hover look paints dark text otherwise' );
	assert.equal( build.settings.flowOpenerColourBackgroundHover.status, 'written' );
	assert.match( out.buttons[ 0 ].misses.primary.join( ' ' ), /padding|min-height|hover-transform/ );
	assert.match( out.buttons[ 0 ].misses.outline.join( ' ' ), /background: the preset holds transparent/ );
	assert.deepEqual( out.buttons[ 0 ].hover, [ 'flowOpenerColourBackgroundHover', 'flowOpenerColourTextHover' ] );
	assert.ok( ! attrs.includes( 'flowOpenerColourBorderHover' ), 'a hover border that paints nothing (no border drawn) is not written' );
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

// The kit registry's `value_shape` (the database's tier_shape box_only cannot tell a flat box from a per-device one): a kit button's
// Padding is { desktop, tablet, mobile } of sides and its BorderRadius of corners, BorderWidth one box of sides.
test( 'MUST FAIL: the registry names the value shape of each kit attribute, by prefix', () => {
	const shapes = kitValueShapes( 'flowOpener' );
	assert.equal( shapes.flowOpenerPadding, 'device_sides' );
	assert.equal( shapes.flowOpenerBorderRadius, 'device_corners' );
	assert.equal( shapes.flowOpenerBorderWidth, 'sides' );
	assert.equal( shapes.flowOpenerColourText, undefined );
} );

test( 'MUST FAIL: a kit attribute whose registry shape is per device is written per device: the 1440 value, then a narrower one only where it differs', () => {
	const rows = [ ...rowsOf(), { ...rowsOf().find( ( r ) => 'flowOpenerBorderWidth' === r.attr_name ), attr_name: 'flowOpenerBorderRadius', css_property: 'border-radius' } ];
	const names = new Set( [ ...NAMES, 'flowOpenerBorderRadius' ] );
	const reads = readsOf();
	reads[ PART ][ 375 ] = [ instance( styles( { 'padding-left': '14px', 'padding-right': '14px', 'border-top-left-radius': '4px', 'border-top-right-radius': '4px', 'border-bottom-right-radius': '4px', 'border-bottom-left-radius': '4px' } ), hovered() ) ];
	const build = buildLook( { block: BLOCK, rows, names, locators: { anchors: {}, parts: { [ PART ]: {} } }, reads, snapshot: null } );
	assert.deepEqual( build.writes.find( ( w ) => 'flowOpenerPadding' === w.attr ).value, { top: '0px', right: '22px', bottom: '0px', left: '22px' }, 'part-look alone writes a flat box' );
	applyBuiltinButtons( { block: BLOCK, build, rows, names, db, reads, presets: {}, snapshot: SNAPSHOT, buttons: [ { prefix: 'flowOpener', part: PART } ], schemaOf: () => null } );
	const pad = build.writes.find( ( w ) => 'flowOpenerPadding' === w.attr ).value;
	assert.deepEqual( pad, { desktop: { top: '0px', right: '22px', bottom: '0px', left: '22px' }, mobile: { top: '0px', right: '14px', bottom: '0px', left: '14px' } } );
	const radius = build.writes.find( ( w ) => 'flowOpenerBorderRadius' === w.attr ).value;
	assert.deepEqual( radius, { desktop: { topLeft: '0px', topRight: '0px', bottomRight: '0px', bottomLeft: '0px' }, mobile: { topLeft: '4px', topRight: '4px', bottomRight: '4px', bottomLeft: '4px' } } );
	assert.deepEqual( build.writes.find( ( w ) => 'flowOpenerBorderWidth' === w.attr ).value.top, '0px', 'a sides box stays flat' );
} );

test( 'a per-device kit write the draft holds at one value for every width has only a desktop entry (negative control)', () => {
	const { value } = run( { presets: {} } );
	assert.deepEqual( value( 'flowOpenerPadding' ), { desktop: { top: '0px', right: '22px', bottom: '0px', left: '22px' } } );
} );

// The content alignment and the hover lift (the buy box's Add to Cart and flow opener draw a label at one end and a price or note at the
// other, and rise 2px on hover): `<prefix>ContentAlign` from the computed justify-content, `<prefix>HoverLiftDistance` from the hovered
// transform's Y translation against the resting one.
const spread = ( over = {} ) => styles( { display: 'flex', 'justify-content': 'space-between', ...over } );

test( 'MUST FAIL: a draft button that spreads its content (justify-content: space-between) writes {prefix}ContentAlign, a centred one writes none', () => {
	const centred = run();
	assert.equal( centred.value( 'flowOpenerContentAlign' ), undefined, 'a centred draft writes nothing (negative control)' );
	assert.equal( centred.build.settings.flowOpenerContentAlign.status, 'not-written', 'the setting stays unwritten, with a reason' );
	assert.match( centred.build.settings.flowOpenerContentAlign.reason, /centres the button's content/ );
	assert.equal( centred.out.buttons[ 0 ].contentAlign, null );
	const spreadRun = run( { reads: readsOf( spread() ) } );
	assert.deepEqual( spreadRun.value( 'flowOpenerContentAlign' ), { desktop: 'space-between' } );
	assert.equal( spreadRun.build.settings.flowOpenerContentAlign.status, 'written' );
	assert.deepEqual( spreadRun.out.buttons[ 0 ].contentAlign, { desktop: 'space-between' } );
} );

test( 'a justify-content that is the block\'s own centre (normal, centre, unread) writes no content alignment (negative control)', () => {
	for ( const own of [ 'normal', 'center', '' ] ) {
		assert.equal( run( { reads: readsOf( styles( { 'justify-content': own } ) ) } ).value( 'flowOpenerContentAlign' ), undefined, `justify-content: ${ own || '(empty)' }` );
	}
} );

test( 'MUST FAIL: content alignment follows the widths: a narrower width is written only where it differs from the one above it, the own centre included', () => {
	const reads = readsOf( spread() );
	reads[ PART ][ 375 ] = [ instance( spread( { 'justify-content': 'flex-start' } ), hovered() ) ];
	assert.deepEqual( run( { reads } ).value( 'flowOpenerContentAlign' ), { desktop: 'space-between', mobile: 'flex-start' } );
	const back = readsOf( spread() );
	back[ PART ][ 375 ] = [ instance( styles( { 'justify-content': 'center' } ), hovered() ) ];
	assert.deepEqual( run( { reads: back } ).value( 'flowOpenerContentAlign' ), { desktop: 'space-between', mobile: 'center' }, 'a mobile centre after a spread desktop is a real value' );
	const wide = readsOf( styles() );
	wide[ PART ][ 768 ] = [ instance( spread( { 'justify-content': 'end' } ), hovered() ) ];
	wide[ PART ][ 375 ] = [ instance( spread( { 'justify-content': 'end' } ), hovered() ) ];
	assert.deepEqual( run( { reads: wide } ).value( 'flowOpenerContentAlign' ), { tablet: 'flex-end' }, 'a centred desktop is not written; a tablet end is, and mobile follows it' );
} );

test( 'draft instances of the button that differ in justify-content write no content alignment (negative control)', () => {
	const reads = readsOf( spread() );
	reads[ PART ][ 1440 ].push( instance( styles(), hovered() ) );
	const { value, build } = run( { reads } );
	assert.equal( value( 'flowOpenerContentAlign' ), undefined );
	assert.match( build.settings.flowOpenerContentAlign.reason, /differ in justify-content/ );
} );

test( 'a justify-content the setting cannot hold (space-around) writes nothing', () => {
	assert.equal( run( { reads: readsOf( spread( { 'justify-content': 'space-around' } ) ) } ).value( 'flowOpenerContentAlign' ), undefined );
} );

test( 'MUST FAIL: a draft button that rises on hover writes {prefix}HoverLiftDistance as the whole px it moves up, a still one writes 0px', () => {
	const rising = run();
	assert.equal( rising.value( 'flowOpenerHoverLiftDistance' ), '2px', 'the Eye Care opener rises 2px (matrix ty -2)' );
	assert.equal( rising.build.settings.flowOpenerHoverLiftDistance.status, 'written' );
	assert.equal( rising.out.buttons[ 0 ].lift, '2px' );
	const still = run( { reads: readsOf( styles(), hovered( { transform: 'none' } ) ) } );
	assert.equal( still.value( 'flowOpenerHoverLiftDistance' ), '0px', 'a still button writes 0px so a preset that lifts does not lift it' );
	assert.equal( still.build.settings.flowOpenerHoverLiftDistance.status, 'written' );
	assert.equal( still.out.buttons[ 0 ].lift, '0px' );
} );

test( 'the lift is the movement against the resting transform: 3px from a resting -1px, 0px for a sink or a sub-pixel move, none for a scale', () => {
	const lift = ( rest, hover ) => run( { reads: readsOf( styles( { transform: rest } ), hovered( { transform: hover } ) ) } ).value( 'flowOpenerHoverLiftDistance' );
	assert.equal( lift( 'matrix(1, 0, 0, 1, 0, -1)', 'matrix(1, 0, 0, 1, 0, -4)' ), '3px' );
	assert.equal( lift( 'none', 'matrix(1, 0, 0, 1, 0, 4)' ), '0px', 'a sinking button stays still' );
	assert.equal( lift( 'none', 'matrix(1.05, 0, 0, 1.05, 0, 0)' ), undefined, 'a scale alone is no lift' );
	assert.equal( lift( 'none', 'matrix(1, 0, 0, 1, 0, -0.4)' ), '0px', 'a move that rounds to 0px' );
	assert.equal( lift( 'none', 'matrix(1, 0, 0, 1, 0, -60)' ), '24px', 'capped at the setting\'s 24px ceiling' );
	assert.equal( lift( 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -5, 0, 1)' ), '5px', 'a 3D matrix reads its Y translation' );
	assert.equal( lift( 'none', 'perspective(10px)' ), undefined, 'a transform the route cannot read writes nothing' );
	assert.equal( lift( 'perspective(10px)', 'matrix(1, 0, 0, 1, 0, -2)' ), undefined, 'an unreadable resting transform writes nothing' );
} );

// A lift distance prints `transform:none` on hover (to cancel the site token's own hover transform) plus a `translate` lift, so it cannot
// hold a scaling, rotating or skewing hover: that draft is skipped. A still draft button writes 0px, or a preset that lifts would lift it.
const SCALE_LIFT = 'matrix(1.05, 0, 0, 1.05, 0, -2)';
const liftOf = ( rest, hover, extra = {} ) => run( { reads: readsOf( styles( { transform: rest } ), hovered( { transform: hover } ) ), ...extra } );

test( 'MUST FAIL: a hover that scales and lifts (matrix(1.05, 0, 0, 1.05, 0, -2)) writes no lift distance and says a lift cannot hold the scaling hover', () => {
	const r = liftOf( 'none', SCALE_LIFT );
	assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), undefined, 'transform:none would drop the 1.05 scale' );
	assert.equal( r.build.settings.flowOpenerHoverLiftDistance.status, 'not-written' );
	assert.match( r.build.settings.flowOpenerHoverLiftDistance.reason, /lift distance cannot hold the draft's scaling hover/ );
	assert.equal( r.out.buttons[ 0 ].lift, null );
} );

test( 'MUST FAIL: a scale-only hover, a rotating or skewing one, a scaling resting transform and a non-translation matrix3d write no lift distance', () => {
	for ( const [ rest, hover, label ] of [
		[ 'none', 'matrix(1.05, 0, 0, 1.05, 0, 0)', 'a scale alone' ],
		[ 'none', 'matrix(0.9961, 0.0872, -0.0872, 0.9961, 0, -2)', 'a rotation with a lift' ],
		[ 'none', 'matrix(1, 0, 0.2, 1, 0, -2)', 'a skew with a lift' ],
		[ 'matrix(1.02, 0, 0, 1.02, 0, 0)', 'matrix(1, 0, 0, 1, 0, -2)', 'a scaling resting transform' ],
		[ 'none', 'matrix3d(1.05, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -2, 0, 1)', 'a 3D scale across with a lift' ],
		[ 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0.001, 0, -2, 0, 1)', 'a 3D perspective with a lift' ],
	] ) {
		const r = liftOf( rest, hover );
		assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), undefined, label );
		assert.match( r.build.settings.flowOpenerHoverLiftDistance.reason, /cannot hold the draft's scaling hover/, label );
	}
} );

test( 'MUST FAIL: a still draft button (none, an equal translation, a sink, a sub-pixel move) writes a 0px lift distance so a lifting preset does not lift it', () => {
	for ( const [ rest, hover, label ] of [
		[ 'none', 'none', 'none resting and hovered' ],
		[ 'matrix(1, 0, 0, 1, 0, 0)', 'matrix(1, 0, 0, 1, 0, 0)', 'an identity matrix' ],
		[ 'matrix(1, 0, 0, 1, 0, -3)', 'matrix(1, 0, 0, 1, 0, -3)', 'an equal translation' ],
		[ 'none', 'matrix(1, 0, 0, 1, 0, 4)', 'a sink' ],
		[ 'none', 'matrix(1, 0, 0, 1, 0, -0.4)', 'a move that rounds to 0px' ],
		[ 'none', 'matrix(1, 0, 0, 1, 6, 0)', 'a sideways move' ],
		[ 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)', 'a 3D identity' ],
	] ) {
		const r = liftOf( rest, hover );
		assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), '0px', label );
		assert.equal( r.build.settings.flowOpenerHoverLiftDistance.status, 'written', label );
		assert.equal( r.out.buttons[ 0 ].lift, '0px', label );
		assert.equal( r.build.writes.find( ( w ) => 'flowOpenerHoverLiftDistance' === w.attr ).draft[ 1440 ], '0px', `${ label }: the recorded draft movement is never negative` );
	}
} );

test( 'negative control: a pure 2px lift (matrix or matrix3d, from a resting translation too) still writes the whole px it moves up', () => {
	assert.equal( liftOf( 'none', 'matrix(1, 0, 0, 1, 0, -2)' ).value( 'flowOpenerHoverLiftDistance' ), '2px' );
	assert.equal( liftOf( 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -2, 0, 1)' ).value( 'flowOpenerHoverLiftDistance' ), '2px' );
	assert.equal( liftOf( 'matrix(1, 0, 0, 1, 0, -1)', 'matrix(1, 0, 0, 1, 0, -4)' ).value( 'flowOpenerHoverLiftDistance' ), '3px' );
} );

test( 'negative control: a hover not read at 1440 writes no lift distance, still or not', () => {
	const reads = readsOf();
	reads[ PART ][ 1440 ] = [ instance( styles(), null ) ];
	const r = run( { reads } );
	assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), undefined );
	assert.match( r.build.settings.flowOpenerHoverLiftDistance.reason, /hovered look was not read at 1440/ );
} );

test( 'translateY reads none, a matrix and a matrix3d, and nothing else', () => {
	assert.equal( translateY( 'none' ), 0 );
	assert.equal( translateY( '' ), 0 );
	assert.equal( translateY( 'matrix(1, 0, 0, 1, 0, -3)' ), -3 );
	assert.equal( translateY( 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, -6, 0, 1)' ), -6 );
	assert.equal( translateY( 'rotate(3deg)' ), null );
	assert.equal( translateY( 'matrix(1, 0, 0)' ), null );
} );

test( 'MUST FAIL: both are written whether or not a preset matched (a preset carries no per-button content alignment or lift distance)', () => {
	const { out, value } = run( { reads: readsOf( spread() ), presets: { ink: INK } } );
	assert.equal( out.buttons[ 0 ].preset, 'ink', 'the ink preset matches the dark opener' );
	assert.deepEqual( value( 'flowOpenerContentAlign' ), { desktop: 'space-between' } );
	assert.equal( value( 'flowOpenerHoverLiftDistance' ), '2px' );
} );

test( 'the route owns both writes: a write the part-look pass made from the setting\'s own row is replaced, never doubled', () => {
	const { build, attrs } = run( { reads: readsOf( spread() ) } );
	assert.equal( attrs.filter( ( a ) => 'flowOpenerContentAlign' === a ).length, 1 );
	assert.equal( attrs.filter( ( a ) => 'flowOpenerHoverLiftDistance' === a ).length, 1 );
	assert.equal( build.writes.find( ( w ) => 'flowOpenerContentAlign' === w.attr ).property, 'justify-content' );
} );

test( 'before the framework database holds the two attributes (until its reseed) nothing is written for them and nothing breaks', () => {
	const old = new Set( [ ...NAMES ].filter( ( n ) => ! /ContentAlign|HoverLiftDistance/.test( n ) ) );
	const { attrs, build } = run( { reads: readsOf( spread() ), names: old, rows: rowsOf().filter( ( r ) => ! /ContentAlign|HoverLiftDistance/.test( r.attr_name ) ) } );
	assert.ok( ! attrs.some( ( a ) => /ContentAlign|HoverLiftDistance/.test( a ) ) );
	assert.equal( build.settings.flowOpenerContentAlign, undefined );
} );

// A button that follows another (sgs/buybox's flow opener wears Add to Cart's class, so every setting the opener leaves unset
// follows Add to Cart's: includes/buybox-linked-flow.php, `follows: 'addToCart'` in its block.json declaration). Where the followed
// button gets a content alignment or lift and the follower's draft differs, the follower's own value is written even when it is the
// block's own centre or no movement, or it would take Add to Cart's.
const FOLLOWS = [ { prefix: 'flowOpener', part: PART, follows: 'addToCart' }, { prefix: 'addToCart', part: 'add-to-cart' } ];
const pairReads = ( opener, add ) => ( { [ PART ]: readsOf( ...opener )[ PART ], 'add-to-cart': readsOf( ...add )[ PART ] } );

test( 'MUST FAIL: a centred, still opener beside a spread, lifting Add to Cart writes its own centre and 0px', () => {
	const r = run( { reads: pairReads( [ styles(), hovered( { transform: 'none' } ) ], [ spread(), hovered() ] ), buttons: FOLLOWS } );
	assert.deepEqual( r.value( 'addToCartContentAlign' ), { desktop: 'space-between' } );
	assert.equal( r.value( 'addToCartHoverLiftDistance' ), '2px' );
	assert.deepEqual( r.value( 'flowOpenerContentAlign' ), { desktop: 'center' }, 'the opener keeps its own centre' );
	assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), '0px', 'the opener stays still' );
} );

test( 'MUST FAIL: the follower path skips a scaling hover too (a follower never writes a lift distance for it)', () => {
	const r = run( { reads: pairReads( [ styles(), hovered( { transform: SCALE_LIFT } ) ], [ styles(), hovered() ] ), buttons: FOLLOWS } );
	assert.equal( r.value( 'addToCartHoverLiftDistance' ), '2px' );
	assert.equal( r.value( 'flowOpenerHoverLiftDistance' ), undefined );
	assert.match( r.build.settings.flowOpenerHoverLiftDistance.reason, /cannot hold the draft's scaling hover/ );
} );

test( 'negative control: an opener that matches Add to Cart writes its own values; a pair of centred, still buttons writes no alignment and a 0px lift each', () => {
	const same = run( { reads: pairReads( [ spread(), hovered() ], [ spread(), hovered() ] ), buttons: FOLLOWS } );
	assert.deepEqual( same.value( 'flowOpenerContentAlign' ), { desktop: 'space-between' }, 'its own spread, as before' );
	assert.equal( same.value( 'flowOpenerHoverLiftDistance' ), '2px' );
	const plain = run( { reads: pairReads( [ styles(), hovered( { transform: 'none' } ) ], [ styles(), hovered( { transform: 'none' } ) ] ), buttons: FOLLOWS } );
	assert.equal( plain.value( 'flowOpenerContentAlign' ), undefined, 'Add to Cart centred: nothing to override' );
	assert.equal( plain.value( 'flowOpenerHoverLiftDistance' ), '0px', 'a still draft button writes 0px whatever the other does' );
	assert.equal( plain.value( 'addToCartHoverLiftDistance' ), '0px' );
	const unlinked = run( { reads: pairReads( [ styles(), hovered( { transform: 'none' } ) ], [ spread(), hovered() ] ), buttons: FOLLOWS.map( ( { follows, ...b } ) => ( void follows, b ) ) } );
	assert.equal( unlinked.value( 'flowOpenerContentAlign' ), undefined, 'a button that follows no other keeps the default rule' );
	assert.equal( unlinked.value( 'flowOpenerHoverLiftDistance' ), '0px', 'a still button writes 0px follower or not' );
} );

test( 'MUST FAIL: the buy box declares that its flow opener follows Add to Cart', () => {
	assert.equal( declaredButtons( 'sgs/buybox' ).find( ( b ) => 'flowOpener' === b.prefix )?.follows, 'addToCart' );
} );

