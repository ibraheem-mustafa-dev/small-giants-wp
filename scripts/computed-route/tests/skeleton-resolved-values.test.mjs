// The skeleton rules judge a value the draft writes as clamp(), var() or calc() by what the browser resolved it to at each
// width the element renders (lib/element-facts.mjs, the inventory's `resolved`), and the text properties an element inherits
// are its own. Without that, a clamp() heading size, a var() tracking or a bound section padding read as no value, so the
// heading, the label and the padded wrapper were judged wrong (re-applies 7d8ba89d7's rule). Each case MUST FAIL when its
// resolved read is ignored, and an element with no resolved read still falls back to what it declares.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { summarise } from '../lib/skeleton-inventory.mjs';
import { pxOf, renderedWidths, resolvedWidths, everyWidth, someWidth } from '../lib/element-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );

// E( tag, { words, style, resolved (one map for every width, or { width: map }), widths (where it renders), y }, kids ).
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
const WIDTHS = [ 375, 768, 1440 ];
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const shown = node.o.widths || WIDTHS;
		const attrs = node.o.style ? { style: node.o.style } : {};
		const words = node.o.words || '';
		const perWidth = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, shown.includes( w ) ? v( w ) : null ] ) );
		const resolved = node.o.resolved ? perWidth( ( w ) => ( node.o.resolved[ w ] ? node.o.resolved[ w ] : node.o.resolved ) ) : undefined;
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: perWidth( () => ( { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ) ),
			visible: Object.fromEntries( WIDTHS.map( ( w ) => [ w, shown.includes( w ) ] ) ), position: perWidth( () => node.o.position || 'static' ), display: node.o.display || 'block', flexDirection: 'row', screenshots: {},
			...( resolved ? { resolved } : {} ) };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, o = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db, ...o } );
const row = ( r, pred ) => r.proposal.rows.find( pred );
const byWords = ( r, w ) => row( r, ( x ) => x.words === w );
const section = ( kids ) => E( 'section', { display: 'block' }, kids );
const text = ( size, weight = '700' ) => ( { 'font-size': size, 'font-weight': weight } );

test( 'element-facts: a computed length reads as px, a keyword or expression as none, and a test runs at each width the element was read at', () => {
	assert.equal( pxOf( '22px' ), 22 );
	assert.equal( pxOf( 'normal' ), null );
	assert.equal( pxOf( 'clamp(22px, 2vw, 26px)' ), null );
	const e = { visible: { 375: true, 768: false, 1440: true }, resolved: { 375: { 'font-size': '22px' }, 768: null, 1440: { 'font-size': '26px' } } };
	assert.deepEqual( renderedWidths( e ), [ 375, 1440 ] );
	assert.deepEqual( resolvedWidths( e ), [ 375, 1440 ] );
	const size = ( min ) => ( r ) => pxOf( r[ 'font-size' ] ) >= min;
	const never = () => assert.fail( 'the declared reading is for an element with no computed read' );
	assert.equal( everyWidth( e, size( 22 ), never ), true );
	assert.equal( everyWidth( e, size( 24 ), never ), false, 'one width under the line fails it' );
	assert.equal( someWidth( e, size( 24 ), never ), true );
	assert.equal( someWidth( e, size( 30 ), never ), false );
	const bare = { visible: { 1440: true } };
	assert.equal( everyWidth( bare, never, () => true ), true, 'no computed read: the declared reading decides' );
	assert.equal( everyWidth( bare, never, () => false ), false );
	assert.equal( someWidth( { visible: { 1440: true }, resolved: { 1440: null } }, never, () => true ), true, 'a null read is no read' );
} );

test( 'cardHeading: a card title sized by clamp() is read at its resolved size at every width; a title too small at one width is not a heading; MUST FAIL without the resolved read', () => {
	const card = ( title, titleRes, y ) => E( 'div', { style: 'display:flex;flex-direction:column', y }, [
		E( 'div', { words: title, style: 'font-size:clamp(22px,2.2vw,26px);font-weight:700', resolved: titleRes } ),
		E( 'div', { words: `Quality ingredients ${ y }`, style: 'font-size:12px', resolved: text( '12px', '400' ) } ),
	] );
	const grid = E( 'div', { display: 'grid', style: 'display:grid' }, [
		card( 'What we supply', { 375: text( '22px' ), 768: text( '24px' ), 1440: text( '26px' ) }, 0 ),
		card( 'Why choose us', { 375: text( '14px' ), 768: text( '24px' ), 1440: text( '26px' ) }, 1 ),
		E( 'div', { style: 'display:flex;flex-direction:column', y: 2 }, [
			E( 'div', { words: 'Same size as its note', style: 'font-size:clamp(20px,2vw,22px);font-weight:700', resolved: text( '20px' ) } ),
			E( 'div', { words: 'A note of the same size', style: 'font-size:var(--note)', resolved: text( '20px', '400' ) } ),
		] ),
	] );
	const r = run( section( [ grid ] ) );
	assert.equal( byWords( r, 'What we supply' ).rule, 'cardHeading' );
	assert.equal( byWords( r, 'What we supply' ).block, 'sgs/heading' );
	assert.notEqual( byWords( r, 'Same size as its note' ).rule, 'cardHeading', 'negative control: the next text resolves to the same size' );
	assert.notEqual( byWords( r, 'Why choose us' ).rule, 'cardHeading', 'negative control: 14px at 375 is under the minimum size, so the title is no heading' );
} );

test( 'cardHeading: an element with no resolved read falls back to its declared size', () => {
	const card = E( 'div', { display: 'flex' }, [ E( 'div', { words: 'Food Service', style: 'font-weight:700;font-size:19px' } ), E( 'div', { words: 'Quality ingredients.', style: 'font-size:15px' } ) ] );
	assert.equal( byWords( run( section( [ card ] ) ), 'Food Service' ).rule, 'cardHeading' );
} );

test( 'label: tracking and a pill read from the resolved values; one that holds at some widths only is no label; MUST FAIL without the resolved read', () => {
	const kicker = ( words, resolved, style = 'letter-spacing:var(--track)' ) => E( 'span', { words, style, resolved } );
	const link = E( 'a', { y: 40 }, [ E( 'span', { words: 'Our Story', y: 40 } ), E( 'span', { words: 'Six decades of family heritage', y: 60 } ) ] );
	const tracked = { ...text( '16px', '400' ), 'letter-spacing': '2.24px', 'text-transform': 'none' };
	const plain = { ...text( '16px', '400' ), 'letter-spacing': 'normal', 'text-transform': 'none' };
	const page = section( [
		kicker( 'Call us', tracked ),
		kicker( 'Plain words', plain ),
		kicker( 'Only on desktop', { 375: plain, 768: plain, 1440: tracked } ),
		kicker( 'Capitals', { ...plain, 'text-transform': 'uppercase' }, 'text-transform:var(--caps)' ),
		kicker( 'Pill text', { ...plain, 'border-top-left-radius': '9999px', 'border-top-right-radius': '9999px', 'border-bottom-right-radius': '9999px', 'border-bottom-left-radius': '9999px', 'padding-top': '4px', 'padding-right': '12px', 'padding-bottom': '4px', 'padding-left': '12px' }, 'border-radius:var(--pill);padding:var(--pad)' ),
		kicker( 'Padded square', { ...plain, 'padding-top': '4px', 'padding-right': '12px', 'padding-bottom': '4px', 'padding-left': '12px' }, 'padding:var(--pad)' ),
		kicker( 'Round and empty', { ...plain, 'border-top-left-radius': '9999px', 'border-top-right-radius': '9999px', 'border-bottom-right-radius': '9999px', 'border-bottom-left-radius': '9999px' }, 'border-radius:var(--pill)' ),
		link,
	] );
	const r = run( page );
	assert.equal( byWords( r, 'Call us' ).block, 'sgs/label' );
	assert.equal( byWords( r, 'Capitals' ).block, 'sgs/label' );
	assert.equal( byWords( r, 'Pill text' ).block, 'sgs/label' );
	assert.notEqual( byWords( r, 'Plain words' ).block, 'sgs/label', 'negative control: no tracking, no capitals, no pill' );
	assert.notEqual( byWords( r, 'Only on desktop' ).block, 'sgs/label', 'tracking at one width only is no label' );
	assert.notEqual( byWords( r, 'Padded square' ).block, 'sgs/label', 'padding with square corners is no pill' );
	assert.notEqual( byWords( r, 'Round and empty' ).block, 'sgs/label', 'round corners with no padding is no pill' );
} );

test( 'alignWrapper: a wrapper whose padding is a token holds its resolved block padding and stays; one with none still goes; MUST FAIL without the resolved read', () => {
	const pad = ( top, bottom = top ) => ( { 'padding-top': top, 'padding-bottom': bottom, 'padding-left': '0px', 'padding-right': '0px' } );
	const wrap = ( heading, v, bottom = v ) => E( 'div', { style: 'text-align:center;padding:var(--section) 0', resolved: pad( v, bottom ) }, [ E( 'h2', { words: heading } ), E( 'p', { words: `${ heading } copy` } ) ] );
	const r = run( section( [ wrap( 'Padded band', '64px' ), wrap( 'Flat band', '0px' ), wrap( 'Top band', '48px', '0px' ), wrap( 'Bottom band', '0px', '48px' ) ] ) );
	const wrappers = r.proposal.rows.filter( ( x ) => 'div' === x.tag );
	assert.notEqual( wrappers[ 0 ].action, 'unwrap', 'the 64px block padding is space no block holds' );
	assert.equal( wrappers[ 1 ].action, 'unwrap', 'negative control: no resolved padding, the wrapper only aligns' );
	assert.equal( wrappers[ 1 ].rule, 'alignWrapper' );
	assert.notEqual( wrappers[ 2 ].action, 'unwrap', 'padding above alone is space' );
	assert.notEqual( wrappers[ 3 ].action, 'unwrap', 'padding below alone is space' );
} );

test( 'dotMarker: a dot sized by a token is a marker at its resolved size, a large one is not; MUST FAIL without the resolved read', () => {
	const dot = ( size ) => E( 'span', { style: 'width:var(--dot);height:var(--dot);border-radius:50%', resolved: 'string' === typeof size ? { width: size, height: size } : { 375: { width: size[ 0 ], height: size[ 0 ] }, 768: { width: size[ 1 ], height: size[ 1 ] }, 1440: { width: size[ 1 ], height: size[ 1 ] } } } );
	const bullet = ( w, size, y ) => E( 'div', { style: 'display:flex;gap:12px', y }, [ dot( size ), E( 'span', { words: w } ) ] );
	const r = run( section( [ bullet( 'Halal certified', '8px', 0 ), bullet( 'Big badge', '40px', 30 ), bullet( 'Big on a phone', [ '40px', '8px' ], 60 ) ] ) );
	const spans = r.proposal.rows.filter( ( x ) => 'span' === x.tag && ! x.words );
	assert.equal( spans[ 0 ].rule, 'dotMarker' );
	assert.equal( spans[ 0 ].action, 'remove' );
	assert.notEqual( spans[ 1 ].rule, 'dotMarker', 'negative control: 40px is no dot' );
	assert.notEqual( spans[ 2 ].rule, 'dotMarker', 'a dot at some widths only is no marker' );
} );

test( 'readingProgress: a fixed full-width bar whose height is a token reads its resolved height; a tall bar is not the progress bar; MUST FAIL without the resolved read', () => {
	const bar = ( h ) => E( 'div', { style: 'position:fixed;top:0;left:0;width:100%;height:var(--bar);background:#0A7EA8', position: 'fixed', resolved: { height: h } } );
	assert.equal( row( run( section( [ bar( '3px' ) ] ) ), ( x ) => 'div' === x.tag ).rule, 'readingProgress' );
	assert.notEqual( row( run( section( [ bar( '48px' ) ] ) ), ( x ) => 'div' === x.tag ).rule, 'readingProgress', 'negative control: 48px tall' );
} );

test( 'the inventory keeps the computed values of each element per width, and an element only a narrower width renders holds them at that width alone; MUST FAIL without the per-width assembly', () => {
	const rec = ( key, resolved, extra = {} ) => ( { i: 0, key, parentKey: null, tag: 'div', template: 'Root', tpl: 1, box: { x: 0, y: 0, w: 10, h: 10 }, visible: true, position: 'static', resolved, srcTag: 'div', ...extra } );
	const at = ( w ) => ( { 'font-size': `${ w / 10 }px` } );
	const runs = {
		1440: { records: [ rec( 'Root/1#0', at( 1440 ) ) ], rootName: 'Root', rootKey: 'Root/1#0', unstamped: [] },
		768: { records: [ rec( 'Root/1#0', at( 768 ) ), rec( 'Root/2#0', at( 768 ), { tpl: 2 } ) ], rootName: 'Root', rootKey: 'Root/1#0', unstamped: [] },
		375: { records: [ rec( 'Root/1#0', at( 375 ) ) ], rootName: 'Root', rootKey: 'Root/1#0', unstamped: [] },
	};
	const out = summarise( { runs, shots: {}, skipped: [], url: 'fixture', root: 'div' } );
	const both = out.elements.find( ( x ) => 'Root/1#0' === x.key );
	assert.deepEqual( both.resolved, { 375: at( 375 ), 768: at( 768 ), 1440: at( 1440 ) } );
	const only = out.elements.find( ( x ) => 'Root/2#0' === x.key );
	assert.deepEqual( only.resolved, { 375: null, 768: at( 768 ), 1440: null }, 'negative control: no value at a width it does not render' );
} );
