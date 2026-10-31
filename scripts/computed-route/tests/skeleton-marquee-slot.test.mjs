// The marquee rule (Spec 48 §3.4, FR-48-6; lib/skeleton-rules.mjs, rules.marquee) chooses its block by what the strip's items
// show and where the strip sits: logos alone are the logo block (sgs/brand-strip); labels, alone or each with an icon or an
// image, are the trust bar's items when its item fields hold every kind shown (`array_item_schema` roles) and the section
// block fits there; otherwise the labels are the brand strip's text items. A section block never sits inside another
// section and sits only in a slot that gives it its full width (Bean 2026-10-31): a header row, the footer's top row, a
// drawer's or modal's body; never one of a row's columns, never a page section's own container.
// MUST FAIL on the slice of Eye Care's real header inventory and fact record (tests/fixtures/skeleton-identity/ec-header.json:
// the Lucide-icon ticker above the header's main bar, read against the committed draft) and on synthetic surfaces. Negative
// controls: a logo marquee stays the brand strip, and a label marquee inside a page section's container or in a footer
// column keeps the brand strip's text items.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const db = openDb();
const facts = () => {
	const f = loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
	f.decisions = structuredClone( f.decisions );
	return f;
};
const flat = ( nodes ) => nodes.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const hashOf = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );

const EC = 'Eye Care Birmingham';
test( "MUST FAIL: Eye Care's header ticker (Lucide icons beside labels, looping below 768) in the header's top row is sgs/trust-bar", () => {
	const fix = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'skeleton-identity', 'ec-header.json' ), 'utf8' ) );
	const sources = { files: { [ fix.draft ]: hashOf( path.join( REPO, 'sites', fix.client, 'handoff', fix.draft ) ) } };
	const r = proposeSkeleton( { inventory: fix.inventory, facts: loadFacts( { db, client: fix.client, repo: REPO } ), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db, rootComponent: fix.inventory.checks.rootName, motion: new Set( [ `${ EC }/8` ] ), factRecord: { schema: '1', client: fix.client, elements: fix.record, surfaces: {}, sources } } );
	const row = r.proposal.rows.find( ( x ) => `${ EC }/8#0` === x.key );
	assert.deepEqual( [ row.block, row.rule ], [ 'sgs/trust-bar', 'marquee' ], row.reason );
	assert.ok( row.confidence >= 0.7, `the identity check keeps it: ${ row.reason }` );
	assert.equal( r.proposal.rows.find( ( x ) => `${ EC }/7#0` === x.key ).block, 'sgs/site-header-row', "it fills the header's top row" );
	assert.deepEqual( [ 0, 1, 2, 3 ].map( ( i ) => r.proposal.rows.find( ( x ) => `${ EC }/10#${ i }` === x.key ).action ), [ 'absorbed', 'absorbed', 'absorbed', 'absorbed' ], "the items it shows at every width are the bar's" );
	assert.equal( flat( r.skeleton ).filter( ( n ) => 'sgs/brand-strip' === n.name ).length, 0 );
} );

// Synthetic surfaces. A box is the same at every width.
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const box = ( x, y, w, h = 40 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: x.all ?? words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || box( 0, 0, 1200 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const LABELS = [ 'Free delivery over £75', 'Glazed here in 7 days', '30 days to return', 'Free delivery over £75', 'Glazed here in 7 days', '30 days to return' ];
// The strip (Root/8, looping) under `parent`: items that are labels with an svg icon, logos (an image, no words) or plain labels.
const strip = ( parent, depth, kind = 'icons', w = 1200, x = 0 ) => [
	el( 'Root/8#0', parent, 'div', '', { depth, display: 'flex', box: box( x, 0, w ) } ),
	...LABELS.flatMap( ( t, i ) => [
		el( `Root/10#${ i }`, 'Root/8#0', 'logos' === kind ? 'a' : 'span', 'logos' === kind ? '' : t, { depth: depth + 1, loop: 9, box: box( x + i * 200, 0, 190 ), all: 'logos' === kind ? '' : t } ),
		...( 'icons' === kind ? [ el( `Root/11#${ i }`, `Root/10#${ i }`, 'svg', '', { depth: depth + 2, loop: 9, box: box( x + i * 200, 0, 15, 15 ) } ) ] : [] ),
		...( 'logos' === kind ? [ el( `Root/11#${ i }`, `Root/10#${ i }`, 'img', '', { depth: depth + 2, loop: 9, attrs: { src: 'logo.png', alt: '' }, box: box( x + i * 200, 0, 120, 40 ) } ) ] : [] ),
	] ),
];
const run = ( elements, surfaceKind ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', surfaceKind, commerce: null, loops: { rows: [], brands: [] }, motion: new Set( [ 'Root/8' ] ), db } );
const stripRow = ( r ) => r.proposal.rows.find( ( x ) => 'Root/8#0' === x.key );

// A drawer or modal: root > body (full width) > strip.
const body = ( kind ) => [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1 } ), ...strip( 'Root/2#0', 2, kind ) ];
// A footer whose top row holds the strip alone, and one whose columns row holds it in its second column.
const footerTop = [ el( 'Root/1#0', null, 'footer', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1 } ), ...strip( 'Root/2#0', 2 ) ];
const footerColumn = [
	el( 'Root/1#0', null, 'footer', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'grid' } ),
	el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2, box: box( 0, 0, 590, 200 ) } ),
	el( 'Root/4#0', 'Root/3#0', 'p', 'About the shop and the people who run it', { depth: 3, box: box( 0, 0, 590, 40 ) } ),
	el( 'Root/5#0', 'Root/2#0', 'div', '', { depth: 2, box: box( 610, 0, 590, 200 ) } ),
	...strip( 'Root/5#0', 3, 'icons', 590, 610 ),
];

test( 'MUST FAIL: a ticker in a drawer or modal body, or alone in a footer row, has its full width: sgs/trust-bar', () => {
	for ( const [ kind, elements ] of [ [ 'drawer', body() ], [ 'modal', body() ], [ 'footer', footerTop ] ] ) {
		assert.equal( stripRow( run( elements, kind ) ).block, 'sgs/trust-bar', kind );
	}
} );

test( "negative control: a ticker in a footer column, a label marquee inside a page section's container and a logo marquee are not the trust bar", () => {
	assert.equal( stripRow( run( footerColumn, 'footer' ) ).block, 'sgs/brand-strip', "one of a row's columns is no full-width slot" );
	const inSection = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ), el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2 } ), ...strip( 'Root/3#0', 3, 'labels' ) ];
	const page = stripRow( run( inSection, 'page' ) );
	assert.equal( page.block, 'sgs/brand-strip', 'the section guard holds on a page' );
	assert.equal( page.handover.detail, 'the labels of this strip: add each as a brand name' );
	for ( const kind of [ 'drawer', 'header' ] ) {
		assert.equal( stripRow( run( body( 'logos' ), kind ) ).block, 'sgs/brand-strip', `logos alone stay the brand strip (${ kind })` );
	}
	const pageLevel = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), ...strip( 'Root/1#0', 1, 'labels' ) ];
	assert.equal( stripRow( run( pageLevel, 'page' ) ).block, 'sgs/trust-bar', "control: a page's own section of labels is still the trust bar" );
} );
