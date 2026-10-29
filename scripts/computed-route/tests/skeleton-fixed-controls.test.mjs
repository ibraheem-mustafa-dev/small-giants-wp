// Fixed controls that are not blocks (Spec 48 FR-48-6, Spec 18, lib/skeleton-fixed-controls.mjs): a back-to-top control or a
// reading progress bar fixed to the viewport is the Floating UI site options (`sgs_floating_ui_*`) read from the element's own
// look; a persistent bottom bar, a cookie consent banner and a popup that opens on a timer are missing-features rows. Each has a
// negative control: the same control in flow, or a fixed element that is none of them, is not taken.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { hexOf, timedPopupMissing } from '../lib/skeleton-fixed-controls.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w, h ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
const across = ( y, h ) => ( { 375: { x: 0, y, w: 375, h }, 768: { x: 0, y, w: 768, h }, 1440: { x: 0, y, w: 1440, h } } );
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 400, 100 ), visible: every( true ), display: x.display || 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const FIXED = every( 'fixed' );
const STATIC = every( 'static' );
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'x', checks: { rootKey: 'Root/1#0' }, elements } );
const run = ( elements ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'page', surfaceKind: 'page', surfaceName: 'page', db } );
const page = ( ...kids ) => [ el( 'Root/1#0', null, 'section', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'p', 'Welcome to the shop.' ), ...kids ];
const row = ( r, tpl ) => r.proposal.rows.find( ( x ) => `Root/${ tpl }#0` === x.key );

const topButton = ( position, style ) => [ el( 'Root/9#0', 'Root/1#0', 'button', 'Back to top', { attrs: { 'aria-label': 'Back to top', style }, position, box: place( 330, 800, 44, 44 ) } ) ];

test( 'the decisions entries are sound and the colour reader keeps only plain opaque colours', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	assert.equal( hexOf( 'rgb(15, 126, 128)' ), '#0f7e80' );
	assert.equal( hexOf( '#fff' ), '#ffffff' );
	assert.equal( hexOf( 'rgba(0, 0, 0, 0.5)' ), null );
	assert.equal( hexOf( 'var(--x)' ), null );
} );

test( 'MUST FAIL: a back-to-top control fixed to the corner writes the Floating UI back-to-top options and is not a block', () => {
	const r = run( page( ...topButton( FIXED, 'position: fixed; left: 20px; bottom: 20px; background: rgb(15, 126, 128); color: rgb(255, 255, 255)' ) ) );
	assert.equal( row( r, 9 ).action, 'remove' );
	assert.deepEqual( r.proposal.siteOptions, { sgs_floating_ui_back_to_top_enabled: true, sgs_floating_ui_back_to_top_position: 'left', sgs_floating_ui_back_to_top_bg_colour: '#0f7e80', sgs_floating_ui_back_to_top_icon_colour: '#ffffff' } );
} );

test( 'negative control: the same back-to-top control in flow stays a link with the top source and sets no option', () => {
	const r = run( page( ...topButton( STATIC, 'display: inline-flex' ) ) );
	assert.notEqual( row( r, 9 ).action, 'remove' );
	assert.equal( r.proposal.siteOptions, undefined );
	assert.equal( row( r, 9 ).attributes.linkSource, 'top' );
} );

test( 'MUST FAIL: a thin fixed bar with a gradient fill is the Floating UI reading progress option with its gradient and height', () => {
	const bar = [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, red, blue)' }, position: FIXED, box: across( 0, 4 ) } ) ];
	const r = run( page( ...bar ) );
	assert.equal( row( r, 9 ).action, 'remove' );
	assert.deepEqual( r.proposal.siteOptions, { sgs_floating_ui_reading_progress_enabled: true, sgs_floating_ui_reading_progress_gradient: 'linear-gradient(90deg, red, blue)', sgs_floating_ui_reading_progress_height: 4 } );
} );

const bottomBar = ( position, style, kids ) => [ el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style }, position, box: across( 836, 64 ) } ), ...kids ];
const barKids = [ el( 'Root/10#0', 'Root/9#0', 'span', 'Free delivery today', { depth: 2 } ), el( 'Root/11#0', 'Root/9#0', 'a', 'Shop now', { depth: 2, attrs: { href: '/shop' } } ) ];

test( 'MUST FAIL: a bar fixed across the bottom with a link is a persistent bottom bar: removed and listed as a missing feature', () => {
	const r = run( page( ...bottomBar( FIXED, 'position: fixed; bottom: 0; left: 0; width: 100%', barKids ) ) );
	assert.equal( row( r, 9 ).action, 'remove' );
	assert.equal( row( r, 9 ).rule, 'persistentBar' );
	assert.match( row( r, 9 ).missingFeature.line, /persistent bottom bar/ );
	assert.match( row( r, 9 ).missingFeature.why, /Spec 18 section 1\.1/ );
} );

test( 'negative control: the same bar in flow, a fixed bar at the top and a fixed bottom bar with no link are not persistent bottom bars', () => {
	const inFlow = run( page( ...bottomBar( STATIC, 'display: flex', barKids ) ) );
	assert.equal( row( inFlow, 9 ).missingFeature, undefined );
	const top = run( page( ...bottomBar( FIXED, 'position: fixed; top: 0; left: 0; width: 100%', barKids ) ) );
	assert.equal( row( top, 9 ).missingFeature, undefined );
	const noLink = run( page( ...bottomBar( FIXED, 'position: fixed; bottom: 0; left: 0; width: 100%', [ barKids[ 0 ] ] ) ) );
	assert.equal( row( noLink, 9 ).missingFeature, undefined );
} );

test( 'MUST FAIL: a cookie consent banner fixed to the viewport is a missing feature; a cookie-policy link in flow is not', () => {
	const banner = run( page( el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; bottom: 10px; left: 10px' }, position: FIXED, box: place( 10, 700, 300, 120 ) } ), el( 'Root/10#0', 'Root/9#0', 'span', 'We use cookies to improve your visit', { depth: 2 } ) ) );
	assert.equal( row( banner, 9 ).rule, 'cookieConsent' );
	assert.match( row( banner, 9 ).missingFeature.line, /cookie consent banner/ );
	const link = run( page( el( 'Root/9#0', 'Root/1#0', 'a', 'Cookie policy', { attrs: { href: '/cookies' }, position: STATIC } ) ) );
	assert.equal( row( link, 9 ).missingFeature, undefined );
} );

test( 'MUST FAIL: a popup that opens after a delay or on exit intent is a missing feature; one a click opens is not', () => {
	const R = facts().decisions.rules;
	assert.match( timedPopupMissing( { openedBy: 'Opens automatically after 8 seconds on the home page', R } ).line, /timed popup/ );
	assert.ok( timedPopupMissing( { openedBy: 'Shown on exit intent', R } ) );
	assert.equal( timedPopupMissing( { openedBy: 'Opens when the visitor clicks Size guide', R } ), null );
	assert.equal( timedPopupMissing( { openedBy: '', R } ), null );
} );

// A modal surface whose record says how it opens: the surfaces.json opener words reach the proposal as the root row's missing feature.
const modalRun = ( openedBy, kind = 'modal' ) => proposeSkeleton( {
	inventory: inv( [ el( 'Root/1#0', null, 'div', '', { depth: 0, attrs: { role: 'dialog' } } ), el( 'Root/2#0', 'Root/1#0', 'p', 'Join our newsletter' ) ] ), facts: facts(), surface: kind, surfaceKind: kind, surfaceName: 'Newsletter', db,
	factRecord: { surfaces: { 'S-9': { id: 'S-9', kind, name: 'Newsletter', parent: null, roots: [] } }, elements: {}, sources: null }, openers: { 'S-9': openedBy }, surfaceId: 'S-9',
} );

test( 'MUST FAIL: a modal surface that opens on a timer carries the missing feature on its root row; one a click opens does not', () => {
	assert.match( row( modalRun( 'Opens automatically after 8 seconds' ), 1 ).missingFeature.line, /timed popup/ );
	assert.equal( row( modalRun( 'Opens when the visitor clicks Size guide' ), 1 ).missingFeature, undefined );
	assert.equal( row( modalRun( '' ), 1 ).missingFeature, undefined );
	assert.equal( row( modalRun( 'Opens automatically after 8 seconds', 'drawer' ), 1 ).missingFeature, undefined, 'only a modal can be a timed popup' );
} );

test( 'a declared fixed position counts when the rendered position is static, and a bottom of 40px is not the bottom edge', () => {
	const declaredOnly = run( page( ...bottomBar( STATIC, 'position: fixed; bottom: 0; left: 0; width: 100%', barKids ) ) );
	assert.equal( row( declaredOnly, 9 ).rule, 'persistentBar' );
	const lifted = run( page( ...bottomBar( FIXED, 'position: fixed; bottom: 40px; left: 0; width: 100%', barKids ) ) );
	assert.equal( row( lifted, 9 ).missingFeature, undefined, 'a bar floating 40px above the edge is not anchored to it' );
	const narrow = run( page( el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; bottom: 0; left: 0' }, position: FIXED, box: place( 0, 836, 200, 64 ) } ), barKids[ 1 ] && el( 'Root/10#0', 'Root/9#0', 'a', 'Shop', { depth: 2, attrs: { href: '/s' } } ) ) );
	assert.equal( row( narrow, 9 ).missingFeature, undefined, 'a corner box is not a bar across the width' );
	const tall = run( page( el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; bottom: 0; left: 0; width: 100%' }, position: FIXED, box: across( 500, 400 ) } ), el( 'Root/10#0', 'Root/9#0', 'a', 'Shop', { depth: 2, attrs: { href: '/s' } } ) ) );
	assert.equal( row( tall, 9 ).missingFeature, undefined, 'a tall panel is not a bar' );
} );

test( 'a reading progress bar thinner than the setting allows is held to the setting\'s range; a translucent fill sets no colour', () => {
	const thin = run( page( el( 'Root/9#0', 'Root/1#0', 'div', '', { attrs: { style: 'position: fixed; top: 0; left: 0; width: 100%; height: 1px; background: rgba(0, 0, 0, 0.5)' }, position: FIXED, box: across( 0, 1 ) } ) ) );
	assert.deepEqual( thin.proposal.siteOptions, { sgs_floating_ui_reading_progress_enabled: true, sgs_floating_ui_reading_progress_height: 2 } );
	assert.equal( hexOf( 'rgba(0, 0, 0, 1)' ), '#000000' );
} );
