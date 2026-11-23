// A dot that leads a line of words is the label's own dot (lib/skeleton-rules.mjs, the label rule's leadingDot and dotLine;
// data/skeleton-decisions.json rules.label.leadingDot). A product page's stock line draws <div style="display:flex;gap:9px;
// font-size:14px;color:…"><span style="width:8px;height:8px;border-radius:50%;background:…"></span>In stock — dispatched next
// working day</div>: the line was an sgs/text, a leaf, that absorbed the dot, so the dot's radius, width and fill were read by
// nothing (a paint conservation problem) and the clone drew no dot. Now the line is an sgs/label with its dot on and its words
// kept, and the absorbed dot is read at the label's leading layer, the `::before` its dot settings paint
// (lib/skeleton-conserve-slots.mjs::absorbedSlots, leadingLooks, leadingMark), which the skeleton lint lets a slot name
// (lib/fill-skeleton.mjs::skeletonProblems) and Fill reads from the dot's own element. Stacked rows of a dot and words stay
// one list (Bean, 2026-10-19). The Fill test runs on the block's checked-in record (tests/fixtures/records/mamas-munches-redesign/label.record.json.gz) and is skipped
// without it. No site, no browser.
// Mutation list: tests/skeleton-leading-dot.mutations.json.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { absorbedSlots, leadingLooks, leadingMark, LEADING_LAYER } from '../lib/skeleton-conserve-slots.mjs';
import { skeletonNodes, skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { addRefs } from '../lib/tree.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { FIXTURE_RECORDS } from '../tools/record-fixtures.mjs';

const test = nodeTest;
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	return f;
};
const WIDTHS = [ 375, 768, 1440 ];

// A fixture tree: E( tag, { words, style, box, resolved }, children ) -> an inventory (keys Root/<n>#0) with each element's box
// and browser read at every width.
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: node.o.style ? { style: node.o.style } : {}, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: `<${ node.tag } data-dc-tpl="${ id }">${ node.o.wordsFirst ? words : '' }${ node.kids.map( ( k ) => `<${ k.tag }></${ k.tag }>` ).join( '' ) }${ node.o.wordsFirst ? '' : words }</${ node.tag }>`,
			box: Object.fromEntries( WIDTHS.map( ( w ) => [ w, node.o.box || { x: 0, y: node.o.y ?? 0, w: 300, h: 21 } ] ) ),
			resolved: node.o.resolved ? Object.fromEntries( WIDTHS.map( ( w ) => [ w, node.o.resolved ] ) ) : undefined,
			position: Object.fromEntries( WIDTHS.map( ( w ) => [ w, node.o.position || 'static' ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
// The label's calibrated settings at its leading layer (the shape cache/label.json holds): the dot's colour there, its size
// read at the root and the layer, and the gradient border every block paints on its `::before`.
const LABEL = { dotColour: { slot: '::before', slots: [ '::before' ], property: 'background-color', state: null }, dotSize: { slot: '', slots: [ '', '::before' ], property: 'height', state: null }, borderColourGradient: { slot: '::before', property: 'background-image', state: null } };
const run = ( root ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db, calSettings: ( b ) => ( 'sgs/label' === b ? LABEL : {} ) } );
const row = ( r, words ) => r.proposal.rows.find( ( x ) => x.words === words );
const nodeOf = ( r, key ) => {
	const walk = ( list ) => list.flatMap( ( n ) => [ n, ...walk( n.innerBlocks || [] ) ] );
	return walk( r.skeleton ).find( ( n ) => n.draftRef?.tpl === key );
};

const WORDS = 'In stock — dispatched next working day';
const LINE = { 'font-size': '14px', height: '21px', 'padding-left': '0px' };
const dot = ( x = 0 ) => E( 'span', { style: 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#1B7F43', box: { x, y: 6, w: 8, h: 8 } } );
const line = ( o = {} ) => E( 'div', { words: o.words ?? WORDS, wordsFirst: o.wordsFirst, style: 'display:flex;align-items:center;gap:9px;font-size:14px;color:#1B7F43', resolved: { ...LINE, ...( o.resolved || {} ) }, box: o.box, y: o.y }, [ o.dot ?? dot() ] );
const section = ( kids ) => E( 'section', { box: { x: 0, y: 0, w: 1000, h: 400 } }, kids );

test( 'MUST FAIL: a line of words led by a dot is a label with its dot on and its words, and the dot is read at its leading layer', () => {
	const r = run( section( [ line() ] ) );
	const l = row( r, WORDS );
	assert.deepEqual( [ l.block, l.rule ], [ 'sgs/label', 'label' ], 'a dot line is a label, not a text that drops its dot' );
	const node = nodeOf( r, l.key );
	assert.equal( node.attributes.dot, true, 'the label draws its dot' );
	assert.equal( node.attributes.text, WORDS, 'the label keeps its own words beside the dot it draws' );
	const d = r.proposal.rows.find( ( x ) => x.parentKey === l.key || x.into === l.key );
	assert.equal( d.action, 'absorbed' );
	assert.deepEqual( node.draftSlots?.[ LEADING_LAYER ], { tpl: d.key }, 'the dot is read at the label\'s leading layer' );
	assert.deepEqual( r.problems.filter( ( p ) => p.includes( d.key ) ), [], 'no conservation problem names the dot' );
} );

test( 'negative control: stacked rows of a dot and words, a dot after the words and a line that wraps are no dot labels', () => {
	const rows = run( section( [ line( { words: 'Free delivery over fifty pounds today', y: 0 } ), line( { words: 'Easy returns within thirty days always', y: 30 } ) ] ) );
	assert.notEqual( row( rows, 'Free delivery over fifty pounds today' ).rule, 'label', 'a run of dot rows is a list, never labels (Bean, 2026-10-19)' );
	// Dot rows laid out in a grid's columns (side by side, so no stacked list takes them) are rows of one list too.
	const ruled = ( words, x ) => E( 'div', { words, style: 'display:flex;gap:12px;padding:13px 0;border-top:1px solid #ccc;font-size:15px', resolved: { 'font-size': '15px', height: '21px', 'padding-left': '0px' }, box: { x, y: 0, w: 300, h: 21 } }, [ dot( x ) ] );
	const grid = E( 'div', { display: 'grid', box: { x: 0, y: 0, w: 700, h: 21 } }, [ ruled( 'Fresh bread every morning', 0 ), ruled( 'Open late on Fridays', 400 ) ] );
	const cols = run( section( [ grid ] ) );
	assert.deepEqual( [ 'Fresh bread every morning', 'Open late on Fridays' ].map( ( w ) => row( cols, w ).block ), [ 'sgs/icon-list', 'sgs/icon-list' ], 'dot rows in a grid stay one list' );
	const after = run( section( [ line( { dot: dot( 292 ), wordsFirst: true } ) ] ) );
	assert.notEqual( row( after, WORDS ).rule, 'label', 'a dot after the words leads nothing' );
	const wraps = run( section( [ line( { resolved: { height: '42px' } } ) ] ) );
	assert.notEqual( row( wraps, WORDS ).rule, 'label', 'a line on two lines is no label' );
} );

test( 'MUST FAIL: the leading layer is a part only of a block whose settings size it, and only its first, empty, in-flow, smaller child', () => {
	const label = LABEL;
	assert.deepEqual( [ ...leadingLooks( label ) ].sort(), [ 'background', 'height' ] );
	assert.deepEqual( [ ...leadingLooks( { borderColourGradient: label.borderColourGradient } ) ], [], 'a layer the box sizes (the gradient border) is no mark' );
	const box = ( w, h, x = 0 ) => ( { 375: { x, y: 0, w, h }, 768: { x, y: 0, w, h }, 1440: { x, y: 0, w, h } } );
	const vis = { 375: true, 768: true, 1440: true };
	const host = { key: 'h', words: WORDS, box: box( 300, 21 ), visible: vis };
	const mark = { key: 'd', words: '', box: box( 8, 8 ), visible: vis, position: {} };
	const kidsOf = ( list ) => ( e ) => ( e === host ? list : [] );
	assert.equal( leadingMark( host, kidsOf( [ mark ] ) ), mark );
	assert.equal( leadingMark( host, kidsOf( [ { ...mark, words: 'x' } ] ) ), null, 'a child with words is no mark' );
	assert.equal( leadingMark( host, kidsOf( [ { ...mark, position: { 375: 'absolute' } } ] ) ), null, 'an out-of-flow child is no mark' );
	assert.equal( leadingMark( host, kidsOf( [ { ...mark, box: box( 300, 21 ) } ] ) ), null, 'a child as big as its host is a layer, no mark' );
	const slots = ( settings, leading = true ) => absorbedSlots( { host, node: {}, absorbed: [ { element: mark, looks: [ 'background', 'radius', 'width' ] } ], kids: kidsOf( [ mark ] ), finder: ( e ) => ( { tpl: e.key } ), settings, leading } );
	assert.deepEqual( slots( label ).slots, { '::before': { tpl: 'd' } } );
	assert.deepEqual( slots( { borderColourGradient: label.borderColourGradient } ).slots, {}, 'negative control: no mark part without a sized leading layer' );
	assert.deepEqual( slots( label, false ).slots, {}, 'negative control: a host whose verdict does not draw its leading layer reads no mark there' );
} );

test( 'MUST FAIL: the skeleton lint lets the leading layer name a draft element of its own, and still refuses every other pseudo slot', () => {
	const tree = ( slots ) => [ { name: 'sgs/label', draftRef: { tpl: 'Root/2#0' }, draftSlots: slots, attributes: { dot: true }, innerBlocks: [] } ];
	assert.deepEqual( skeletonProblems( tree( { '::before': { tpl: 'Root/3#0' } } ) ), [] );
	assert.match( skeletonProblems( tree( { '::before': { tpl: 'Root/2#0' } } ) ).join( '\n' ), /names a pseudo layer/, 'the node\'s own element: its layer is read from it' );
	assert.match( skeletonProblems( tree( { '::after': { tpl: 'Root/3#0' } } ) ).join( '\n' ), /names a pseudo layer/ );
	assert.match( skeletonProblems( tree( { '.x::before': { tpl: 'Root/3#0' } } ) ).join( '\n' ), /names a pseudo layer/ );
} );

// Fill on the label's checked-in record: the dot's own element read at the label's leading layer writes the dot's colour and size.
// The checked-in record (tests/fixtures/records/mamas-munches-redesign/label.record.json.gz, tools/record-fixtures.mjs).
const CAL = loadCalibration( FIXTURE_RECORDS, 'sgs/label', 'mamas-munches-redesign' );
nodeTest( 'MUST FAIL: Fill reads the dot element at the leading layer into the label\'s dot colour and size', () => {
	const sk = [ { name: 'sgs/label', draftRef: '.line', draftSlots: { [ LEADING_LAYER ]: '.dot' }, attributes: { text: WORDS, dot: true }, innerBlocks: [] } ];
	const nodes = skeletonNodes( sk );
	const el = ( styles, rect ) => ( { styles, pseudo: {}, rect, inFlow: true, words: '', href: null } );
	const TEXT = { display: 'flex', color: 'rgb(27, 127, 67)', 'font-size': '14px', 'line-height': '21px' };
	const DOT = { display: 'block', 'background-color': 'rgb(27, 127, 67)', width: '8px', height: '8px', 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%' };
	const widths = Object.fromEntries( [ 375, 768, 1440, 1024, 1920 ].map( ( w ) => [ w, { '0:': el( TEXT, { x: 0, y: 0, w: 300, h: 21 } ), [ `0:${ LEADING_LAYER }` ]: el( DOT, { x: 0, y: 6, w: 8, h: 8 } ) } ] ) );
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const declared = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { [ `0:${ LEADING_LAYER }` ]: { width: '8px', height: '8px', 'border-radius': '50%', background: 'rgb(27, 127, 67)' } } ] ) );
	fillTree( { tree, nodes, reads: { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } }, calFor: ( b ) => ( 'sgs/label' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const a = tree[ 0 ].attributes;
	assert.match( String( a.dotColour ), /^(?:#1b7f43|rgb\(27, 127, 67\))$/i, JSON.stringify( a ) );
	assert.equal( a.dotSize, '8px', JSON.stringify( a ) );
} );
