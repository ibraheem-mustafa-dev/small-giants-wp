// The choice-flow fixture shared by the choice-flow skeleton tests: synthetic inventories and fact records in the readers'
// shapes (lib/skeleton-record.mjs, lib/skeleton-inventory.mjs), the full-screen FLOW draft and a runner over proposeSkeleton.
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../../lib/db.mjs';
import { loadFacts } from '../../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../../lib/skeleton-propose.mjs';
const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../../..' );
export const db = openDb();
export const facts = ( edit = null ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	edit && edit( f.decisions.rules );
	return f;
};

// A template element: n, tag, parent n, { words, attrs, text: [values] (a text hole), loop: { list n, as } (inside that loop),
// items (an sc-for with that many items; `binds` names the render value its list reads, else `xs`), click (handler), pressed (an aria-pressed state bound to `is<n>`, recorded true or
// false), rendered: [copies] (inventory copies; none = not rendered) }.
export const E = ( n, tag, parent, o = {} ) => ( { n, tag, parent, ...o } );
export function build( list, { ids = {}, statics = null } = {} ) {
	const by = new Map( list.map( ( x ) => [ x.n, x ] ) );
	const key = ( n ) => `Root/${ n }`;
	const realParent = ( x ) => {
		let p = by.get( x.parent );
		while ( p && /^sc-/.test( p.tag ) ) {
			p = by.get( p.parent );
		}
		return p ?? null;
	};
	const chain = ( x ) => {
		const out = [];
		for ( let p = by.get( x.parent ); p; p = by.get( p.parent ) ) {
			out.push( key( p.n ) );
		}
		return out;
	};
	const loopOf = ( x ) => {
		for ( let p = by.get( x.parent ); p; p = by.get( p.parent ) ) {
			if ( 'sc-for' === p.tag ) {
				return p;
			}
		}
		return null;
	};
	const elements = {};
	for ( const x of list ) {
		const holes = [];
		const logic = {};
		const attrs = { ...( x.attrs || {} ) };
		if ( x.click ) {
			attrs.onClick = `{{ ${ x.click } }}`;
		}
		if ( x.text ) {
			holes.push( { id: 'text#0', where: 'text', expr: 'v', path: 'v', whole: false } );
			const loop = loopOf( x );
			logic[ 'text#0' ] = { 1440: { v: x.text.map( ( v ) => ( { t: 'string', v } ) ), n: loop ? loop.items : 1, loop: !! loop } };
		}
		if ( undefined !== x.pressed ) {
			const expr = `is${ x.n }`;
			attrs[ 'aria-pressed' ] = `{{ ${ expr } }}`;
			holes.push( { id: 'attr:aria-pressed#1', where: 'attr:aria-pressed', expr, path: expr, whole: true } );
			logic[ 'attr:aria-pressed#1' ] = { 1440: { v: [ { t: 'boolean', v: x.pressed } ], n: 1, loop: false } };
		}
		if ( 'sc-for' === x.tag ) {
			const list = x.binds || 'xs';
			holes.push( { id: 'attr:list#0', where: 'attr:list', expr: list, path: list, whole: true } );
			logic[ 'attr:list#0' ] = { 1440: { v: [ { t: 'array', n: x.items } ], n: 1, loop: false } };
			attrs.as = x.as;
			attrs.list = `{{ ${ list } }}`;
		}
		const loop = loopOf( x );
		elements[ key( x.n ) ] = {
			template: { key: key( x.n ), component: 'Root', n: String( x.n ), tag: x.tag, realTag: x.tag, attrs, style: { static: [], holes: [] }, pseudo: {}, holes, parent: x.parent ? key( x.parent ) : null, realParent: realParent( x ) ? key( realParent( x ).n ) : null, parentChain: chain( x ),
				membership: { scIf: [], scFor: loop ? [ { key: key( loop.n ), list: '{{ xs }}', as: loop.as } ] : [], dcImport: [] }, words: x.text ? '{{ v }}' : x.words || '', events: x.click ? [ { name: 'onClick', expr: x.click } ] : [], srcLine: x.n },
			logic: { holes: logic }, surfaces: [], instances: [], fingerprint: {},
		};
	}
	// The inventory: each rendered copy, its parent the nearest rendered real ancestor.
	const inv = [];
	const depth = ( x ) => {
		let d = 0;
		for ( let p = realParent( x ); p; p = realParent( p ) ) {
			d++;
		}
		return d;
	};
	for ( const x of list.filter( ( y ) => y.rendered ) ) {
		x.rendered.forEach( ( c ) => {
			const rp = realParent( x );
			const pc = rp ? ( rp.rendered?.includes( c ) ? c : 0 ) : null;
			const words = x.text ? x.text[ c ] ?? '' : x.words || '';
			inv.push( { key: `Root/${ x.n }#${ c }`, parentKey: rp ? `Root/${ rp.n }#${ pc }` : null, depth: depth( x ), tag: x.tag, template: 'Root', tpl: x.n, attrs: { ...( x.attrs || {} ) }, words, allText: words, membership: [], srcTag: x.tag, srcOwnText: words, snippet: `<${ x.tag } data-dc-tpl="${ x.n }">${ words }</${ x.tag }>`,
				box: { 375: { x: 0, y: x.n * 10, w: 300, h: 20 }, 768: { x: 0, y: x.n * 10, w: 300, h: 20 }, 1440: { x: 0, y: x.n * 10, w: 300, h: 20 } }, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
		} );
	}
	const surfaces = Object.fromEntries( Object.entries( ids ).map( ( [ id, s ] ) => [ id, { id, kind: s.kind, name: s.name, dc: 'Root', parent: null, roots: [ key( s.root ) ], parts: [], states: [] } ] ) );
	return { inventory: { generated: 'fixture', source: 'fixture', root: list[ 0 ].tag, checks: {}, elements: inv }, record: { schema: '1', client: 'fixture-client', elements, surfaces, ...( statics ? { logic: { statics } } : {} ) } };
}
// A form schema of two steps in the draft's logic: the form passes would wrap any field outside a form in one.
export const SCHEMA = { Root: { entries: [ { name: 'steps', kind: 'array', value: [ { label: 'One', fields: [ { name: 'a' } ] }, { label: 'Two', fields: [ { name: 'b' } ] } ] } ] } };

export const R0 = [ 0 ];
export const R01 = [ 0, 1 ];
// A full-screen flow: a header with Close, a summary aside with a help link, two questions (the second opening two panels), a
// footer with a skip link and an add-to-bag button holding the total, and one stray line the family cannot hold.
export const FLOW = [
	E( 1, 'div', null, { attrs: { role: 'dialog' }, rendered: R0 } ),
	E( 2, 'div', 1, { rendered: R0 } ),
	E( 3, 'img', 2, { attrs: { src: 'logo.png', alt: '' }, rendered: R0 } ),
	E( 4, 'button', 2, { words: 'Close', click: 'closeIt', rendered: R0 } ),
	E( 5, 'aside', 1, { rendered: R0 } ),
	E( 6, 'div', 5, { words: 'Total', rendered: R0 } ),
	E( 7, 'a', 5, { attrs: { href: 'https://example.com/help' }, rendered: R0 } ),
	E( 8, 'span', 7, { words: 'Need a hand?', rendered: R0 } ),
	E( 9, 'span', 7, { words: 'Message us any time.', rendered: R0 } ),
	E( 10, 'div', 1, { rendered: R0 } ),
	E( 11, 'sc-if', 10, { attrs: { value: '{{ q0 }}' } } ),
	E( 12, 'div', 11, { rendered: R0 } ),
	E( 13, 'p', 12, { words: 'Question 1 of 2', rendered: R0 } ),
	E( 14, 'h2', 12, { words: 'Pick a size', rendered: R0 } ),
	E( 15, 'p', 12, { words: 'Sizes run small.', rendered: R0 } ),
	E( 16, 'div', 12, { rendered: R0 } ),
	E( 17, 'sc-for', 16, { items: 2, as: 'o' } ),
	E( 18, 'div', 17, { rendered: R01 } ),
	E( 19, 'button', 18, { click: 'o.pick', rendered: R01 } ),
	E( 20, 'span', 19, { text: [ 'Small', 'Large' ], rendered: R01 } ),
	E( 21, 'span', 19, { text: [ '+£5', 'included' ], rendered: R01 } ),
	E( 22, 'span', 19, { text: [ 'Snug fit', 'Roomy fit' ], rendered: R01 } ),
	E( 23, 'sc-if', 18, { attrs: { value: '{{ o.helpOpen }}' } } ),
	E( 24, 'div', 23, { text: [ 'Small help', 'Large help' ] } ),
	E( 25, 'sc-if', 10, { attrs: { value: '{{ q1 }}' } } ),
	E( 26, 'div', 25 ),
	E( 27, 'p', 26, { words: 'Almost done' } ),
	E( 28, 'h2', 26, { words: 'How to send it' } ),
	E( 29, 'div', 26 ),
	E( 30, 'sc-for', 29, { items: 2, as: 'm' } ),
	E( 31, 'button', 30, { click: 'm.pick' } ),
	E( 32, 'span', 31, { text: [ 'Later', 'Upload' ] } ),
	E( 33, 'sc-if', 26, { attrs: { value: '{{ later }}' } } ),
	E( 34, 'div', 33 ),
	E( 35, 'p', 34, { words: 'We will remind you.' } ),
	E( 36, 'p', 34, { words: 'Nothing is charged twice.' } ),
	E( 37, 'sc-if', 26, { attrs: { value: '{{ upload }}' } } ),
	E( 38, 'label', 37 ),
	E( 39, 'span', 38, { words: 'Drop it here' } ),
	E( 40, 'input', 38, { attrs: { type: 'file' } } ),
	E( 41, 'div', 1, { rendered: R0 } ),
	E( 42, 'span', 41, { words: 'Frame only?', rendered: R0 } ),
	E( 43, 'button', 42, { words: 'Skip it', click: 'addBare', rendered: R0 } ),
	E( 44, 'button', 41, { click: 'addAll', rendered: R0 } ),
	E( 45, 'span', 44, { words: 'Add to bag', rendered: R0 } ),
	E( 46, 'span', 44, { text: [ '£20' ], rendered: R0 } ),
	E( 47, 'p', 1, { words: 'A stray line', rendered: R0 } ),
	E( 48, 'span', 47, { words: 'with more', rendered: R0 } ),
	E( 49, 'div', 1, { rendered: R0 } ),
	E( 50, 'sc-for', 49, { items: 2, as: 'x' } ),
	E( 51, 'button', 50, { click: 'openAll', text: [ 'Alpha', 'Beta' ], rendered: R01 } ),
];
export const FLOW_ROW = { slug: 'choice-flow-pick', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-09' };
export const run = ( list, o = {} ) => {
	const b = build( list, { ids: { 'S-09': { kind: o.kind || 'modal', name: 'Flow', root: list[ 0 ].n } }, statics: o.statics ?? SCHEMA } );
	return proposeSkeleton( { inventory: b.inventory, facts: o.facts || facts(), surface: 'flow', surfaceKind: o.kind || 'modal', surfaceName: 'Flow', db, factRecord: b.record, openers: {}, pageMap: o.pageMap ?? [ FLOW_ROW ], surfaceId: 'S-09', ...( o.saleOf ? { saleOf: o.saleOf } : {} ), ...( o.calSettings ? { calSettings: o.calSettings } : {} ), ...( o.calKeys ? { calKeys: o.calKeys } : {} ) } );
};
export const names = ( tree ) => ( JSON.stringify( tree ).match( /"name":"[^"]+"/g ) || [] ).map( ( x ) => x.slice( 8, -1 ) );
