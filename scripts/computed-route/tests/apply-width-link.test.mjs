// The width and link families. Run: node --test tests/apply-width-link.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { width, fillOf, tokenCount } from '../lib/apply-family-width.mjs';
import { link } from '../lib/apply-family-link.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const at = ( f ) => ( { 1440: f, 768: f, 375: f } );
const box = ( x, y, w, h ) => ( { x, y, w, h } );
const target = { ref: 'cr-ref-x-1', tpl: 'Root/1#0' };
const f = ( o = {} ) => ( { tag: 'div', layout: box( 0, 0, 335, 100 ), styles: {}, ...o } );

test( 'width: a held entrance scale is not a difference (same layout box, no op)', () => {
	const draft = at( f( { styles: { 'max-width': 'none' } } ) );
	const live = at( f( { box: box( 7, 0, 322, 96 ), styles: { 'max-width': 'none' } } ) );
	assert.deepEqual( width.decide( { target, draft, live, saved: {}, block: 'sgs/container', db } ), [] );
} );

test( 'width: a different max-width writes the tier object, keeping saved tiers', () => {
	const draft = { 1440: f( { styles: { 'max-width': '1240px' } } ), 768: f( { styles: { 'max-width': 'none' } } ), 375: f( { styles: { 'max-width': 'none' } } ) };
	const live = at( f( { styles: { 'max-width': '1400px' } } ) );
	const [ item ] = width.decide( { target, draft, live, saved: { maxWidth: { tablet: '700px' } }, block: 'sgs/container', db } );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes[ 0 ].value, { tablet: '700px', desktop: '1240px' } );
	assert.deepEqual( item.checks, [ { width: 1440, prop: 'max-width', want: '1240px' } ] );
} );

test( 'width: equal max-width writes nothing', () => {
	const same = at( f( { styles: { 'max-width': '1240px' } } ) );
	assert.deepEqual( width.decide( { target, draft: same, live: same, saved: {}, block: 'sgs/container', db } ), [] );
} );

test( 'width: an auto-fill post grid keeps its empty columns; auto-fit on a container sets the column minimum', () => {
	const fillDraft = at( f( { declared: 'repeat(auto-fill, minmax(290px, 1fr))' } ) );
	assert.deepEqual( width.decide( { target, draft: fillDraft, live: at( f() ), saved: {}, block: 'sgs/post-grid', db } )[ 0 ].writes, [ { attr: 'keepEmptyColumns', value: true } ] );
	assert.equal( width.decide( { target, draft: fillDraft, live: at( f() ), saved: { keepEmptyColumns: true }, block: 'sgs/post-grid', db } )[ 0 ].status, 'equal' );
	const fit = at( f( { declared: 'repeat(auto-fit, minmax(240px, 1fr))' } ) );
	assert.deepEqual( width.decide( { target, draft: fit, live: at( f() ), saved: {}, block: 'sgs/container', db } )[ 0 ].writes[ 0 ].value, { desktop: '240px' } );
} );

test( 'width: a stated track list with more columns than live goes to the track setting', () => {
	const draft = at( f( { declared: '40px minmax(0px, 1fr)', styles: { 'grid-template-columns': '40px 295px' } } ) );
	const live = at( f( { styles: { 'grid-template-columns': '335px' } } ) );
	assert.equal( tokenCount( '40px minmax(0px, 1fr)' ), 2 );
	assert.deepEqual( fillOf( 'repeat(auto-fit, minmax(100%, 1fr))' ), { mode: 'auto-fit', min: '100%' } );
	const [ item ] = width.decide( { target, draft, live, saved: {}, block: 'sgs/container', db } );
	assert.equal( item.writes[ 0 ].attr, 'gridTemplateColumns' );
} );

const card = ( o = {} ) => f( { tag: 'a', href: '#/our-story', text: 'Our story Learn more', layout: box( 0, 0, 300, 200 ), styles: { cursor: 'pointer' }, ...o } );
const ctxFor = ( d, extra = {} ) => {
	const button = { tag: 'span', text: 'Learn more', layout: box( 10, 150, 100, 30 ), styles: {} };
	const lbtn = { tag: 'a', layout: box( 10, 150, 100, 30 ), styles: {} };
	const all = {
		blocks: { [ target.ref ]: { block: 'sgs/container', attrs: {} }, 'cr-ref-x-2': { block: 'sgs/button', attrs: { url: '#register-interest', ...( extra.button ?? {} ) } } },
		drafts: { 1440: { facts: { [ target.ref ]: d, 'cr-ref-x-2': button } } },
		lives: { 1440: { facts: { [ target.ref ]: f( { layout: box( 0, 0, 300, 200 ) } ), 'cr-ref-x-2': lbtn } } },
	};
	return { target, draft: at( d ), live: at( f( { layout: box( 0, 0, 300, 200 ) } ) ), saved: extra.saved ?? {}, block: 'sgs/container', db, links: null, all };
};
const live404 = { adapter: 'hash', rows: [ { route: 'our-story', slug: 'our-story', template: 'page', address: '/about/our-story/' } ], routeRow: new Map(), goRoutes: new Map(), catalogue: null, menuItems: [] };

test( 'link: an unresolvable draft hash is never written', () => {
	const [ item ] = link.decide( ctxFor( card() ) );
	assert.equal( item.status, 'no-setting' );
} );

test( 'link: a click row with no href takes the address its button already reaches; the button becomes visualOnly', () => {
	const items = link.decide( ctxFor( f( { tag: 'div', href: null, text: 'Row', layout: box( 0, 0, 300, 200 ), styles: { cursor: 'pointer' } } ) ) );
	assert.deepEqual( items[ 0 ].writes.map( ( w ) => w.attr ), [ 'sgsBlockLink', 'sgsBlockLinkLabel' ] );
	assert.equal( items[ 0 ].writes[ 0 ].value, '#register-interest' );
	assert.equal( items[ 1 ].ref, 'cr-ref-x-2' );
	assert.deepEqual( items[ 1 ].writes, [ { attr: 'visualOnly', value: true } ] );
} );

test( 'link: negative control, a plain container and an already linked card write nothing new', () => {
	assert.deepEqual( link.decide( ctxFor( f( { tag: 'div', href: null, styles: { cursor: 'auto' } } ) ) ), [] );
	const done = link.decide( ctxFor( f( { tag: 'div', href: null, text: 'Row', layout: box( 0, 0, 300, 200 ), styles: { cursor: 'pointer' } } ), { saved: { sgsBlockLink: '#register-interest', sgsBlockLinkLabel: 'Register' }, button: { visualOnly: true } } ) );
	assert.deepEqual( done.map( ( i ) => i.status ), [ 'equal' ] );
	assert.equal( live404.rows.length, 1 );
} );

test( 'link: a post grid whose draft cards are anchors takes cardLink', () => {
	const ctx = { target, draft: at( f( { childAnchors: 6 } ) ), live: at( f() ), saved: {}, block: 'sgs/post-grid', db, all: {} };
	assert.deepEqual( link.decide( ctx )[ 0 ].writes, [ { attr: 'cardLink', value: true } ] );
	assert.deepEqual( link.decide( { ...ctx, draft: at( f( { childAnchors: 0 } ) ) } ), [] );
} );

test( 'width: a gallery whose tiles are shorter than the draft takes tileMinHeight; equal tiles write nothing', () => {
	const draft = at( f( { items: { n: 10, w: 134, h: 130, parentW: 300 } } ) );
	const live = at( f( { items: { n: 10, w: 97, h: 36, parentW: 300 } } ) );
	const [ item ] = width.decide( { target, draft, live, saved: {}, block: 'sgs/gallery', db } );
	assert.deepEqual( item.writes[ 0 ], { attr: 'tileMinHeight', value: { desktop: '130px' } } );
	assert.deepEqual( item.checks.find( ( c ) => 1440 === c.width ), { width: 1440, items: 'h', want: '130px' } );
	assert.deepEqual( width.decide( { target, draft, live: draft, saved: {}, block: 'sgs/gallery', db } ), [] );
} );

test( 'width: a swipeable timeline card narrower than the track takes its share as cardWidth', () => {
	const draft = { 1440: f(), 768: f( { items: { n: 5, w: 349, h: 200, parentW: 688 } } ), 375: f( { items: { n: 5, w: 281, h: 200, parentW: 335 } } ) };
	const live = { 1440: f(), 768: f( { items: { n: 5, w: 320, h: 200, parentW: 688 } } ), 375: f( { items: { n: 5, w: 285, h: 200, parentW: 335 } } ) };
	const [ item ] = width.decide( { target, draft, live, saved: {}, block: 'sgs/timeline', db } );
	assert.deepEqual( item.writes[ 0 ].value, { tablet: 51, mobile: 84 } );
	assert.equal( width.decide( { target, draft, live: draft, saved: {}, block: 'sgs/timeline', db } ).length, 0 );
} );

test( 'width: a fill op checks the live track count against the draft', () => {
	const draft = at( f( { declared: 'repeat(auto-fit, minmax(240px, 1fr))', styles: { 'grid-template-columns': '100px 100px 100px' } } ) );
	const [ item ] = width.decide( { target, draft, live: at( f() ), saved: {}, block: 'sgs/container', db } );
	assert.deepEqual( item.checks.find( ( c ) => 1440 === c.width ), { width: 1440, prop: 'grid-template-columns', tracks: 3 } );
} );

test( 'link: a card with its own hover and hover on its children, and no link, takes hoverAsCard', async () => {
	const { recordIndex } = await import( '../lib/apply-records.mjs' );
	const hover = ( id ) => ( { id: `R${ id }`, element: { dc: 'Main', template_tpl_id: String( id ) }, trigger: { type: 'hover' }, properties: [] } );
	const recordsIndex = recordIndex( [ hover( 5 ), hover( 7 ) ], 'Main' );
	const t = { ref: 'cr-ref-x-1', tpl: 'Root/5#0', reach: [ 5, 6, 7 ] };
	const base = { target: t, draft: at( f() ), live: at( f() ), saved: {}, block: 'sgs/container', db, links: null, all: {}, recordsIndex };
	assert.deepEqual( link.decide( base )[ 0 ].writes, [ { attr: 'hoverAsCard', value: true } ] );
	assert.deepEqual( link.decide( { ...base, recordsIndex: recordIndex( [ hover( 5 ) ], 'Main' ) } ), [] );
	assert.deepEqual( link.decide( { ...base, saved: { sgsBlockLink: '/x/' } } ), [] );
	assert.deepEqual( link.decide( { ...base, saved: { hoverAsCard: true } } ), [] );
} );
