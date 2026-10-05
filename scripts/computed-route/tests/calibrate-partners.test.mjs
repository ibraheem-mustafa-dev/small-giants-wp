// Proves the residual dead calibration classes that need a partner attribute before their setting can paint (Spec 47
// FR-47-2, L5.6): a background-size or -attachment setting needs a background image; a hover shadow colour needs a
// shadow shape; a hover border gradient needs a resting border gradient and a border width. Each partner is stated by
// the block's own code (cited per test), not guessed from the audit's label.
import test from 'node:test';
import assert from 'node:assert/strict';
import { preconditionsFor, planInstances, slotFor, borderPartners, shadowPartners, SHADOW_SHAPE, MARKER_REST_GRADIENT, MARKER_GRADIENT } from '../lib/calibrate.mjs';

const SNAP = { palette: [ { slug: 'accent', colour: { r: 200, g: 40, b: 90, a: 1 } } ], spacing: [], fontSizes: [] };
const row = ( o ) => ( { tier_shape: null, box_family: null, css_state: null, css_element: null, role: null, ...o } );
const IMG = { id: 7, url: 'u' };

test( 'MUST FAIL (NEEDS_BG_IMAGE 7): a background-size / -attachment setting carries the site image it needs', () => {
	const schema = { backgroundImage: { type: 'object' }, backgroundSize: { type: 'string' }, backgroundAttachment: { type: 'string' }, backgroundColour: { type: 'string' } };
	const ctx = { image: IMG };
	const pre = ( attr, css, current = {}, c = ctx ) => preconditionsFor( row( { attr_name: attr, css_property: css } ), schema, current, c );
	assert.deepEqual( pre( 'backgroundSize', 'background-size,object-fit' ), { backgroundImage: IMG } );
	assert.deepEqual( pre( 'backgroundAttachment', 'background-attachment' ), { backgroundImage: IMG } );
	// Not every background setting: a colour paints without an image, the image setting is its own marker.
	assert.deepEqual( pre( 'backgroundColour', 'background-color' ), {} );
	assert.deepEqual( pre( 'backgroundImage', 'background-image' ), {} );
	// Nothing to add when the variant already has an image, the block has no image setting, or the site has no image.
	assert.deepEqual( pre( 'backgroundSize', 'background-size', { backgroundImage: IMG } ), {} );
	assert.deepEqual( pre( 'backgroundSize', 'background-size', {}, {} ), {} );
	assert.deepEqual( preconditionsFor( row( { attr_name: 'backgroundSize', css_property: 'background-size' } ), { backgroundSize: { type: 'string' } }, {}, ctx ), {} );
} );

test( 'MUST FAIL (14 hover rows read dead): a hover shadow colour needs a shadow shape (helpers-colour-variants.php::sgs_shadow_decls composes nothing from a colour alone)', () => {
	const schema = { boxShadow: { type: 'string' }, boxShadowColourHover: { type: 'string' }, cardShadow: { type: 'string' }, cardShadowColourHover: { type: 'string' } };
	assert.deepEqual( shadowPartners( 'boxShadowColourHover', 'box-shadow-color', schema ), { boxShadow: SHADOW_SHAPE } );
	assert.deepEqual( shadowPartners( 'cardShadowColourHover', 'box-shadow-color', schema ), { cardShadow: SHADOW_SHAPE } );
	// A shadow colour with no shape attribute in the block, or another property, gets no partner.
	assert.deepEqual( shadowPartners( 'boxShadowColourHover', 'box-shadow-color', {} ), {} );
	assert.deepEqual( shadowPartners( 'boxShadowColourHover', 'color', schema ), {} );
	assert.match( SHADOW_SHAPE, /^\d+px \d+px \d+px \d+px$/ );
	const r = row( { attr_name: 'boxShadowColourHover', css_property: 'box-shadow-color', css_state: 'hover', css_element: 'wrapper' } );
	assert.deepEqual( preconditionsFor( r, schema, {} ), { boxShadow: SHADOW_SHAPE } );
	// The marker instance and its baseline carry the same shape, so the colour is compared with a shadow of its own shape.
	const { instances } = planInstances( 'sgs/text', { rows: [ r ], schema, snapshot: SNAP, fixture: {} } );
	const marked = instances.find( ( i ) => i.row );
	assert.equal( marked.attrs.boxShadow, SHADOW_SHAPE );
	assert.ok( marked.baseKey );
	assert.equal( instances.find( ( i ) => i.isBase ).attrs.boxShadow, SHADOW_SHAPE );
} );

test( 'MUST FAIL (border-color-gradient hover reads dead): a hover border gradient needs a resting gradient and a width (helpers-tokens.php::sgs_border_gradient_css returns nothing without the resting paint)', () => {
	const schema = { borderColourGradient: { type: 'string' }, borderColourHoverGradient: { type: 'string' }, borderStyle: { type: 'string' }, borderWidth: { type: 'object' } };
	const p = borderPartners( 'borderColourHoverGradient', 'border-color-gradient', schema );
	assert.equal( p.borderColourGradient, MARKER_REST_GRADIENT );
	assert.equal( p.borderStyle, 'solid' );
	assert.deepEqual( p.borderWidth, { top: '3px', right: '3px', bottom: '3px', left: '3px' } );
	assert.notEqual( MARKER_REST_GRADIENT, MARKER_GRADIENT );
	// The resting gradient itself needs only the width and style; a flat hover colour needs no resting gradient.
	const rest = borderPartners( 'borderColourGradient', 'border-color-gradient', schema );
	assert.equal( rest.borderColourGradient, undefined );
	assert.equal( rest.borderStyle, 'solid' );
	assert.equal( borderPartners( 'borderColourHover', 'border-color', schema ).borderColourGradient, undefined );
	// A prefixed stem (social-icons wrapperBorderColourHoverGradient) names its own partners.
	const social = { wrapperBorderColourGradient: { type: 'string' }, wrapperBorderStyle: { type: 'string' }, wrapperBorderWidth: { type: 'object' } };
	const sp = borderPartners( 'wrapperBorderColourHoverGradient', 'border-color-gradient', social );
	assert.equal( sp.wrapperBorderColourGradient, MARKER_REST_GRADIENT );
	assert.equal( sp.wrapperBorderStyle, 'solid' );
} );

const reads = ( map ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, map( w ) ] ) );

test( 'MUST FAIL (brand-strip columns, decorative-image width read oneWidth): a setting whose value is a formula of the marker is reached wherever it changed', () => {
	const r = row( { attr_name: 'columns', css_property: 'max-width', tier_shape: 'tier_object' } );
	const marker = { expect: { 375: '200px', 768: '200px', 1440: '200px' } };
	const def = reads( () => ( { '': { 'max-width': 'none' } } ) );
	// The block turns the marker into another length (a calc of the column count) at every width: no value equals the marker.
	const mark = reads( ( w ) => ( { '': { 'max-width': { 375: '1200px', 768: '2400px', 1440: '7400px' }[ w ] } } ) );
	const s = slotFor( r, marker, def, mark );
	assert.deepEqual( s.reachedAt, [ 375, 768, 1440 ] );
	assert.equal( s.oneWidth, false );
	assert.ok( s.transform );
	// Still one-width when the formula really changed it at one width only.
	const one = slotFor( r, marker, def, reads( ( w ) => ( { '': { 'max-width': 1440 === w ? '7400px' : 'none' } } ) ) );
	assert.deepEqual( one.reachedAt, [ 1440 ] );
	assert.equal( one.oneWidth, true );
} );
