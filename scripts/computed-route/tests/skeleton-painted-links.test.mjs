// Two links stacked one above the next are a link list only when they are bare text links: a link that paints its own box (a
// background, a border: a pill) is a button wherever it stands (lib/skeleton-write-units.mjs::listLink). Indus's "What are you
// waiting for?" band stacks two call-to-action pills, each with an arrow glyph; the proposal made them one sgs/icon-list
// ("2 bare text links, one above the next") and the page showed two underlined links in a black box (2026-11-19).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const db = openDb();
const SHOWN = { 375: true, 768: true, 1440: true };
const boxAt = ( y, h = 40 ) => ( { 375: { x: 0, y, w: 240, h }, 768: { x: 0, y, w: 240, h }, 1440: { x: 0, y, w: 240, h } } );
const tplOf = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words, x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: tplOf( key ), attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ tplOf( key ) }">${ words }</${ tag }>`, box: x.box ?? boxAt( 0, 200 ), visible: SHOWN, display: x.display ?? 'block', flexDirection: 'row', screenshots: {} } );

const inventory = () => ( {
	generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 },
	elements: [
		el( 'Root/1#0', null, 'main', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'div', '', { display: 'flex' } ),
		el( 'Root/3#0', 'Root/2#0', 'a', 'Apply for an account', { depth: 2, attrs: { href: '#/apply' }, box: boxAt( 0 ) } ),
		el( 'Root/4#0', 'Root/3#0', 'svg', '', { depth: 3, box: boxAt( 12, 15 ) } ),
		el( 'Root/5#0', 'Root/2#0', 'a', 'Request the catalogue', { depth: 2, attrs: { href: '#/catalogue' }, box: boxAt( 60 ) } ),
		el( 'Root/6#0', 'Root/5#0', 'svg', '', { depth: 3, box: boxAt( 72, 15 ) } ),
	],
} );
const tpl = ( tag, parent, style = [] ) => ( { realTag: tag, attrs: {}, style: { static: style, holes: [] }, holes: [], membership: { scIf: [], scFor: [] }, parent, realParent: parent, parentChain: parent ? [ parent ] : [] } );
const entry = ( tag, parent, style ) => ( { template: tpl( tag, parent, style ), surfaces: [], logic: { holes: {} } } );
const PILL = [ [ 'background', '#000000' ], [ 'border-radius', '999px' ], [ 'padding', '15px 26px' ] ];
const RECORD = ( style ) => ( {
	surfaces: { 'S-1': { id: 'S-1', kind: 'page', name: 'Home', dc: 'Site', parent: null, roots: [ 'Site/1' ], parts: [] } },
	elements: {
		'Site/1': entry( 'main', null ), 'Site/2': entry( 'div', 'Site/1' ),
		'Site/3': entry( 'a', 'Site/2', style ), 'Site/4': entry( 'svg', 'Site/3' ),
		'Site/5': entry( 'a', 'Site/2', style ), 'Site/6': entry( 'svg', 'Site/5' ),
	},
} );
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), siteName: 'Planted' } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const names = ( style ) => nodes( proposeSkeleton( { inventory: inventory(), facts: facts(), surface: 'home', surfaceKind: 'page', surfaceName: 'Home', db, rootComponent: 'Site', factRecord: RECORD( style ), openers: {} } ).skeleton ).map( ( n ) => n.name );

test( 'MUST FAIL: two stacked links that paint their own pill are two buttons, not a link list', () => {
	const got = names( PILL );
	assert.equal( got.filter( ( n ) => n === facts().listSlug ).length, 0, got.join( ', ' ) );
	assert.equal( got.filter( ( n ) => 'sgs/button' === n ).length, 2, got.join( ', ' ) );
} );

test( 'negative control: the same two stacked links with no paint of their own stay one link list', () => {
	assert.equal( names( [] ).filter( ( n ) => n === facts().listSlug ).length, 1 );
} );
