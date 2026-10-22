// Spec 48 U8 (styling), lib/fill-scrollbar.mjs and lib/fill-logo-size.mjs: the draft's scrollbar colours go to the theme's
// existing scrollbar tokens (a colour the site already has is a note), and a logo whose width changes with the screen is
// written as the logo's per-device size.
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitScrollbarColour, isDark, scrollbarTokens, scrollbarPatch, mergePatch } from '../lib/fill-scrollbar.mjs';
import { logoSizeSettings, logoSizeWrites } from '../lib/fill-logo-size.mjs';
import { createPatch } from '../lib/fill-state-tokens.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

const hex = ( h ) => parseColour( h );
const SNAPSHOT = { palette: [ { slug: 'primary', colour: hex( '#1f7a7a' ) }, { slug: 'accent', colour: hex( '#e7d768' ) } ] };
const SITE = { thumb: 'var(--wp--preset--color--primary)', thumbOnDark: 'var(--wp--preset--color--accent)', track: 'transparent' };
const DRAWER = { from: { node: 'cr-ref-f-3', block: 'sgs/nav-drawer', slot: '', index: 3 }, color: 'rgba(231, 215, 104, 0.75) rgba(0, 0, 0, 0)', width: 'thin', ground: 'rgb(18, 52, 40)', thumbPart: 'rgba(231, 215, 104, 0.75)', trackPart: 'rgba(0, 0, 0, 0)' };
const run = ( item, site = SITE ) => {
	const sink = createPatch();
	return { ...scrollbarTokens( { items: [ item ], snapshot: SNAPSHOT, site, sink } ), patch: sink.patch, entries: sink.entries };
};

test( 'MUST FAIL: a computed scrollbar-color is split into thumb and track, and a dark ground is told from a light one', () => {
	const c = splitScrollbarColour( DRAWER.color );
	assert.deepEqual( [ c.thumb.r, c.thumb.g, c.thumb.b, c.thumb.a, c.track.a ], [ 231, 215, 104, 0.75, 0 ] );
	assert.equal( splitScrollbarColour( 'auto' ), null );
	assert.equal( isDark( 'rgb(18, 52, 40)' ), true );
	assert.equal( isDark( 'rgb(250, 250, 245)' ), false );
	assert.equal( isDark( 'rgba(0, 0, 0, 0)' ), false );
} );

test( 'MUST FAIL: a draft thumb that differs from the site\'s token on a dark ground is written to thumbOnDark, as a hex literal when no palette colour is within reach', () => {
	const r = run( DRAWER );
	assert.deepEqual( r.patch, { settings: { custom: { scrollbar: { thumbOnDark: '#E7D768BF' } } } } );
	assert.equal( r.entries[ 0 ].path, 'settings.custom.scrollbar.thumbOnDark' );
	assert.equal( r.entries[ 0 ].node, 'cr-ref-f-3' );
} );

test( 'MUST FAIL: a thumb equal to a palette colour is written as that colour\'s variable; the light-ground thumb is the thumb token', () => {
	const r = run( { ...DRAWER, color: 'rgb(31, 122, 122) rgb(0, 0, 0)', ground: 'rgb(255, 255, 255)', thumbPart: null, trackPart: null }, { thumb: 'var(--wp--preset--color--accent)', track: 'transparent' } );
	assert.equal( r.patch.settings.custom.scrollbar.thumb, 'var(--wp--preset--color--primary)' );
	assert.equal( r.patch.settings.custom.scrollbar.track, '#000000' );
} );

test( 'MUST FAIL: a colour the site\'s token already gives is a note and no write; a transparent track is the theme\'s own', () => {
	const r = run( { ...DRAWER, color: 'rgb(231, 215, 104) rgba(0, 0, 0, 0)' } );
	assert.deepEqual( r.patch, {} );
	assert.match( r.notes[ 0 ], /is the theme's scrollbar thumbOnDark token already/ );
} );

test( 'MUST FAIL: a width other than auto is a named row (the theme has one width); differing webkit parts are named', () => {
	const r = run( { ...DRAWER, thumbPart: 'rgb(255, 0, 0)' } );
	assert.equal( r.unmapped[ 0 ].property, 'scrollbar-width' );
	assert.match( r.notes.join( '\n' ), /::-webkit-scrollbar parts paint rgb\(255, 0, 0\)/ );
	assert.deepEqual( run( { ...DRAWER, width: 'auto' } ).unmapped, [] );
} );

test( 'MUST FAIL: the surface pass reads each scroller once and merges into the snapshot patch', () => {
	const { from, ...bar } = DRAWER;
	const reads = { widths: { 1440: { '3:': { scrollbar: bar }, '4:': { scrollbar: { ...bar } } } } };
	const nodes = [ { index: 0, name: 'sgs/nav-drawer', targets: [ { id: '3:', slot: '' } ] }, { index: 1, name: 'sgs/container', targets: [ { id: '4:', slot: '' } ] } ];
	const flat = [ { ref: 'a' }, { ref: 'b' } ];
	const r = scrollbarPatch( { nodes, flat, refOf: ( n ) => n.ref, reads, snapshot: SNAPSHOT, site: SITE } );
	assert.equal( r.entries.length, 1 );
	assert.equal( r.unmapped.filter( ( u ) => 'scrollbar-width' === u.property ).length, 1, 'the same scroller seen from a parent and a child is one' );
	assert.deepEqual( mergePatch( { settings: { custom: { focus: { a: 1 } } } }, r.patch ).settings.custom, { focus: { a: 1 }, scrollbar: { thumbOnDark: '#E7D768BF' } } );
} );

// The logo's size per device.
const db = openDb();
const planted = ( tiers ) => ( {
	nodes: [ { index: 0, name: 'sgs/responsive-logo', targets: [ { id: '0:', slot: '' } ] } ],
	flat: [ { ref: 'cr-ref-f-9', attributes: {} } ],
	refOf: ( n ) => n.ref,
	reads: { widths: Object.fromEntries( Object.entries( tiers ).map( ( [ w, px ] ) => [ w, { '0:': { rect: { w: px } } } ] ) ) },
	db,
	unmapped: [ { node: 'cr-ref-f-9', block: 'sgs/responsive-logo', slot: '', property: 'width', code: 'one-value-every-width', reason: 'shape: width holds one value for every width; draft has 260px, 200px' } ],
} );

test( 'a logo block\'s size settings come from the framework DB: an unresponsive width and a tier-object max-width with its unit', () => {
	assert.deepEqual( logoSizeSettings( db, 'sgs/responsive-logo' ), { width: 'width', max: 'maxWidth', unit: 'maxWidthUnit' } );
	assert.equal( logoSizeSettings( db, 'sgs/container' ), null );
	const stub = ( rows ) => ( { prepare: ( sql ) => ( { all: () => rows, get: () => undefined } ) } );
	const untiered = stub( [ { attr_name: 'width', css_property: 'width', is_responsive: 0, tier_shape: null }, { attr_name: 'maxWidth', css_property: 'max-width', is_responsive: 0, tier_shape: null } ] );
	assert.equal( logoSizeSettings( untiered, 'sgs/x' ), null, 'a max width that is not a tier object cannot take per-device sizes' );
} );

test( 'MUST FAIL: a footer logo 200px on mobile is written as the per-device max width, the gap row is gone, and only differing tiers are written', () => {
	const p = planted( { 1440: 260, 768: 260, 375: 200 } );
	const r = logoSizeWrites( p );
	assert.deepEqual( p.flat[ 0 ].attributes.maxWidth, { desktop: 260, mobile: 200 } );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.prop, w.how ] ), [ [ 'maxWidth', 'width', 'logo-size' ] ] );
	assert.match( r.notes[ 0 ], /260px at desktop, 260px at tablet, 200px at mobile/ );
} );

test( 'a gap on another property, another slot or a block without the pair is left as it was', () => {
	const other = planted( { 1440: 260, 375: 200 } );
	other.unmapped = [ { ...other.unmapped[ 0 ], property: 'height' }, { ...other.unmapped[ 0 ], slot: '.inner' }, { ...other.unmapped[ 0 ], reason: 'no-setting', code: undefined } ];
	assert.equal( logoSizeWrites( other ).unmapped.length, 3 );
	const plain = planted( { 1440: 260, 375: 200 } );
	plain.nodes[ 0 ].name = 'sgs/container';
	assert.equal( logoSizeWrites( plain ).writes.length, 0 );
	const unread = planted( {} );
	assert.equal( logoSizeWrites( unread ).unmapped.length, 1 );
} );
