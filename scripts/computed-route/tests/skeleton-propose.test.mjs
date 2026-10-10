// The skeleton writer's proposal (Spec 47 §3.4, R-47-4, R-47-10): offline over the committed footer inventory
// (sites/eye-care-ward-end/build/skeleton/footer.inventory.json), with a fixture slice for the two draft shapes the hosted
// draft no longer has (a typed wordmark, a coming-soon line). Four generator rules, each from database queries and the
// standing decisions data, then the 13 uncertain rows of the first prototype scored against the choices the committed
// footer tree records (answer key below, each row citing its tree path).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { skeletonProblems, finderKind, expandSiteInfoRows, parseTplKey } from '../lib/fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const DIR = path.join( REPO, 'sites', CLIENT, 'build' );
const inventory = JSON.parse( fs.readFileSync( path.join( DIR, 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const committed = JSON.parse( fs.readFileSync( path.join( DIR, 'footer.tree.json' ), 'utf8' ) );
const db = openDb();
const SITE = 'Eye Care Birmingham';
const facts = ( siteName = SITE ) => loadFacts( { db, client: CLIENT, repo: REPO, siteName } );
const run = ( inv = inventory, o = {} ) => proposeSkeleton( { inventory: inv, facts: o.facts || facts(), surface: 'footer', db, ...o } );
const real = run();
const row = ( r, pred ) => r.proposal.rows.find( pred );
const byHref = ( r, re ) => row( r, ( x ) => re.test( inventory.elements.find( ( e ) => e.key === x.key )?.attrs?.href || '' ) );
const byWords = ( r, w, tag ) => row( r, ( x ) => x.words === w && ( ! tag || x.tag === tag ) );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const nodeAt = ( r, key ) => nodes( r.skeleton ).find( ( n ) => n.draftRef?.tpl === key );

// A fixture slice in the inventory's shape. el( key, parentKey, tag, words, extra ).
const el = ( key, parentKey, tag, words, x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: Number( /\/(\d+)#/.exec( key )[ 1 ] ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: x.snippet || `<${ tag } data-dc-tpl="${ /\/(\d+)#/.exec( key )[ 1 ] }">${ words }</${ tag }>`, box: { 375: x.box, 768: x.box, 1440: x.box }, visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const at = ( y ) => ( { x: 0, y, w: 100, h: 20 } );
// The old drafts: a typed wordmark in two parts above the tagline, and a Shop column ending in a coming-soon line.
const OLD = { checks: {}, source: 'fixture', root: 'footer', generated: 'fixture', elements: [
	el( 'Root/1#0', null, 'footer', '', { depth: 0, box: at( 0 ) } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, box: at( 0 ), display: 'grid' } ),
	el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2, box: at( 0 ), display: 'flex' } ),
	el( 'Root/4#0', 'Root/3#0', 'div', 'EYE CARE', { depth: 3, box: at( 0 ) } ),
	el( 'Root/5#0', 'Root/3#0', 'div', 'BIRMINGHAM', { depth: 3, box: at( 30 ) } ),
	el( 'Root/6#0', 'Root/3#0', 'p', 'Designer eyewear from an independent optician.', { depth: 3, box: at( 60 ) } ),
	el( 'Root/7#0', 'Root/2#0', 'div', '', { depth: 2, box: at( 0 ), display: 'flex' } ),
	el( 'Root/8#0', 'Root/7#0', 'span', 'Shop', { depth: 3, box: at( 0 ) } ),
	el( 'Root/9#0', 'Root/7#0', 'a', 'Sunglasses', { depth: 3, box: at( 30 ), attrs: { href: '#' } } ),
	el( 'Root/10#0', 'Root/7#0', 'a', 'All brands', { depth: 3, box: at( 60 ), attrs: { href: '#' } } ),
	el( 'Root/11#0', 'Root/7#0', 'a', 'Prescription lenses', { depth: 3, box: at( 90 ), attrs: { href: '#' } } ),
	el( 'Root/12#0', 'Root/7#0', 'span', 'Glasses — arriving soon', { depth: 3, box: at( 120 ) } ),
] };

// ---------- the four generator rules ----------
test( 'the standing decisions data is sound: its blocks exist, its patterns compile, the list block was found', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	assert.equal( facts().listSlug, db.prepare( "SELECT core_block_slug AS s FROM html_tag_to_core_block WHERE html_tag = 'ul'" ).get().s );
} );

test( 'rule a: a footer root is the section-root block whose capabilities list "footer", and its rows are the block it accepts', () => {
	const f = facts();
	const want = db.prepare( "SELECT c.block_slug AS s FROM block_capabilities c JOIN block_composition p ON p.block_slug = c.block_slug WHERE c.capability = 'footer' AND p.composition_role = 'section-root'" ).get().s;
	const accepts = JSON.parse( f.composition[ want ].accepts_allowed_blocks );
	const root = real.proposal.rows[ 0 ];
	assert.equal( root.block, want );
	assert.ok( root.candidates[ 0 ].evidence.some( ( t ) => /block_capabilities.*"footer"/.test( t ) ) );
	const rows = real.proposal.rows.filter( ( r ) => 1 === r.depth );
	assert.equal( rows.length, 2 );
	rows.forEach( ( r ) => assert.ok( accepts.includes( r.block ), `${ r.key } is ${ r.block }, which ${ want } accepts` ) );
	assert.deepEqual( real.skeleton[ 0 ].innerBlocks.map( ( n ) => n.name ), rows.map( ( r ) => r.block ) );
} );

test( 'rule b: a stacked run of bare text links is ONE list block; Site Info links read Site Info exactly as the committed tree encodes them', () => {
	const listBlocks = nodes( real.skeleton ).filter( ( n ) => n.name === facts().listSlug );
	assert.equal( listBlocks.length, 3, 'Shop, Help and Visit or call' );
	assert.deepEqual( listBlocks.map( ( n ) => n.attributes.items.length ), [ 3, 4, 4 ] );
	const visit = listBlocks[ 2 ].attributes.items;
	const treeVisit = nodes( committed ).find( ( n ) => 'cr-ref-footer-23' === n.attributes?.className ).attributes.items;
	const siteInfoOnly = ( it ) => ( { text: it.text, siteInfoSource: it.siteInfoSource, siteInfoLink: it.siteInfoLink } );
	assert.deepEqual( visit.slice( 1 ).map( siteInfoOnly ), treeVisit.slice( 1 ).map( siteInfoOnly ), 'phone, address and hours items match the committed tree item for item' );
	assert.equal( visit[ 0 ].text, treeVisit[ 0 ].text );
	// The links beside it that are NOT stacked stay separate links (Privacy and Terms sit side by side).
	assert.equal( byWords( real, 'Privacy', 'a' ).block, 'sgs/button' );
	assert.ok( ! listBlocks.some( ( n ) => n.attributes.items.some( ( it ) => 'Privacy' === it.text ) ) );
} );

test( 'rule c: a logo image is the logo block; a typed brand name (words equal the site name) is too, and its second part folds into it', () => {
	assert.equal( row( real, ( r ) => 'img' === r.tag ).block, 'sgs/responsive-logo' );
	const o = run( OLD );
	assert.equal( byWords( o, 'EYE CARE' ).block, 'sgs/responsive-logo' );
	assert.equal( byWords( o, 'BIRMINGHAM' ).action, 'absorbed' );
	assert.equal( byWords( o, 'BIRMINGHAM' ).into, 'Root/4#0' );
	assert.ok( ! nodes( o.skeleton ).some( ( n ) => n.draftRef?.tpl === 'Root/5#0' ), 'no block of its own' );
} );

test( 'rule d: a brief-only line is proposed as remove with its reason; the links around it stay one list', () => {
	const o = run( OLD );
	const gone = byWords( o, 'Glasses — arriving soon' );
	assert.equal( gone.action, 'remove' );
	assert.match( gone.reason, /coming-soon/ );
	const list = nodes( o.skeleton ).find( ( n ) => n.name === facts().listSlug );
	assert.deepEqual( list.attributes.items.map( ( i ) => i.text ), [ 'Sunglasses', 'All brands', 'Prescription lenses' ] );
} );

test( 'MUST FAIL: without the site name or the brief-only patterns the typed wordmark and the coming-soon line are not recognised', () => {
	const noName = run( OLD, { facts: facts( null ) } );
	assert.notEqual( byWords( noName, 'EYE CARE' ).block, 'sgs/responsive-logo', 'rule c needs the site name' );
	const f = facts();
	f.decisions = { ...f.decisions, briefOnlyLines: [] };
	const noPatterns = run( OLD, { facts: f } );
	assert.notEqual( byWords( noPatterns, 'Glasses — arriving soon' ).action, 'remove', 'rule d needs the data patterns' );
} );

// ---------- identity, structure and no style values ----------
test( 'every node names its draft element by a tpl finder that is an inventory key, except the Site Info row that needs selector strings', () => {
	const keys = new Set( inventory.elements.map( ( e ) => e.key ) );
	const kinds = {};
	nodes( real.skeleton ).forEach( ( n ) => {
		const k = finderKind( n.draftRef );
		kinds[ k ] = ( kinds[ k ] || 0 ) + 1;
		if ( 'tpl' === k ) {
			assert.ok( keys.has( n.draftRef.tpl ), n.draftRef.tpl );
			assert.ok( parseTplKey( n.draftRef.tpl ) );
			assert.ok( n.draftFingerprint?.tag );
		}
	} );
	assert.deepEqual( kinds, { tpl: nodes( real.skeleton ).length - 1, selector: 1 } );
	const social = nodes( real.skeleton ).find( ( n ) => 'sgs/social-icons' === n.name );
	assert.deepEqual( social.siteInfoRow, [ 'instagram', 'google', 'whatsapp' ] );
	assert.equal( expandSiteInfoRows( real.skeleton )[ 0 ].innerBlocks.length, 2 );
} );

test( 'the skeleton passes the skeleton rules and carries no style value (R-47-10)', () => {
	assert.deepEqual( skeletonProblems( real.skeleton ), [] );
	assert.deepEqual( lintSkeleton( real.skeleton, db ), [] );
	assert.deepEqual( real.problems, [] );
	assert.equal( real.proposal.counts.unresolved, 0 );
} );

test( 'a client decision is top evidence, and goes stale when the element under its key changed', () => {
	const key = byWords( real, 'Privacy', 'a' ).key;
	const decide = ( signature ) => ( { surfaces: { footer: { [ key ]: { block: 'sgs/text', signature } } } } );
	const hit = run( inventory, { clientDecisions: decide( 'a|Privacy' ) } );
	assert.equal( row( hit, ( r ) => r.key === key ).block, 'sgs/text' );
	assert.equal( row( hit, ( r ) => r.key === key ).source, 'client decision' );
	const stale = run( inventory, { clientDecisions: decide( 'a|Cookies' ) } );
	assert.equal( row( stale, ( r ) => r.key === key ).block, 'sgs/button', 'a stale decision is not applied' );
	assert.match( row( stale, ( r ) => r.key === key ).stale, /Cookies/ );
	const removed = run( inventory, { clientDecisions: { surfaces: { footer: { [ key ]: { remove: true, signature: 'a|Privacy' } } } } } );
	assert.equal( row( removed, ( r ) => r.key === key ).action, 'remove' );
} );

// ---------- the 13 uncertain rows ----------
// The first prototype's rows with confidence below 0.7, scored against what the committed footer tree records. `tree` is the
// path of the answer in footer.tree.json (i = innerBlocks index, items[n] = icon-list item n); `where` finds the element in
// the inventory (or the fixture, for the two shapes the hosted draft no longer has); `expect` is the answer; `got` reads ours.
const TREE = ( path ) => path.split( '.' ).reduce( ( n, p ) => ( /^items\[(\d+)\]$/.test( p ) ? n.attributes.items[ Number( /\d+/.exec( p )[ 0 ] ) ] : 'i' === p[ 0 ] ? n.innerBlocks[ Number( p.slice( 1 ) ) ] : n ), { innerBlocks: committed } );
const listItemOf = ( r, w ) => nodes( r.skeleton ).filter( ( n ) => n.name === 'sgs/icon-list' ).flatMap( ( n ) => n.attributes.items ).find( ( it ) => it.siteInfoSource === w );
const KEY = [
	{ n: 849, what: 'EYE CARE (typed wordmark)', run: () => run( OLD ), got: ( r ) => byWords( r, 'EYE CARE' ).block, expect: 'sgs/responsive-logo', tree: 'i0.i0.i0.i0', check: ( t ) => 'sgs/responsive-logo' === t.name },
	{ n: 850, what: 'BIRMINGHAM (typed wordmark)', run: () => run( OLD ), got: ( r ) => byWords( r, 'BIRMINGHAM' ).action, expect: 'absorbed', tree: 'i0.i0.i0', check: ( t ) => t.innerBlocks.map( ( c ) => c.name ).join() === 'sgs/responsive-logo,sgs/text,sgs/social-icons' },
	{ n: 852, what: 'the social icon row', got: ( r ) => row( r, ( x ) => 'div' === x.tag && x.block && 'sgs/social-icons' === x.block ).block, expect: 'sgs/social-icons', tree: 'i0.i0.i0.i2', check: ( t ) => 'sgs/social-icons' === t.name },
	{ n: 870, what: 'the WhatsApp icon', got: ( r ) => { const x = byHref( r, /wa\.me/ ); return `${ x.block } ${ x.attributes.brandName }`; }, expect: 'sgs/icon whatsapp', tree: 'i0.i0.i0.i2.i2', check: ( t ) => 'sgs/icon' === t.name && 'whatsapp' === t.attributes.brandName },
	{ n: 874, what: 'the Shop column label', got: ( r ) => byWords( r, 'Shop' ).block, expect: 'sgs/heading', tree: 'i0.i0.i1.i0', check: ( t ) => 'sgs/heading' === t.name && 'Shop' === t.attributes.content },
	{ n: 880, what: 'the Help column label', got: ( r ) => byWords( r, 'Help' ).block, expect: 'sgs/heading', tree: 'i0.i0.i2.i0', check: ( t ) => 'sgs/heading' === t.name && 'Help' === t.attributes.content },
	{ n: 886, what: 'the Visit or call column label', got: ( r ) => byWords( r, 'Visit or call' ).block, expect: 'sgs/heading', tree: 'i0.i0.i3.i0', check: ( t ) => 'sgs/heading' === t.name && 'Visit or call' === t.attributes.content },
	{ n: 878, what: 'Glasses, arriving soon (brief-only line)', run: () => run( OLD ), got: ( r ) => byWords( r, 'Glasses — arriving soon' ).action, expect: 'remove', tree: 'i0.i0.i1.i1', check: ( t ) => 'sgs/icon-list' === t.name && ! t.attributes.items.some( ( i ) => /soon/i.test( i.text ) ) && 3 === t.attributes.items.length },
	{ n: 888, what: 'the phone number', got: ( r ) => listItemOf( r, 'phone' ) && `list item phone${ listItemOf( r, 'phone' ).siteInfoLink ? ' linked' : '' }`, expect: 'list item phone', tree: 'i0.i0.i3.i1.items[1]', check: ( t ) => 'phone' === t.siteInfoSource },
	{ n: 889, what: 'the address', got: ( r ) => listItemOf( r, 'address' ) && `list item address${ listItemOf( r, 'address' ).siteInfoLink ? ' linked' : '' }`, expect: 'list item address linked', tree: 'i0.i0.i3.i1.items[2]', check: ( t ) => 'address' === t.siteInfoSource && true === t.siteInfoLink },
	{ n: 891, what: 'the opening hours', got: ( r ) => listItemOf( r, 'hours' ) && `list item hours${ listItemOf( r, 'hours' ).siteInfoLink ? ' linked' : '' }`, expect: 'list item hours linked', tree: 'i0.i0.i3.i1.items[3]', check: ( t ) => 'hours' === t.siteInfoSource && true === t.siteInfoLink },
	{ n: 893, what: 'the copyright line', got: ( r ) => { const x = row( r, ( q ) => /^©/.test( q.words ) ); return `${ x.block } ${ x.attributes.displayType } prefix "${ x.attributes.copyrightPrefix }"`; }, expect: 'sgs/business-info copyright prefix ""', tree: 'i0.i1.i0', check: ( t ) => 'sgs/business-info' === t.name && 'copyright' === t.attributes.displayType && '' === t.attributes.copyrightPrefix },
	{ n: 894, what: 'the Privacy and Terms wrapper', got: ( r ) => row( r, ( q ) => 'span' === q.tag && /Privacy/.test( inventory.elements.find( ( e ) => e.key === q.key )?.allText || '' ) ).block, expect: 'sgs/container', tree: 'i0.i1.i1', check: ( t ) => 'sgs/container' === t.name },
];

test( 'the answer key is the committed footer tree: each of the 13 rows names a tree path that holds the answer', () => {
	assert.equal( KEY.length, 13 );
	for ( const k of KEY ) {
		const node = TREE( k.tree );
		assert.ok( node && k.check( node ), `row ${ k.n } (${ k.what }): footer.tree.json path ${ k.tree } does not hold ${ k.expect }` );
	}
} );

test( 'MUST FAIL: the skeleton agrees with Bean\'s recorded choices on at least 12 of the 13 uncertain rows', ( t ) => {
	const scored = KEY.map( ( k ) => {
		const got = k.got( k.run ? k.run() : real );
		return { n: k.n, what: k.what, got, expect: k.expect, ok: got === k.expect };
	} );
	const hit = scored.filter( ( s ) => s.ok ).length;
	scored.forEach( ( s ) => t.diagnostic( `${ s.ok ? 'match' : 'DIFFERS' } row ${ s.n } ${ s.what }: ours ${ s.got }; Bean ${ s.expect }` ) );
	assert.ok( hit >= 12, `${ hit } of 13 match:\n${ scored.map( ( s ) => `${ s.ok ? 'yes' : 'NO ' } ${ s.n} ${ s.what }: got ${ s.got }, Bean ${ s.expect }` ).join( '\n' ) }` );
} );
