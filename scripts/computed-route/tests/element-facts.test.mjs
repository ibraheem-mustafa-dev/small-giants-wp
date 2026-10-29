// RC14: every skeleton rule reads an element's facts through one reader (lib/element-facts.mjs), each fact from where it
// lives: attributes and every event binding from the fact record in full, declared styles from the record, resolved values
// per width from the inventory's browser read. Proven on the real drafts (sites/<client>/build/intake: 206 clamp() font sizes
// on one draft read as no size; 308, 173 and 71 snippets whose opening tag is cut; every onChange, onSubmit and onMouseEnter
// binding invisible to the snippet's click regex). Each case MUST FAIL on the string reads and has a negative control. The lint
// that refuses a skeleton module reading the snippet or the raw style attribute is proven in tests/lint-skeleton-reads.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { recordView } from '../lib/skeleton-record.mjs';
import { elementFacts, acrossWidths, pxOf } from '../lib/element-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );
const W = [ 375, 768, 1440 ];
const each = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, 'function' === typeof v ? v( w ) : v ] ) );
const TEXT = { 'font-size': '16px', 'font-weight': '400', 'letter-spacing': 'normal', 'text-transform': 'none', 'line-height': 'normal', width: 'auto', height: 'auto', 'border-top-left-radius': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px' };

// An inventory element and its fact record entry. o: { words, parent, depth, resolved (per width overrides), attrs (the
// record's template attributes), style (record longhands), snippet, box, visible }.
function el( n, tag, o = {} ) {
	const key = `Site/${ n }#0`;
	const inv = {
		key, parentKey: o.parent ? `Site/${ o.parent }#0` : null, depth: o.depth ?? ( o.parent ? 1 : 0 ), tag, template: 'Site', tpl: n, attrs: o.rendered || {}, words: o.words || '', allText: o.all ?? o.words ?? '',
		membership: [], srcTag: tag, srcOwnText: o.words || '', snippet: o.snippet ?? `<${ tag } data-dc-tpl="${ n }">${ o.words || '' }</${ tag }>`,
		box: each( o.box || { x: 0, y: n * 30, w: 200, h: 24 } ), visible: each( ( w ) => o.visible?.[ w ] ?? true ), position: each( 'static' ), display: 'block', flexDirection: 'row',
		resolved: each( ( w ) => ( { ...TEXT, ...( o.resolved?.[ w ] ?? o.resolved?.all ?? {} ) } ) ), screenshots: {},
	};
	const attrs = o.attrs || {};
	const rec = {
		template: {
			key: `Site/${ n }`, component: 'Site', n: String( n ), tag, realTag: tag, attrs, style: { static: Object.entries( o.style || {} ), holes: [] }, holes: [],
			parent: o.parent ? `Site/${ o.parent }` : null, realParent: o.parent ? `Site/${ o.parent }` : null, parentChain: o.parent ? [ `Site/${ o.parent }` ] : [],
			membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, events: Object.entries( attrs ).filter( ( [ a ] ) => /^on[A-Z]/.test( a ) ).map( ( [ name, v ] ) => ( { name, expr: /\{\{\s*(.*?)\s*\}\}/.exec( v )?.[ 1 ] ?? null } ) ), words: o.words || '',
		},
		logic: { holes: {} }, surfaces: [],
	};
	return { inv, rec };
}
function propose( list ) {
	const inventory = { checks: {}, source: 'fixture', root: 'section', generated: 'fixture', elements: list.map( ( x ) => x.inv ) };
	const factRecord = { schema: '1', client: 'fixture-client', surfaces: {}, sources: null, elements: Object.fromEntries( list.map( ( x ) => [ x.rec.template.key, x.rec ] ) ) };
	return proposeSkeleton( { inventory, facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, factRecord, openers: {} } );
}
const rowOf = ( r, words ) => r.proposal.rows.find( ( x ) => x.words === words );

// A card: a title and a line of body text under one holder (the shape of the real draft's service cards).
const card = ( title, body = {} ) => [
	el( 1, 'section', { words: '' } ),
	el( 2, 'div', { parent: 1 } ),
	el( 3, 'p', { parent: 2, depth: 2, words: 'Wholesale supply', style: { 'font-size': 'clamp(18px, 1.7vw, 22px)', 'font-weight': '700' }, ...title } ),
	el( 4, 'p', { parent: 2, depth: 2, words: 'Fresh stock delivered across the region every week.', resolved: { all: { 'font-size': '16px' } }, ...body } ),
];

test( 'MUST FAIL (clamp size): a card\'s bold first text sized with clamp() is its heading, read at its resolved size at every width; negative control: resolved below the rule\'s size it is not', () => {
	const big = propose( card( { resolved: { 375: { 'font-size': '18px', 'font-weight': '700' }, 768: { 'font-size': '18px', 'font-weight': '700' }, 1440: { 'font-size': '22px', 'font-weight': '700' } } } ) );
	assert.equal( rowOf( big, 'Wholesale supply' ).rule, 'cardHeading', 'the clamp() size resolves to 18 to 22px, at least the rule\'s 17px, and above the 16px body' );
	assert.equal( rowOf( big, 'Wholesale supply' ).widthDependent, undefined );
	const small = propose( card( { resolved: { all: { 'font-size': '15px', 'font-weight': '700' } } }, { resolved: { all: { 'font-size': '12px' } } } ) );
	assert.notEqual( rowOf( small, 'Wholesale supply' ).rule, 'cardHeading', 'negative control: a bold line resolved at 15px, under the rule\'s 17px, is no heading even above 12px body text' );
} );

test( 'MUST FAIL (inherited size): a card\'s first text that declares no size of its own takes the size it inherits, from the browser read', () => {
	const inherited = propose( card( { style: { 'font-weight': '700' }, resolved: { all: { 'font-size': '20px', 'font-weight': '700' } } } ) );
	assert.equal( rowOf( inherited, 'Wholesale supply' ).rule, 'cardHeading' );
} );

test( 'MUST FAIL (width ruling): a verdict that holds at some widths only goes to the review marked width-dependent; negative control: one that holds at every width is final', () => {
	const kicker = ( resolved ) => propose( [ el( 1, 'section' ), el( 2, 'span', { parent: 1, words: 'New season', resolved } ), el( 3, 'p', { parent: 1, words: 'A longer line of body text sits under the kicker here.' } ) ] );
	const phoneOnly = rowOf( kicker( { 375: { 'text-transform': 'uppercase' } } ), 'New season' );
	assert.equal( phoneOnly.rule, 'label' );
	assert.deepEqual( phoneOnly.widthDependent, { holds: [ 375 ], fails: [ 768, 1440 ] } );
	assert.equal( phoneOnly.low, true, 'a width-dependent row is low confidence, so the review decides it' );
	const everywhere = rowOf( kicker( { all: { 'text-transform': 'uppercase' } } ), 'New season' );
	assert.equal( everywhere.rule, 'label' );
	assert.equal( everywhere.widthDependent, undefined );
	assert.equal( everywhere.low, false );
	const tracked = rowOf( kicker( { all: { 'letter-spacing': '0.8px', 'font-size': '12px' } } ), 'New season' );
	assert.equal( tracked.rule, 'label', 'tracking is read against the element\'s own resolved size (0.8px over 12px is 0.067em)' );
	assert.notEqual( rowOf( kicker( { all: { 'letter-spacing': '0.8px', 'font-size': '16px' } } ), 'New season' ).rule, 'label', 'negative control: the same tracking over a 16px size (0.05em) is no kicker' );
} );

test( 'MUST FAIL (non-click binding): an element binding any event (onChange, onMouseEnter) is a control the visitor operates, never a kicker; negative control: the same words with no binding are', () => {
	const caps = { all: { 'text-transform': 'uppercase' } };
	const run = ( attrs ) => rowOf( propose( [ el( 1, 'section' ), el( 2, 'span', { parent: 1, words: 'Filter', resolved: caps, attrs } ), el( 3, 'p', { parent: 1, words: 'A longer line of body text sits beside it here.' } ) ] ), 'Filter' );
	assert.notEqual( run( { onMouseEnter: '{{ showTip }}' } ).rule, 'label' );
	assert.notEqual( run( { onChange: '{{ pick }}' } ).rule, 'label' );
	assert.equal( run( {} ).rule, 'label' );
} );

test( 'MUST FAIL (cut snippet): a binding the snippet cut is read in full from the record; the handler of each event, and an inline expression names no handler', () => {
	const long = `<button style="${ 'x'.repeat( 420 ) }`.slice( 0, 400 );
	const { inv, rec } = el( 9, 'button', { snippet: long, attrs: { onClick: '{{ toggleMobile }}', onPointerDown: '{{ press }}', onKeyDown: '{{ () => go( 1 ) }}', 'aria-label': 'Open menu' } } );
	const read = elementFacts( recordView( { elements: { 'Site/9': rec }, surfaces: {} } ) );
	assert.equal( read.handler( inv ), 'toggleMobile' );
	assert.equal( read.handler( inv, 'pointerdown' ), 'press' );
	assert.deepEqual( read.events( inv ).map( ( v ) => [ v.event, v.handler ] ), [ [ 'click', 'toggleMobile' ], [ 'pointerdown', 'press' ], [ 'keydown', '' ] ] );
	assert.equal( read.attr( inv, 'aria-label' ), 'Open menu' );
	// Negative control: an element with no record entry has its rendered attributes and no bindings.
	const bare = elementFacts( recordView( null ) );
	assert.equal( bare.handler( inv ), '' );
	assert.deepEqual( bare.events( inv ), [] );
	// A camel-cased DOM property matches its HTML name; the rendered value wins.
	const field = el( 10, 'input', { attrs: { autoComplete: 'cc-number', inputMode: 'numeric' }, rendered: { type: 'text' } } );
	const fr = elementFacts( recordView( { elements: { 'Site/10': field.rec }, surfaces: {} } ) );
	assert.equal( fr.attr( field.inv, 'autocomplete' ), 'cc-number' );
	assert.equal( fr.attr( field.inv, 'inputmode' ), 'numeric' );
	assert.equal( fr.attr( field.inv, 'type' ), 'text' );
	assert.equal( fr.attr( field.inv, 'missing' ), null );
} );

test( 'MUST FAIL (marker by box): a dot is judged by the box it renders at each width; negative controls: a control and a large box are no marker', () => {
	const row = ( dot ) => propose( [ el( 1, 'section' ), el( 2, 'div', { parent: 1 } ), el( 3, 'span', { parent: 2, depth: 2, ...dot } ), el( 4, 'span', { parent: 2, depth: 2, words: 'Fresh bread daily' } ) ] );
	const at = ( key, r ) => r.proposal.rows.find( ( x ) => x.key === key );
	assert.equal( at( 'Site/3#0', row( { box: { x: 0, y: 0, w: 8, h: 8 } } ) ).rule, 'dotMarker' );
	assert.notEqual( at( 'Site/3#0', row( { box: { x: 0, y: 0, w: 8, h: 8 }, attrs: { onClick: '{{ pick }}' } } ) )?.rule, 'dotMarker', 'a dot binding a click is a control' );
	assert.notEqual( at( 'Site/3#0', row( { box: { x: 0, y: 0, w: 60, h: 60 } } ) )?.rule, 'dotMarker' );
} );

test( 'the reader: resolved values per width, the widths an element renders, a binding-only text, its placeholders and its rendered text read', () => {
	const { inv, rec } = el( 5, 'span', { words: '', resolved: { 768: { 'font-size': '19.5px' } }, visible: { 375: false } } );
	rec.template.words = '{{ arrowIcon }}';
	rec.template.holes = [ { id: 'text#0', where: 'text', expr: 'arrowIcon', path: 'arrowIcon', whole: false }, { id: 'attr:href#0', where: 'attr:href', expr: 'phone', path: 'phone', whole: true }, { id: 'style:color#0', where: 'style:color', expr: 'c', path: 'c', whole: true } ];
	const read = elementFacts( recordView( { elements: { 'Site/5': rec }, surfaces: {} } ) );
	assert.deepEqual( read.widths( inv ), [ 768, 1440 ] );
	assert.equal( read.lengthAt( inv, 'font-size', 768 ), 19.5 );
	assert.equal( read.resolved( inv, 'text-transform', 1440 ), 'none' );
	assert.equal( read.textBinding( inv ), true );
	assert.deepEqual( read.placeholders( inv ), [ '{{ arrowIcon }}', '{{ phone }}' ] );
	rec.template.words = 'Call {{ arrowIcon }}';
	assert.equal( read.textBinding( inv ), false, 'negative control: words beside the binding' );
	assert.equal( read.textWithBreaks( { textBreaks: 'Unit 4<br>High Street', words: 'Unit 4 High Street' } ), 'Unit 4<br>High Street' );
	assert.equal( read.textLeads( { words: 'x', textLeads: false } ), false );
	assert.equal( read.textLeads( { words: 'x' } ), true );
	assert.equal( pxOf( 'auto' ), null );
	assert.equal( pxOf( '12.5px' ), 12.5 );
	assert.deepEqual( acrossWidths( [ 375, 1440 ], ( w ) => 375 === w ), { holds: [ 375 ], fails: [ 1440 ], every: false, some: true } );
	assert.deepEqual( acrossWidths( [], () => true ), { holds: [], fails: [], every: false, some: false } );
	const view = recordView( null );
	assert.equal( elementFacts( view ), elementFacts( view ), 'one reader per view' );
} );
