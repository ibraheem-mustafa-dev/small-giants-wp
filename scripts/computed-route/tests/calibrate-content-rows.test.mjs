// Proves the row path Spec 47 §3.2's presence, text and link reads need: a setting with no css_property is discarded
// by lib/db.mjs::attrsFor, so the content reads query their rows by role instead, and plan an instance for each that
// still carries the preconditions its element needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, attrsFor } from '../lib/db.mjs';
import { preconditionsFor } from '../lib/calibrate.mjs';
import { contentRowsFor, planContentInstances, needlesOf, MARKER_TEXT, MARKER_URL, PRESENCE_ROLES, TEXT_ROLES, LINK_ROLES } from '../lib/calibrate-content.mjs';

const db = openDb();

test( 'MUST FAIL TO REACH THEM THROUGH attrsFor: content rows carry no css_property', () => {
	// The blocker: every text, presence and link row is dropped before the slot map is planned.
	const names = attrsFor( db, 'sgs/button' ).map( ( r ) => r.attr_name );
	assert.ok( ! names.includes( 'label' ), 'a text-content row has no css_property, so attrsFor never returns it' );
	assert.ok( ! names.includes( 'url' ), 'a link-href row has no css_property either' );
	// The role query reaches both.
	const rows = contentRowsFor( db, 'sgs/button' );
	assert.ok( rows.text.some( ( r ) => 'label' === r.attr_name ), 'the label is read for text' );
	assert.ok( rows.link.some( ( r ) => 'url' === r.attr_name ), 'the url is read for link' );
} );

test( 'the role query reads both roles of each pair, SGS-owned only', () => {
	const rows = contentRowsFor( db, 'sgs/google-reviews' );
	assert.ok( rows.presence.some( ( r ) => 'presence-boolean' === r.role ), 'a presence-boolean row is read' );
	assert.ok( rows.presence.some( ( r ) => 'boolean-visibility' === r.role ), 'a boolean-visibility row is read' );
	assert.ok( rows.link.some( ( r ) => 'seeAllUrl' === r.attr_name ) );
	for ( const r of [ ...rows.presence, ...rows.text, ...rows.link ] ) {
		assert.ok( [ 'sgs', 'sgs-ext' ].includes( r.source ), `${ r.attr_name } is SGS-owned (R-47-10)` );
	}
	// Both halves of each role pair are in scope, so the larger half is never left unreachable.
	assert.deepEqual( TEXT_ROLES.slice().sort(), [ 'content', 'text-content' ] );
	assert.deepEqual( LINK_ROLES.slice().sort(), [ 'link-content', 'link-href' ] );
	assert.deepEqual( PRESENCE_ROLES.slice().sort(), [ 'boolean-visibility', 'presence-boolean' ] );
} );

test( 'MUST FAIL ON A NULL PROPERTY: preconditionsFor reads a row with no css_property', () => {
	const row = { attr_name: 'badgeLabel', css_property: null, role: 'text-content' };
	assert.deepEqual( preconditionsFor( row, { showBadge: { type: 'boolean', default: false }, badgeLabel: { type: 'string' } }, {}, {} ), { showBadge: true } );
} );

test( 'a presence row is planned with its variant precondition and its gating toggle', () => {
	const schema = { showPrice: { type: 'boolean', default: false }, priceNote: { type: 'string' }, layout: { type: 'string', enum: [ 'standard', 'split' ], default: 'standard' } };
	const contentRows = {
		presence: [ { attr_name: 'showPrice', attr_type: 'boolean', default_value: 'false', css_property: null, role: 'boolean-visibility' } ],
		text: [ { attr_name: 'priceNote', attr_type: 'string', css_property: null, role: 'text-content' } ],
		link: [],
	};
	const variant = { variantAttr: 'layout', variantSlots: [ { variant_value: 'split', unique_slot: 'priceNote' } ] };
	const { instances } = planContentInstances( 'sgs/card', { contentRows, variant, schema, fixture: {}, ctx: { ...variant } } );
	const presence = instances.find( ( i ) => 'showPrice' === i.content?.attr && 'presence' === i.content?.kind );
	assert.equal( presence.attrs.showPrice, true, 'the boolean is flipped from its default' );
	const text = instances.find( ( i ) => 'priceNote' === i.content?.attr );
	assert.equal( text.attrs.priceNote, MARKER_TEXT );
	assert.equal( text.attrs.layout, 'split', 'the variant slot precondition is set, so the element renders' );
	// One presence instance per other value of the variant setting, keyed by that value.
	const split = instances.find( ( i ) => 'layout' === i.content?.attr && 'split' === i.content?.value );
	assert.equal( split.attrs.layout, 'split' );
	assert.ok( ! instances.some( ( i ) => 'layout' === i.content?.attr && 'standard' === i.content?.value ), 'the default value is the baseline, never a marker' );
} );

test( 'a link row is planned with a URL marker and every needle is collected once', () => {
	const contentRows = { presence: [], text: [], link: [ { attr_name: 'ctaUrl', attr_type: 'string', css_property: null, role: 'link-href' } ] };
	const { instances } = planContentInstances( 'sgs/card', { contentRows, variant: { variantAttr: null, variantSlots: [] }, schema: { ctaUrl: { type: 'string' } }, fixture: {}, ctx: {} } );
	assert.equal( instances[ 0 ].attrs.ctaUrl, MARKER_URL );
	assert.deepEqual( needlesOf( instances ), [ instances[ 0 ].content.needle ] );
} );

test( 'a row whose shape takes no marker is reported, never planned', () => {
	const contentRows = { presence: [], text: [ { attr_name: 'items', attr_type: 'array', css_property: null, role: 'content' } ], link: [] };
	const { instances, noMarker } = planContentInstances( 'sgs/card', { contentRows, variant: { variantAttr: null, variantSlots: [] }, schema: {}, fixture: {}, ctx: {} } );
	assert.equal( instances.length, 0 );
	assert.deepEqual( [ ...noMarker ], [ 'items' ] );
} );

test( 'MUST FAIL TO ATTRIBUTE A PRECONDITION: a content instance needing preconditions is read against a baseline carrying them', () => {
	// The note only renders under the split variant. Compared with the plain default instance, everything that variant
	// renders would read as this setting appearing, so the marked instance needs a baseline carrying the variant too.
	const schema = { splitNote: { type: 'string' }, layout: { type: 'string', enum: [ 'standard', 'split' ], default: 'standard' } };
	const contentRows = { presence: [], text: [ { attr_name: 'splitNote', attr_type: 'string', css_property: null, role: 'text-content' } ], link: [] };
	const variant = { variantAttr: 'layout', variantSlots: [ { variant_value: 'split', unique_slot: 'splitNote' } ] };
	const { instances } = planContentInstances( 'sgs/hero', { contentRows, variant, schema, fixture: {}, ctx: { ...variant } } );
	const marked = instances.find( ( i ) => 'splitNote' === i.content?.attr );
	assert.ok( marked.baseKey, 'the instance names the baseline it is compared with' );
	const base = instances.find( ( i ) => i.isBase && i.baseKey === marked.baseKey );
	assert.ok( base, 'that baseline instance is planned' );
	assert.equal( base.attrs.layout, 'split', 'the baseline carries the same preconditions' );
	assert.equal( base.attrs.splitNote, undefined, 'and not the marker' );
	assert.ok( ! base.content, 'a baseline is never collected as a reading of its own' );
} );

test( 'a content setting needing no preconditions is compared with the plain default instance', () => {
	const contentRows = { presence: [], text: [ { attr_name: 'heading', attr_type: 'string', css_property: null, role: 'content' } ], link: [] };
	const { instances } = planContentInstances( 'sgs/hero', { contentRows, variant: { variantAttr: null, variantSlots: [] }, schema: { heading: { type: 'string' } }, fixture: {}, ctx: {} } );
	assert.equal( instances[ 0 ].baseKey, null );
	assert.ok( ! instances.some( ( i ) => i.isBase ) );
} );
