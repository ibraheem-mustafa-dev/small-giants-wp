// What Fill reads and reports (Track R lane R1c/R7b). Real cases from the 2026-10-23 header Fill: the social icons' links
// hold no text, so collectPair read no `color` on them and lib/fill-state.mjs::holdDefaults raised "the draft's resting color
// was not read on this element" instead of holding the icon block's own hover swap; the UNMAPPED list dropped each row's
// state, so lib/confirm-live.mjs::judgeUnmapped refused every row; a failed declared read was only logged; an object
// setting's enum was listed as an unread structure choice; and the scrolled header was written sticky at desktop whatever
// the draft did on narrower screens.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { unmappedList, readFailureRows, READ_FAILED } from '../lib/fill-report.mjs';
import { structureRowsFor, STRUCTURE_ROLES as UNREAD_ROLES } from '../lib/fill-unread.mjs';
import { STRUCTURE_ROLES } from '../lib/calibrate-content.mjs';
import { stickyTiers, positionsByTemplate } from '../lib/motion-behaviour-settings.mjs';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { openDb } from '../lib/db.mjs';

// A bar sticky from 1024px only, an icon-only link, a link whose words carry their own colour, and an element the page
// removes as soon as the computed read has stamped it (so the devtools read finds nothing there).
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } .bar { position: sticky; top: 0; height: 40px } @media (max-width: 1023px) { .bar { position: static } }
a { display: inline-flex; width: 34px; height: 34px; background: rgb(200, 0, 0) } .icon { color: rgb(10, 20, 30) }
.word { color: rgb(1, 2, 3) } .word span { color: rgb(0, 0, 255) } .gone { display: block; width: 20px; height: 20px }
</style></head><body>
<header class="bar"><a class="icon" href="/x"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h16v16z" fill="#fff"/></svg></a><a class="word" href="/y"><span>Hi</span></a></header>
<div class="gone"></div>
<script>new MutationObserver( () => document.querySelector( '.gone[data-fill-owner]' )?.remove() ).observe( document.body, { attributes: true, subtree: true, attributeFilter: [ 'data-fill-owner' ] } );</script>
</body></html>`;

const TREE = [ '.bar', '.icon', '.word', '.gone' ].map( ( draftRef ) => ( { name: 'sgs/container', draftRef, attributes: {} } ) );
const NODES = skeletonNodes( TREE );
let served;
let read;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-reads-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	read = await readDraft( { url: served.url, nodes: NODES, headless: true, sweep: false } );
} );
after( () => served?.close() );

test( 'MUST FAIL (R1): an element with no text reads its own colour, so a hold can pair it with its ground', () => {
	for ( const w of [ 375, 768, 1440 ] ) {
		assert.equal( read.widths[ w ][ '1:' ].styles.color, 'rgb(10, 20, 30)', `the icon link's colour at ${ w }px` );
	}
	assert.equal( read.widths[ 1440 ][ '1:' ].styles[ 'background-color' ], 'rgb(200, 0, 0)' );
} );

test( 'negative control (R1): an element with words keeps the colour of the element painting them', () => {
	assert.equal( read.widths[ 1440 ][ '2:' ].styles.color, 'rgb(0, 0, 255)' );
} );

test( 'MUST FAIL (R7): a declared read that finds nothing is a recorded failure and an UNMAPPED row with its reason', () => {
	assert.deepEqual( read.failures.filter( ( f ) => '3:' === f.id ).map( ( f ) => f.width ).sort( ( a, b ) => a - b ), [ 375, 768, 1440 ] );
	assert.equal( read.declared[ 1440 ][ '3:' ], null );
	assert.deepEqual( read.failures.filter( ( f ) => '3:' !== f.id ), [], 'a target the devtools read finds is no failure' );
	const flat = TREE.map( ( n, i ) => ( { ...n, ref: `r${ i }` } ) );
	const rows = readFailureRows( { reads: read, nodes: NODES, flat, refOf: ( n ) => n.ref } );
	assert.equal( rows.length, 3 );
	const row = rows.find( ( r ) => '1440px' === r.value );
	assert.deepEqual( { node: row.node, block: row.block, slot: row.slot, property: row.property, state: row.state }, { node: 'r3', block: 'sgs/container', slot: '', property: READ_FAILED, state: null } );
	assert.match( row.reason, /^read-failed: the draft's declared values for this element at 1440px could not be read \(the devtools read found no element/ );
} );

test( 'MUST FAIL (R11.5): the computed position is read at every width', () => {
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => read.widths[ w ][ '0:' ].position ), [ 'static', 'static', 'sticky' ] );
} );

test( 'MUST FAIL (R5): an UNMAPPED row keeps its state, null at rest', () => {
	const rows = unmappedList( [ { property: 'color', value: '#fff', node: 'a', reason: 'x', block: 'sgs/icon', state: 'hover' }, { property: 'gap', value: '4px', node: 'a', reason: 'y', block: 'sgs/icon' } ] );
	assert.equal( rows[ 0 ].state, 'hover' );
	assert.ok( 'state' in rows[ 1 ] );
	assert.equal( rows[ 1 ].state, null );
} );

test( 'MUST FAIL: a structure setting whose type is not a string, or whose enum lists no string, is not a structure choice', () => {
	const rows = [
		{ attr_name: 'mode', attr_type: 'string', enum_values: '["", "stack", 3]', role: 'layout' },
		{ attr_name: 'sizing', attr_type: 'object', enum_values: '["fit", "fill"]', role: 'layout' },
		{ attr_name: 'count', attr_type: 'string', enum_values: '[1, 2]', role: 'select-from-enum' },
	];
	const db = { prepare: () => ( { all: () => rows } ) };
	assert.deepEqual( structureRowsFor( db, 'sgs/x' ).map( ( r ) => r.attr_name ), [ 'mode' ] );
	const real = openDb();
	assert.ok( ! structureRowsFor( real, 'sgs/icon' ).some( ( r ) => 'sgsChildSizing' === r.attr_name ), 'the object sizing setting is not listed' );
	assert.ok( structureRowsFor( real, 'sgs/business-info' ).some( ( r ) => 'hoursLayout' === r.attr_name ), 'a string layout enum still is' );
} );

test( 'MUST FAIL: the unread list takes its structure roles from calibration, the one list', () => {
	assert.equal( UNREAD_ROLES, STRUCTURE_ROLES );
} );

test( 'MUST FAIL (R11.5): headerSticky follows the draft\'s position per tier; a pinned tier inherits', () => {
	assert.deepEqual( stickyTiers( { 375: 'static', 768: 'static', 1440: 'sticky' } ), { desktop: 'on', tablet: 'off', mobile: 'off' } );
	assert.deepEqual( stickyTiers( { 375: 'sticky', 768: 'sticky', 1440: 'sticky' } ), { desktop: 'on' } );
	assert.deepEqual( stickyTiers( { 375: 'fixed', 768: 'static', 1440: 'sticky' } ), { desktop: 'on', tablet: 'off', mobile: 'on' } );
	assert.deepEqual( stickyTiers( { 375: 'sticky', 768: 'sticky', 1440: 'static' } ), { desktop: 'off', tablet: 'on' } );
	assert.deepEqual( stickyTiers( { 768: 'static', 1440: 'sticky' } ), { desktop: 'on', tablet: 'off' }, 'a tier the draft does not render inherits' );
	assert.equal( stickyTiers( { 375: 'static', 768: 'relative', 1440: 'static' } ), null );
	assert.deepEqual( stickyTiers( undefined ), { desktop: 'on' } );
} );

const HEADER = { id: 'S-1', name: 'S-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '10', selector: 'ref setHeaderEl', description: 'Header bar' }, trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' }, source: { code: 'this._headerEl.style.boxShadow = window.scrollY > 8 ?' }, properties: [ { property: 'box-shadow', from: 'none', to: '0 10px 30px -18px rgba(20,40,60,.35)' } ], duration_ms: 300 };
const TEMPLATE = { elements: { 'Site/10': { realParent: 'Site/1', srcLine: 10, style: { static: [ [ 'position', 'sticky' ], [ 'top', '0' ] ], holes: [] }, parentChain: [ 'Site/1' ] } } };
const stickyOf = ( positions ) => recogniseBehaviour( HEADER, { template: TEMPLATE, positions } ).blocks[ 'sgs/site-header' ].find( ( s ) => 'headerSticky' === s.attr )?.value;

test( 'MUST FAIL (R11.5): a draft header sticky only at desktop writes off on tablet and mobile; sticky at every width is unchanged', () => {
	const reads = { widths: { 375: { '0:': { position: 'static' } }, 768: { '0:': { position: 'static' } }, 1440: { '0:': { position: 'sticky' }, '0:.x': { position: 'static' } }, 1024: { '0:': { missing: true } } } };
	const positions = positionsByTemplate( { reads, nodes: [ { index: 0, name: 'sgs/site-header', targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/10#0' } }, { id: '0:.x', slot: '.x', finder: { tpl: 'Root/11#0' } } ] } ], rootComponent: 'Site' } );
	assert.deepEqual( positions, { 'Site/10': { 375: 'static', 768: 'static', 1440: 'sticky' } } );
	assert.deepEqual( stickyOf( positions ), { desktop: 'on', tablet: 'off', mobile: 'off' } );
	assert.deepEqual( stickyOf( { 'Site/10': { 375: 'sticky', 768: 'sticky', 1440: 'sticky' } } ), { desktop: 'on' } );
	assert.deepEqual( stickyOf( undefined ), { desktop: 'on' }, 'with no read the code\'s pinning stands' );
	assert.equal( stickyOf( { 'Site/10': { 375: 'static', 768: 'static', 1440: 'static' } } ), undefined, 'the render wins over the code' );
} );
