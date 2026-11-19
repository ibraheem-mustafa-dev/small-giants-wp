// A bare wrapper whose children are exactly one link list is the list block (rule listWrapper), so the list block's own
// box is that wrapper (lib/skeleton-write-units.mjs::buildList host): Indus's footer quick links are a two-column grid of
// links, and with the first link as the list's draft element the list's columns setting never read the grid (one column
// on the page, 2026-11-19). The first link stays the link part's element.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const db = openDb();
const SHOWN = { 375: true, 768: true, 1440: true };
const boxAt = ( y, h = 24 ) => ( { 375: { x: 0, y, w: 240, h }, 768: { x: 0, y, w: 240, h }, 1440: { x: 0, y, w: 240, h } } );
const tplOf = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words, x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: tplOf( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ tplOf( key ) }">${ words }</${ tag }>`, box: x.box ?? boxAt( 0, 200 ), visible: SHOWN, display: x.display ?? 'block', flexDirection: 'row', screenshots: {} } );
const link = ( n, words, y ) => el( `Root/${ n }#0`, 'Root/3#0', 'a', words, { depth: 3, attrs: { href: `#/${ words.toLowerCase() }` }, box: boxAt( y ) } );
const inventory = () => ( {
	generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 },
	elements: [
		el( 'Root/1#0', null, 'main', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'div', '' ),
		el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2, display: 'grid' } ),
		link( 4, 'Certifications', 0 ), link( 5, 'Trade', 30 ), link( 6, 'Brands', 60 ),
	],
} );
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), siteName: 'Planted' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );

test( 'MUST FAIL: a list wrapper that is the list block is the list\'s draft element', () => {
	const r = proposeSkeleton( { inventory: inventory(), facts: facts(), surface: 'footer', surfaceKind: 'page', surfaceName: 'Fixture', db } );
	const list = nodes( r.skeleton ).find( ( n ) => n.name === facts().listSlug );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/3#0' === x.key ).rule, 'listWrapper' );
	assert.equal( list?.draftRef?.tpl, 'Root/3#0' );
	assert.deepEqual( list.attributes.items.map( ( i ) => i.text ), [ 'Certifications', 'Trade', 'Brands' ] );
} );
