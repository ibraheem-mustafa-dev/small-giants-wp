// The pairing of a draft's located parts with the framework database's settings (lib/fill-part-look.mjs::buildLook): what is
// written, what is left and why, on planted rows and planted readings (no browser, no site).
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-build.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { READ_PROPS, buildLook, primitive, samePrimitive, tableSelector } from '../lib/fill-part-look.mjs';

const BASE = Object.fromEntries( READ_PROPS.map( ( p ) => [ p, /-width$|^margin|^padding|radius$|-gap$/.test( p ) ? '0px' : '' ] ) );
Object.assign( BASE, { color: 'rgb(58, 42, 34)', 'background-color': 'rgba(0, 0, 0, 0)', 'font-family': '"Young Serif", serif', 'font-size': '19px', 'font-weight': '400', 'font-style': 'normal', 'line-height': '22.8px', 'letter-spacing': 'normal', 'text-transform': 'none', 'text-decoration-line': 'none', 'text-align': 'start', 'box-shadow': 'none', display: 'block', 'flex-direction': 'row', 'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none', 'border-top-color': 'rgb(0, 0, 0)', 'border-right-color': 'rgb(0, 0, 0)', 'border-bottom-color': 'rgb(0, 0, 0)', 'border-left-color': 'rgb(0, 0, 0)' } );
const el = ( styles = {}, text = 'x', key = 'k' ) => ( { key, tag: 'div', text, styles: { ...BASE, ...styles } } );
const sameAt = ( styles, widths = [ 1440, 768, 375 ] ) => Object.fromEntries( widths.map( ( w ) => [ w, [ el( 'function' === typeof styles ? styles( w ) : styles ) ] ] ) );
const row = ( attr, property, part, extra = {} ) => ( { attr_name: attr, attr_type: 'string', css_property: property, css_element: part, css_state: null, css_tier: null, is_responsive: 0, tier_shape: null, enum_values: null, default_value: null, ...extra } );
const SNAP = { palette: [ { slug: 'mm-cocoa', colour: { r: 58, g: 42, b: 34, a: 1 } } ], fontFamilies: [ { slug: 'heading', family: 'young serif' } ], spacing: [], fontSizes: [] };
const LOC = ( parts ) => ( { anchors: {}, parts: Object.fromEntries( parts.map( ( p ) => [ p, { from: 'page', match: {} } ] ) ) } );
const run = ( rows, reads, extra = {} ) => buildLook( { block: 'woocommerce/cart', rows, names: rows.map( ( r ) => r.attr_name ), locators: LOC( [ ...new Set( rows.map( ( r ) => r.css_element ) ) ] ), reads, snapshot: SNAP, ...extra } );
const writeOf = ( out, attr ) => out.writes.find( ( w ) => w.attr === attr );

test( 'a colour is written as the palette slug it matches and the font as its preset', () => {
	const out = run( [ row( 'nameColour', 'color', 'name' ), row( 'nameFamily', 'font-family', 'name' ) ], { name: sameAt( {} ) } );
	assert.equal( writeOf( out, 'nameColour' ).value, 'mm-cocoa' );
	assert.equal( writeOf( out, 'nameFamily' ).value, 'heading' );
} );

test( 'a size is a number with its unit setting beside it; a line height is a ratio with an empty unit', () => {
	const rows = [ row( 'nameSize', 'font-size', 'name', { attr_type: 'number' } ), row( 'nameLine', 'line-height', 'name', { attr_type: 'number' } ) ];
	const out = run( rows, { name: sameAt( {} ) }, { names: [ 'nameSize', 'nameSizeUnit', 'nameLine', 'nameLineUnit' ] } );
	assert.equal( writeOf( out, 'nameSize' ).value, 19 );
	assert.equal( writeOf( out, 'nameSizeUnit' ).value, 'px' );
	assert.equal( writeOf( out, 'nameLine' ).value, 1.2 );
	assert.equal( writeOf( out, 'nameLineUnit' ).value, '' );
} );

test( 'a per-device setting is written for a narrower width only where the draft differs from the wider one', () => {
	const r = row( 'namePad', 'padding', 'name', { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1 } );
	const pad = ( n ) => ( { 'padding-top': `${ n }px`, 'padding-right': `${ n }px`, 'padding-bottom': `${ n }px`, 'padding-left': `${ n }px` } );
	const out = run( [ r ], { name: sameAt( ( w ) => pad( 1440 === w ? 24 : 16 ) ) } );
	assert.deepEqual( writeOf( out, 'namePad' ).value, { desktop: { top: '24px', right: '24px', bottom: '24px', left: '24px' }, tablet: { top: '16px', right: '16px', bottom: '16px', left: '16px' } } );
	const flat = run( [ r ], { name: sameAt( pad( 24 ) ) } );
	assert.deepEqual( Object.keys( writeOf( flat, 'namePad' ).value ), [ 'desktop' ] );
} );

test( 'a setting that holds one value for every width takes the 1440 value and reports the widths that differ', () => {
	const r = row( 'nameGap', 'margin-bottom', 'name' );
	const out = run( [ r ], { name: sameAt( ( w ) => ( { 'margin-bottom': 1440 === w ? '16px' : '8px' } ) ) } );
	assert.equal( writeOf( out, 'nameGap' ).value, '16px' );
	assert.equal( writeOf( out, 'nameGap' ).widthVaries, true );
	assert.equal( out.widthVaries.length, 1 );
} );

test( 'a tablet or mobile sibling setting is written only where that device differs', () => {
	const rows = [ row( 'nameSize', 'font-size', 'name', { attr_type: 'number' } ), row( 'nameSizeTablet', 'font-size', 'name', { attr_type: 'number', css_tier: 'tablet' } ), row( 'nameSizeMobile', 'font-size', 'name', { attr_type: 'number', css_tier: 'mobile' } ) ];
	const out = run( rows, { name: sameAt( ( w ) => ( { 'font-size': 375 === w ? '16px' : '19px' } ) ) } );
	assert.equal( writeOf( out, 'nameSizeTablet' ), undefined );
	assert.equal( writeOf( out, 'nameSizeMobile' ).value, 16 );
	assert.equal( out.settings.nameSizeTablet.code, 'noDifference' );
} );

test( 'negative control: instances of one part that differ write nothing and both values are reported', () => {
	const r = row( 'nameColour', 'color', 'name' );
	const reads = { name: { 1440: [ el( { color: 'rgb(58, 42, 34)' }, 'A', 'a' ), el( { color: 'rgb(238, 128, 136)' }, 'B', 'b' ) ], 768: [ el(), el() ], 375: [ el(), el() ] } };
	const out = run( [ r ], reads );
	assert.equal( writeOf( out, 'nameColour' ), undefined );
	assert.equal( out.conflicts.length, 1 );
	assert.deepEqual( out.conflicts[ 0 ].conflicts[ 0 ].values.map( ( v ) => v.value ), [ '#3A2A22', '#EE8088' ] );
	const same = run( [ r ], { name: sameAt( {} ) } );
	assert.equal( writeOf( same, 'nameColour' ).value, 'mm-cocoa' );
} );

test( 'a part with settings and no locator is noLocator; a located part the draft has no element for is unpaired', () => {
	const rows = [ row( 'aColour', 'color', 'known' ), row( 'bColour', 'color', 'nolocator' ), row( 'cColour', 'color', 'missing' ) ];
	const out = buildLook( { block: 'woocommerce/cart', rows, names: [], locators: LOC( [ 'known', 'missing' ] ), reads: { known: sameAt( {} ) }, snapshot: SNAP } );
	assert.deepEqual( out.noLocator.map( ( p ) => p.part ), [ 'nolocator' ] );
	assert.deepEqual( out.unpaired.map( ( p ) => p.part ), [ 'missing' ] );
	assert.equal( out.settings.bColour.code, 'noLocator' );
	assert.equal( out.settings.cColour.code, 'unpaired' );
} );

test( 'a part restricted to another block has no locator on this block', () => {
	const out = buildLook( { block: 'woocommerce/cart', rows: [ row( 'aColour', 'color', 'box' ) ], names: [], locators: { anchors: {}, parts: { box: { from: 'page', match: {}, blocks: [ 'woocommerce/checkout' ] } } }, reads: { box: sameAt( {} ) }, snapshot: SNAP } );
	assert.equal( out.noLocator.length, 1 );
	assert.equal( out.writes.length, 0 );
} );

test( 'a look that paints nothing (normal, none, transparent) is not written; any other value is, flagged as default not read', () => {
	const rows = [ row( 'aStyle', 'font-style', 'name' ), row( 'aTransform', 'text-transform', 'name' ), row( 'aBg', 'background-color', 'name' ), row( 'aWeight', 'font-weight', 'name' ) ];
	const out = run( rows, { name: sameAt( {} ) } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'aWeight' ] );
	assert.equal( out.writes[ 0 ].defaultNotRead, true );
	assert.equal( out.settings.aStyle.code, 'initial' );
} );

test( 'a size is the draft\'s only where the draft states it, and only in pixels', () => {
	const r = row( 'aWidth', 'width', 'name' );
	const styles = ( decl ) => ( { width: '104px', 'decl:width': decl } );
	assert.equal( writeOf( run( [ r ], { name: sameAt( styles( '104px' ) ) } ), 'aWidth' ).value, '104px' );
	const undeclared = run( [ r ], { name: sameAt( styles( '' ) ) } );
	assert.equal( writeOf( undeclared, 'aWidth' ), undefined );
	assert.equal( undeclared.settings.aWidth.code, 'undeclared' );
	assert.equal( writeOf( run( [ r ], { name: sameAt( styles( '100vw' ) ) } ), 'aWidth' ), undefined );
} );

test( 'a state setting is never written from the resting read', () => {
	const out = run( [ row( 'aHover', 'color', 'name', { css_state: 'hover' } ), row( 'aColour', 'color', 'name' ) ], { name: sameAt( {} ) } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'aColour' ] );
	assert.equal( out.settings.aHover.code, 'state' );
} );

test( 'corners, one radius and a shadow with its colour setting take the shape their setting holds', () => {
	const corner = { 'border-top-left-radius': '24px', 'border-top-right-radius': '24px', 'border-bottom-right-radius': '24px', 'border-bottom-left-radius': '24px' };
	const out = run( [ row( 'aRadius', 'border-radius', 'name', { attr_type: 'object', tier_shape: 'tier_object' } ), row( 'bRadius', 'border-radius', 'name' ), row( 'aShadow', 'box-shadow', 'name' ) ], { name: sameAt( { ...corner, 'box-shadow': 'rgb(58, 42, 34) 8px 8px 0px 0px' } ) }, { names: [ 'aShadowColour' ] } );
	assert.equal( writeOf( out, 'aRadius' ).value.desktop.topLeft, '24px' );
	assert.equal( writeOf( out, 'bRadius' ).value, '24px' );
	assert.equal( writeOf( out, 'aShadow' ).value, '8px 8px 0 0' );
	assert.equal( writeOf( out, 'aShadowColour' ).value, 'mm-cocoa' );
	const uneven = run( [ row( 'bRadius', 'border-radius', 'name' ) ], { name: sameAt( { ...corner, 'border-top-left-radius': '4px' } ) } );
	assert.equal( uneven.settings.bRadius.code, 'shape' );
} );

test( 'a part shown only on a narrower device is written for those devices alone', () => {
	const r = row( 'aSize', 'height', 'icon', { attr_type: 'object', tier_shape: 'tier_object', is_responsive: 1 } );
	const out = run( [ r ], { icon: { 768: [ el( { height: '48px', 'decl:height': '48px' } ) ], 375: [ el( { height: '48px', 'decl:height': '48px' } ) ] } } );
	assert.deepEqual( writeOf( out, 'aSize' ).value, { tablet: '48px' } );
} );

test( 'a value on a setting with a recorded fault is flagged written, known not to paint', () => {
	const out = run( [ row( 'aColour', 'color', 'name' ) ], { name: sameAt( {} ) }, { faultOf: ( a ) => ( 'aColour' === a ? 'prints nothing here' : null ) } );
	assert.equal( writeOf( out, 'aColour' ).knownFault, 'prints nothing here' );
	assert.equal( out.counts.knownFaults, 1 );
} );

test( 'a look the element carries that no setting of its part holds is a noSetting row a Custom CSS writer can use', () => {
	const radius = { 'border-top-left-radius': '12px', 'border-top-right-radius': '12px', 'border-bottom-right-radius': '12px', 'border-bottom-left-radius': '12px' };
	const out = run( [ row( 'aColour', 'color', 'name' ) ], { name: sameAt( radius ) }, { selectorOf: () => '.wc-block-x' } );
	const n = out.noSetting.find( ( x ) => 'border-radius' === x.property );
	assert.equal( n.block, 'woocommerce/cart' );
	assert.equal( n.part, 'name' );
	assert.equal( n.selector, '.wc-block-x' );
	assert.equal( n.state, 'rest' );
	assert.deepEqual( n.draft[ 375 ], { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 } );
	assert.equal( out.noSetting.some( ( x ) => 'color' === x.property ), false );
} );

test( 'the look table\'s selector for a part comes from the row whose id is the part with underscores', () => {
	const table = { rows: { item_image: { cart: '.a', checkout: '.b' } } };
	assert.equal( tableSelector( table, 'item-image', 'cart' ), '.a' );
	assert.equal( tableSelector( table, 'item-image', 'account' ), null );
	assert.equal( tableSelector( table, 'nothing', 'cart' ), null );
} );

test( 'colours within delta E 2 and lengths within half a pixel are the same look; others are not', () => {
	assert.equal( samePrimitive( '#3A2A22', 'rgb(58, 42, 35)' ), true );
	assert.equal( samePrimitive( '#3A2A22', '#EE8088' ), false );
	assert.equal( samePrimitive( 24, 24.4 ), true );
	assert.equal( samePrimitive( 24, 26 ), false );
	assert.equal( primitive( 'font-size', { 'font-size': '19px' } ), 19 );
} );
