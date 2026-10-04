// Proves each calibration class the 2026-10-04 audit found dead or markerless now gets a marker, a precondition or a
// read (Spec 47 FR-47-2; .claude/reports/2026-10-04-route-data-audit/README.md §3). Each test fails on the code before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor, longhands, slotFor, preconditionsFor, planInstances, layoutModes } from '../lib/calibrate.mjs';

const SNAP = { palette: [ { slug: 'accent', colour: { r: 200, g: 40, b: 90, a: 1 } } ], spacing: [], fontSizes: [] };
const row = ( o ) => ( { tier_shape: null, box_family: null, css_state: null, css_element: null, role: null, ...o } );
const mk = ( r, schema = {}, ctx = {} ) => markersFor( row( r ), schema, SNAP, {}, ctx );

test( 'MUST FAIL (noMarker, extension): a setting absent from block.json is marked from its DB row', () => {
	const [ m ] = mk( { attr_name: 'sgsHideOnDesktop', css_property: 'display', attr_type: 'boolean', default_value: 'false' } );
	assert.deepEqual( m.attrs, { sgsHideOnDesktop: true } );
} );

test( 'MUST FAIL (noMarker, gradient): a gradient setting gets a gradient marker', () => {
	const [ m ] = mk( { attr_name: 'headerBackgroundGradient', css_property: 'background-image', role: 'colour-gradient' }, { headerBackgroundGradient: { type: 'string', default: '' } } );
	assert.match( m.attrs.headerBackgroundGradient, /^linear-gradient\(/ );
} );

test( 'MUST FAIL (noMarker, keyword with no enum): flex keywords are marked, never the default', () => {
	const ms = mk( { attr_name: 'alignItems', css_property: 'align-items' }, { alignItems: { type: 'string', default: 'center' } } );
	assert.deepEqual( ms.map( ( m ) => m.attrs.alignItems ), [ 'flex-end' ] );
} );

test( 'MUST FAIL (noMarker, media object): a background image is marked with the site image, and skipped without one', () => {
	const r = { attr_name: 'backgroundImage', css_property: 'background-image', tier_shape: 'flat_sibling', role: 'image-object' };
	const schema = { backgroundImage: { type: 'object' } };
	assert.deepEqual( mk( r, schema, { image: { id: 7, url: 'https://x/a.jpg' } } )[ 0 ].attrs, { backgroundImage: { id: 7, url: 'https://x/a.jpg' } } );
	assert.deepEqual( mk( r, schema ), [] );
} );

test( 'MUST FAIL (noMarker, transform family): rotation, scale and lift get values in the setting type', () => {
	assert.equal( mk( { attr_name: 'iconRotation', css_property: 'transform' }, { iconRotation: { type: 'number', default: 0 } } )[ 0 ].attrs.iconRotation, 37 );
	assert.equal( mk( { attr_name: 'scaleHover', css_property: 'transform' }, { scaleHover: { type: 'string', default: '' } } )[ 0 ].attrs.scaleHover, '1.1' );
	assert.equal( mk( { attr_name: 'liftHover', css_property: 'translate' }, { liftHover: { type: 'number', default: 0 } } )[ 0 ].attrs.liftHover, 7 );
} );

test( 'MUST FAIL (noMarker, lengths the regex missed): letter-spacing and a free margin are marked', () => {
	assert.equal( mk( { attr_name: 'brandTextLetterSpacing', css_property: 'letter-spacing' }, { brandTextLetterSpacing: { type: 'number', default: 0 } } ).length, 1 );
	assert.equal( mk( { attr_name: 'titleMarginBottom', css_property: 'margin' }, { titleMarginBottom: { type: 'string', default: '' } } )[ 0 ].attrs.titleMarginBottom, '37px' );
} );

test( 'MUST FAIL (noMarker, non-length tiers): per-device columns get counts differing from the default at each tier', () => {
	const [ m ] = mk( { attr_name: 'columns', css_property: 'column-count,grid-auto-columns,grid-template-columns', tier_shape: 'tier_object' }, { columns: { type: 'object', default: { desktop: 3, tablet: 2, mobile: 1 } } } );
	assert.deepEqual( m.attrs.columns, { desktop: 5, tablet: 3, mobile: 2 } );
} );

test( 'MUST FAIL (noMarker, colour by role): an overlay colour painted as a background-image layer gets a colour marker', () => {
	const ms = mk( { attr_name: 'backgroundOverlayColour', css_property: 'background-image', role: 'color' }, { backgroundOverlayColour: { type: 'string' } } );
	assert.equal( ms[ 0 ].attrs.backgroundOverlayColour, '#13579b' );
	assert.equal( ms[ 0 ].expect, null );
} );

test( 'MUST FAIL (dead, wrong shape): a per-device padding object with no box family is marked as a box per tier', () => {
	const [ m ] = mk( { attr_name: 'panelHeadPadding', css_property: 'padding', tier_shape: 'tier_object' }, { panelHeadPadding: { type: 'object', default: {} } } );
	assert.equal( m.label, 'box-tiers' );
	assert.deepEqual( Object.keys( m.attrs.panelHeadPadding.desktop ), [ 'top', 'right', 'bottom', 'left' ] );
} );

test( 'MUST FAIL (noMarker, flat_sibling radius): a corner object is marked with corners', () => {
	const [ m ] = mk( { attr_name: 'borderRadius', css_property: 'border-radius', tier_shape: 'flat_sibling' }, { borderRadius: { type: 'object', default: {} } } );
	assert.equal( m.label, 'corners' );
} );

test( 'MUST FAIL (dead, marker equals rest; rejected, weight type): two weights, numeric when the setting is a number', () => {
	const ms = mk( { attr_name: 'featuredFontWeight', css_property: 'font-weight' }, { featuredFontWeight: { type: 'number', default: 600 } } );
	assert.deepEqual( ms.map( ( m ) => m.attrs.featuredFontWeight ), [ 700, 300 ] );
} );

test( 'MUST FAIL (rejected, unit shape): a per-device unit companion is written as a per-device object', () => {
	const schema = { customWidth: { type: 'number' }, customWidthUnit: { type: 'object', default: { desktop: '%' } } };
	const [ m ] = mk( { attr_name: 'customWidth', css_property: 'width' }, schema );
	assert.deepEqual( m.attrs.customWidthUnit, { desktop: 'px', tablet: 'px', mobile: 'px' } );
} );

test( 'MUST FAIL (silent drop): gradient, border-gradient, shadow-colour and height properties are read', () => {
	assert.deepEqual( longhands( 'color-gradient' ), [ 'background-image' ] );
	assert.ok( longhands( 'border-color-gradient' ).includes( 'background-image' ) );
	assert.deepEqual( longhands( 'box-shadow-color' ), [ 'box-shadow' ] );
	assert.deepEqual( longhands( 'height' ), [ 'height' ] );
	assert.deepEqual( longhands( 'grid-template-rows' ), [ 'grid-template-rows' ] );
} );

test( 'MUST FAIL (dead, needs variant / toggle / partner / image): preconditions come from the framework data', () => {
	const ctx = { variantAttr: 'iconStyle', variantSlots: [ { variant_value: 'circle', unique_slot: 'iconCircleSize' } ], image: { id: 7, url: 'u' } };
	assert.deepEqual( preconditionsFor( row( { attr_name: 'iconCircleSize', css_property: 'width' } ), {}, { iconStyle: 'plain' }, ctx ), { iconStyle: 'circle' } );
	const toggles = { showBadge: { type: 'boolean', default: false }, badgeColour: { type: 'string' } };
	assert.deepEqual( preconditionsFor( row( { attr_name: 'badgeColour', css_property: 'color' } ), toggles ), { showBadge: true } );
	const border = { cardBorderColour: { type: 'string' }, cardBorderStyle: { type: 'string' }, cardBorderWidth: { type: 'string' } };
	assert.deepEqual( preconditionsFor( row( { attr_name: 'cardBorderColour', css_property: 'border-color' } ), border ), { cardBorderStyle: 'solid', cardBorderWidth: '3px' } );
	const overlay = { backgroundImage: { type: 'object' }, overlayColour: { type: 'string' } };
	assert.deepEqual( preconditionsFor( row( { attr_name: 'overlayColour', css_property: 'background-color' } ), overlay, {}, ctx ), { backgroundImage: { id: 7, url: 'u' } } );
} );

test( 'MUST FAIL (dead, needs layout mode): a layout property is also marked under each other layout mode', () => {
	const schema = { layout: { type: 'string', enum: [ 'stack', 'flex', 'grid' ], default: 'stack' }, flexWrap: { type: 'string', enum: [ 'wrap', 'nowrap' ], default: 'wrap' } };
	assert.deepEqual( layoutModes( schema ), [ { name: 'layout', values: [ 'flex', 'grid' ] } ] );
	const { instances } = planInstances( 'sgs/form', { rows: [ row( { attr_name: 'flexWrap', css_property: 'flex-wrap' } ) ], schema, snapshot: SNAP, fixture: {} } );
	const marked = instances.filter( ( i ) => i.row );
	assert.deepEqual( marked.map( ( i ) => i.attrs.layout ), [ undefined, 'flex', 'grid' ] );
	assert.ok( marked.slice( 1 ).every( ( i ) => i.baseKey ) );
} );

test( 'MUST FAIL (hover misses the styled child; shrunk has no trigger): state instances carry their target', () => {
	const schema = { labelColourHover: { type: 'string' }, shrunkFontSize: { type: 'string' } };
	const rows = [ row( { attr_name: 'labelColourHover', css_property: 'color', css_state: 'hover', css_element: 'label' } ), row( { attr_name: 'shrunkFontSize', css_property: 'font-size', css_state: 'shrunk' } ) ];
	const { instances } = planInstances( 'sgs/business-info', { rows, schema, snapshot: SNAP, fixture: {} } );
	const hover = instances.find( ( i ) => 'labelColourHover' === i.row?.attr_name );
	assert.equal( hover.target, '.sgs-business-info__label' );
	const shrunk = instances.find( ( i ) => 'shrunkFontSize' === i.row?.attr_name );
	assert.deepEqual( [ shrunk.trigger, shrunk.stateClass ], [ 'class', 'is-header-shrunk' ] );
} );

const reads = ( map ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, map( w ) ] ) );

test( 'a background read on a pseudo layer is located on that layer (the reader test proves the read)', () => {
	const r = row( { attr_name: 'backgroundColour', css_property: 'background-color' } );
	const def = reads( () => ( { '': { 'background-color': 'rgba(0, 0, 0, 0)' } } ) );
	const mark = reads( () => ( { '': { 'background-color': 'rgba(0, 0, 0, 0)' }, '::after': { 'background-color': 'rgb(19, 87, 155)' } } ) );
	const s = slotFor( r, { expect: null }, def, mark );
	assert.equal( s.slot, '::after' );
} );

test( 'MUST FAIL (oneWidth false positive): a container-query tier is not flagged oneWidth', () => {
	const r = row( { attr_name: 'gap', css_property: 'gap', tier_shape: 'tier_object' } );
	const def = reads( () => ( { '': { gap: '0px' } } ) );
	const mark = reads( ( w ) => ( { '': { gap: 1440 === w ? '37px' : '0px' } } ) );
	assert.equal( slotFor( r, { expect: null }, def, mark ).oneWidth, true );
	const cq = slotFor( r, { expect: null }, def, mark, { containerQuery: true } );
	assert.equal( cq.oneWidth, false );
	assert.equal( cq.containerTier, true );
} );
