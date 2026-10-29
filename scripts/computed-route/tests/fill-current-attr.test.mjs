// The current item a draft marks through a bound attribute (lib/fill-current-attr.mjs): the page the surface is read on marks no
// link current, so the reader opens the draft's other pages, finds the peer that carries `aria-current` and diffs its declared
// values against a non-current peer's; fillStates writes the difference into the nav block's `current` settings.
// MUST FAIL: with no other page, or a page that marks no peer current, nothing is written and one gap row names the item.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools } from '../../parity/lib/devtools.mjs';
import { currentAttrKeys, currentAttrJobs, readCurrentAttr } from '../lib/fill-current-attr.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { openDb } from '../lib/db.mjs';

const RESOLVE = resolveFinder.toString();
const db = openDb();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

const hole = ( where ) => ( { id: `${ where }#0`, where, expr: 'x', path: 'x', whole: true } );
const FACTS = { elements: {
	'Bar/5': { template: { tag: 'a', holes: [ hole( 'attr:aria-current' ), hole( 'style:background' ) ] } },
	'Bar/6': { template: { tag: 'a', holes: [ hole( 'attr:aria-current' ) ] } },
	'Home/9': { template: { tag: 'a', holes: [ hole( 'attr:aria-current' ) ] } },
	'Bar/7': { template: { tag: 'a', holes: [ hole( 'attr:href' ) ] } },
} };
const link = ( n, label, current ) => `<a data-dc-tpl="${ n }" href="#" style="display:block;padding:4px;border-radius:99px;font-weight:700;color:rgb(58,42,34);background:${ current ? 'rgb(249, 213, 211)' : 'transparent' }"${ current ? ' aria-current="page"' : '' }>${ label }</a>`;
const page = ( current ) => `<!doctype html><div class="sc-host" data-sc-name="Root"><div class="sc-host" data-sc-name="Bar"><nav>${ link( 5, 'Shop', 'shop' === current ) }${ link( 6, 'Gifts', 'gifts' === current ) }${ link( 7, 'Help', 'help' === current ) }</nav></div></div>`;
const PAGES = { '/home': page( 'home' ), '/shop': page( 'shop' ), '/gifts': page( 'gifts' ) };
const JOB = ( n ) => ( { id: `0:${ n }`, finder: { tpl: `Root>Bar@3#0/${ n }#0` } } );

const openSibling = ( pages ) => async ( url ) => {
	const p = await browser.newPage( { viewport: { width: 1000, height: 700 } } );
	await p.setContent( pages[ new URL( url ).pathname ] ?? '<!doctype html><p>none</p>' );
	return { page: p, cdp: await openDevtools( p ), close: () => p.close() };
};
const read = ( jobs, pages, map = PAGES ) => readCurrentAttr( { jobs, pages: pages.map( ( x ) => `http://draft.test${ x }` ), openSibling: openSibling( map ), resolveSrc: RESOLVE } );

test( 'the fact record names the elements whose aria-current is bound, and a job is one only inside a mounted component', () => {
	assert.deepEqual( currentAttrKeys( FACTS ), [ 'Bar/5', 'Bar/6', 'Home/9' ] );
	const jobs = currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 5 ), JOB( 7 ), { id: 'r', finder: { tpl: 'Root/9#0' } }, { id: 'u', finder: { tpl: 'Root>Bar@3#0/7#0' } }, { id: 's', finder: '.x' } ], 'Home' );
	assert.deepEqual( jobs, [ { id: '0:5', component: 'Bar', tpl: '5' } ], 'an unbound element (7), a root-component element and a selector finder are no candidates' );
} );

test( 'MUST FAIL WITHOUT THE READER: a link marked current on another page is read against a non-current peer and written to the current settings', async () => {
	const jobs = currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 5 ), JOB( 6 ) ], 'Home' );
	const { looks, gaps } = await read( jobs, [ '/home', '/shop' ] );
	assert.deepEqual( gaps, [], 'the shop page marks Shop current: Gifts reads Shop against itself as the non-current peer' );
	const l = looks[ '0:6' ];
	assert.equal( l.length, 1 );
	assert.deepEqual( l[ 0 ].states, [ 'current' ] );
	assert.equal( l[ 0 ].declared[ 'background-color' ], 'rgb(249, 213, 211)' );
	assert.equal( l[ 0 ].declared[ 'font-weight' ], undefined, 'a value both peers share is no look' );
	assert.equal( l[ 0 ].declared.color, undefined );
	const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
	const rows = db.prepare( 'SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = ? AND css_property IS NOT NULL' ).all( 'sgs/nav-bar-menu' );
	const cal = { elements: { '': {} }, settings: Object.fromEntries( rows.filter( ( r ) => 'itemBgCurrent' === r.attr_name ).map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ) };
	const tree = [ { name: 'sgs/nav-bar-menu', attributes: { className: 'cr-ref-n-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:6', slot: '' } ] } ];
	const reads = { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks } ] ) ) };
	const res = fillStates( { tree, nodes, reads, calFor: () => cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.deepEqual( res.writes.map( ( w ) => w.attr ), [ 'itemBgCurrent' ] );
} );

test( 'the current item itself reads against its first non-current peer', async () => {
	const { looks } = await read( currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 6 ) ], 'Home' ), [ '/gifts' ] );
	assert.equal( looks[ '0:6' ][ 0 ].declared[ 'background-color' ], 'rgb(249, 213, 211)' );
} );

test( 'negative control: no other page, or pages that mark no peer current, write no look and list the item once', async () => {
	const jobs = currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 5 ) ], 'Home' );
	for ( const pages of [ [], [ '/home' ], [ '/missing' ] ] ) {
		const { looks, gaps } = await read( jobs, pages );
		assert.deepEqual( looks, {} );
		assert.equal( gaps.length, 1 );
		assert.match( gaps[ 0 ].reason, /^current-attribute/ );
	}
	const same = { '/shop': page( 'shop' ).replace( /background:rgb\(249, 213, 211\)/, 'background:transparent' ) };
	assert.deepEqual( ( await read( jobs, [ '/shop' ], same ) ).looks, {}, 'peers that look alike give no look' );
} );

test( 'negative control: a value that is not current (false, empty), a peer of another tag and a hidden peer mark nothing current', async () => {
	const pink = 'background:rgb(249, 213, 211)';
	const decoys = {
		'/false': page( 'none' ).replace( 'data-dc-tpl="6" href="#"', `data-dc-tpl="6" aria-current="false" href="#" data-x="${ pink }"` ).replace( /(data-dc-tpl="6"[^>]*style=")([^"]*)/, `$1$2;${ pink }` ),
		'/empty': page( 'none' ).replace( 'data-dc-tpl="6" href="#"', 'data-dc-tpl="6" aria-current="" href="#"' ).replace( /(data-dc-tpl="6"[^>]*style=")([^"]*)/, `$1$2;${ pink }` ),
		'/tag': page( 'none' ).replace( '</nav>', `<span aria-current="page" style="display:block;${ pink }">x</span></nav>` ),
		'/hidden': page( 'none' ).replace( '</nav>', `<a aria-current="page" style="display:none;${ pink }">x</a></nav>` ),
	};
	const jobs = currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 5 ) ], 'Home' );
	for ( const route of Object.keys( decoys ) ) {
		assert.deepEqual( ( await read( jobs, [ route ], decoys ) ).looks, {}, route );
	}
} );

test( 'a hidden peer that carries the current value is skipped for the visible one', async () => {
	const withHidden = { '/shop': page( 'shop' ).replace( '<nav>', '<nav><a aria-current="page" style="display:none">x</a>' ) };
	const { looks } = await read( currentAttrJobs( currentAttrKeys( FACTS ), [ JOB( 6 ) ], 'Home' ), [ '/shop' ], withHidden );
	assert.equal( looks[ '0:6' ][ 0 ].declared[ 'background-color' ], 'rgb(249, 213, 211)' );
} );
