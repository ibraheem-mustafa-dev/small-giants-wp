// rules.choiceFlow (Spec 48 FR-48-6; Spec 43) and rules.blockOwnedPart (plan 2026-10-23-cloning-tool-completion S5): a surface the
// page map holds as an sgs_choice_flow row is the sgs/choice-flow family composed from the fact record, whatever its surfaces.json
// kind; a surface the page map holds as a block-owned part of the cart row is sgs/cart, never the navigation drawer. Synthetic
// inventories and fact records in the readers' shapes. Tests marked MUST FAIL fail on the skeleton writer before the rules; each
// carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { parseTagId, surfaceRole } from '../lib/skeleton-surface-role.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( edit = null ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	edit && edit( f.decisions.rules );
	return f;
};

// A template element: n, tag, parent n, { words, attrs, text: [values] (a text hole), loop: { list n, as } (inside that loop),
// list: { n } (an sc-for with n items), click (handler), rendered: [copies] (inventory copies; none = not rendered) }.
const E = ( n, tag, parent, o = {} ) => ( { n, tag, parent, ...o } );
function build( list, { ids = {}, statics = null } = {} ) {
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
		if ( 'sc-for' === x.tag ) {
			holes.push( { id: 'attr:list#0', where: 'attr:list', expr: 'xs', path: 'xs', whole: true } );
			logic[ 'attr:list#0' ] = { 1440: { v: [ { t: 'array', n: x.items } ], n: 1, loop: false } };
			attrs.as = x.as;
			attrs.list = '{{ xs }}';
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
const SCHEMA = { Root: { entries: [ { name: 'steps', kind: 'array', value: [ { label: 'One', fields: [ { name: 'a' } ] }, { label: 'Two', fields: [ { name: 'b' } ] } ] } ] } };

const R0 = [ 0 ];
const R01 = [ 0, 1 ];
// A full-screen flow: a header with Close, a summary aside with a help link, two questions (the second opening two panels), a
// footer with a skip link and an add-to-bag button holding the total, and one stray line the family cannot hold.
const FLOW = [
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
const FLOW_ROW = { slug: 'choice-flow-pick', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-09' };
const run = ( list, o = {} ) => {
	const b = build( list, { ids: { 'S-09': { kind: o.kind || 'modal', name: 'Flow', root: list[ 0 ].n } }, statics: o.statics ?? SCHEMA } );
	return proposeSkeleton( { inventory: b.inventory, facts: o.facts || facts(), surface: 'flow', surfaceKind: o.kind || 'modal', surfaceName: 'Flow', db, factRecord: b.record, openers: {}, pageMap: o.pageMap ?? [ FLOW_ROW ], surfaceId: 'S-09' } );
};
const names = ( tree ) => ( JSON.stringify( tree ).match( /"name":"[^"]+"/g ) || [] ).map( ( x ) => x.slice( 8, -1 ) );

test( 'MUST FAIL: a choice-flow surface is sgs/choice-flow with one step per question, its options read from the record, and the panels a question opens', () => {
	const { skeleton, problems } = run( FLOW );
	assert.deepEqual( problems, [] );
	const [ flow ] = skeleton;
	assert.equal( flow.name, 'sgs/choice-flow' );
	assert.deepEqual( flow.innerBlocks.map( ( s ) => [ s.name, s.attributes.label, s.innerBlocks.map( ( k ) => k.name ) ] ), [
		[ 'sgs/form-step', 'Pick a size', [ 'sgs/choice-flow-question' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/choice-flow-question' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/choice-flow-result' ] ],
		[ 'sgs/form-step', 'How to send it', [ 'sgs/form-field-file', 'sgs/choice-flow-result' ] ],
	] );
	const q1 = flow.innerBlocks[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( q1.attributes, { question: 'Pick a size', intro: 'Sizes run small.', options: [ { label: 'Small', value: 'small', description: 'Snug fit', helpText: 'Small help' }, { label: 'Large', value: 'large', description: 'Roomy fit', helpText: 'Large help' } ] } );
	assert.deepEqual( q1.draftRef, { tpl: 'Root/12#0' }, 'the rendered question reads the draft at its container' );
	const q2 = flow.innerBlocks[ 1 ].innerBlocks[ 0 ];
	assert.equal( q2.draftRef, undefined, 'a step the page never showed has no draftRef' );
	assert.deepEqual( q2.attributes, { question: 'How to send it', eyebrow: 'Almost done', options: [ { label: 'Later', value: 'later', nextStepId: '2' }, { label: 'Upload', value: 'upload', nextStepId: '3' } ], showNextStepInline: true } );
	assert.deepEqual( flow.innerBlocks[ 2 ].innerBlocks[ 0 ].attributes, { heading: 'We will remind you.', body: 'Nothing is charged twice.', action: 'add-to-bag', addToBasketLabel: 'Add to bag', buttonShowsTotal: true } );
	assert.deepEqual( flow.innerBlocks[ 3 ].innerBlocks[ 0 ].attributes, { label: 'Drop it here' } );
	assert.deepEqual( flow.innerBlocks[ 3 ].innerBlocks[ 1 ].attributes, { heading: '', action: 'add-to-bag', addToBasketLabel: 'Add to bag', buttonShowsTotal: true }, 'a field panel\'s words label its field, never head its result' );
	assert.ok( ! names( skeleton ).includes( 'sgs/form' ), 'the form passes never wrap the flow\'s fields, even with a form schema in the logic' );
	assert.deepEqual( flow.attributes, { flowLayout: 'showcase', stepCountLabel: 'Question', showHeader: true, closeStyle: 'text', closeLabel: 'Close', skipLabel: 'Skip it', skipPrompt: 'Frame only?', skipAddsToBag: true, showPricePanel: true, summaryPosition: 'start', stageNote: 'Need a hand?', stageNoteLink: { url: 'https://example.com/help', text: 'Message us any time.', source: 'url' } } );
	assert.ok( flow.handover.some( ( h ) => 'product-data' === h.owner && h.detail.includes( '+£5' ) ), 'the option prices are handed to the add-on price list' );
	assert.ok( flow.handover.some( ( h ) => 'site-info' === h.owner && h.detail.includes( 'headerLogo' ) ), 'the header logo is handed over' );
	// Negative control: with no page-map row the surface is never a choice flow.
	assert.ok( ! names( run( FLOW, { pageMap: [] } ).skeleton ).some( ( n ) => n.startsWith( 'sgs/choice-flow' ) ) );
} );

test( 'MUST FAIL: the flow\'s rows: covered pieces name what draws them, a line the family cannot hold is a gap row', () => {
	const { proposal } = run( FLOW );
	const row = ( k ) => proposal.rows.find( ( r ) => r.key === k );
	assert.equal( row( 'Root/1#0' ).block, 'sgs/choice-flow' );
	assert.equal( row( 'Root/1#0' ).rule, 'choiceFlow' );
	assert.equal( row( 'Root/47#0' ).action, 'unresolved', 'the stray line is a gap row' );
	assert.match( row( 'Root/47#0' ).reason, /holds no setting/ );
	assert.equal( row( 'Root/20#1' ).action, 'absorbed' );
	assert.match( row( 'Root/20#1' ).reason, /question 1 "Pick a size"/ );
	assert.match( row( 'Root/8#0' ).reason, /summary/ );
	assert.match( row( 'Root/43#0' ).reason, /skip/ );
	assert.match( row( 'Root/45#0' ).reason, /flow footer/, 'the add-to-bag button sits in the footer bar the flow draws' );
	assert.match( row( 'Root/48#0' ).reason, /inside the gap row Root\/47#0/ );
	// A loop of buttons whose handler does not bind the item is no question: its buttons are gap rows.
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ).map( ( r ) => r.key ), [ 'Root/47#0', 'Root/51#0', 'Root/51#1' ] );
	assert.deepEqual( proposal.choiceFlow, { steps: 4, questions: 2, results: 2, notes: [] } );
} );

test( 'MUST FAIL: the choice-flow rule wins over the form rule on a surface of kind form; without the row it stays sgs/form', () => {
	const asForm = [ E( 1, 'form', null, { rendered: R0 } ), ...FLOW.slice( 1 ) ];
	const flow = run( asForm, { kind: 'form' } );
	assert.equal( flow.skeleton[ 0 ].name, 'sgs/choice-flow' );
	assert.ok( ! names( flow.skeleton ).includes( 'sgs/form' ), 'no form host wraps the panel\'s field' );
	assert.equal( run( asForm, { kind: 'form', pageMap: [] } ).skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'MUST FAIL: a row of chips with its label just before it is a question worded by that label; a compact flow on a page', () => {
	const chips = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'h2', 1, { words: 'Find a gift', rendered: R0 } ),
		E( 3, 'div', 1, { words: 'The moment', rendered: R0 } ),
		E( 4, 'div', 1, { rendered: R0 } ),
		E( 5, 'sc-for', 4, { items: 2, as: 'o' } ),
		E( 6, 'button', 5, { click: 'o.pick', text: [ 'Birthday', 'Thank you' ], rendered: R01 } ),
		E( 7, 'div', 1, { words: 'Budget', rendered: R0 } ),
		E( 8, 'div', 1, { rendered: R0 } ),
		E( 9, 'sc-for', 8, { items: 2, as: 'o' } ),
		E( 10, 'button', 9, { click: 'o.pick', text: [ 'Under 20', 'Over 20' ], rendered: R01 } ),
	];
	const { skeleton, proposal } = run( chips, { kind: 'form' } );
	const [ flow ] = skeleton;
	assert.deepEqual( flow.attributes, { flowLayout: 'compact', title: 'Find a gift' } );
	assert.deepEqual( flow.innerBlocks.map( ( s ) => [ s.innerBlocks[ 0 ].attributes.question, s.innerBlocks[ 0 ].attributes.options.map( ( x ) => x.label ) ] ), [ [ 'The moment', [ 'Birthday', 'Thank you' ] ], [ 'Budget', [ 'Under 20', 'Over 20' ] ] ] );
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ), [], 'the labels are the questions\' words, never gap rows' );
} );

test( 'MUST FAIL: a condition before the options is question text, a price-first option keeps its name, a skip mention inside a button is no skip link', () => {
	const edge = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'div', 1, { rendered: R0 } ),
		E( 3, 'h3', 2, { words: 'Pick one', rendered: R0 } ),
		E( 4, 'sc-if', 2, { attrs: { value: '{{ hint }}' } } ),
		E( 5, 'p', 4, { words: 'Most pick the first.', rendered: R0 } ),
		E( 6, 'div', 2, { rendered: R0 } ),
		E( 7, 'sc-for', 6, { items: 2, as: 'o' } ),
		E( 8, 'button', 7, { click: 'o.pick', rendered: R01 } ),
		E( 9, 'span', 8, { text: [ '£5', '£9' ], rendered: R01 } ),
		E( 10, 'span', 8, { text: [ 'Small', 'Large' ], rendered: R01 } ),
		E( 11, 'img', 1, { attrs: { src: 'x.png', alt: '' }, rendered: R0 } ),
		E( 12, 'div', 1, { rendered: R0 } ),
		E( 13, 'sc-for', 12, { items: 2, as: 'o' } ),
		E( 14, 'button', 13, { click: 'o.pick', text: [ 'Weekly', 'Monthly' ], rendered: R01 } ),
		E( 15, 'button', 1, { click: 'pickPlan', rendered: R0 } ),
		E( 16, 'span', 15, { words: 'Skip, swap or cancel', rendered: R0 } ),
	];
	const { skeleton, proposal } = run( edge, { kind: 'form' } );
	const [ flow ] = skeleton;
	assert.equal( flow.innerBlocks.length, 2, 'a condition before the options opens no step' );
	assert.deepEqual( flow.innerBlocks[ 0 ].innerBlocks[ 0 ].attributes, { question: 'Pick one', intro: 'Most pick the first.', options: [ { label: 'Small', value: 'small' }, { label: 'Large', value: 'large' } ] } );
	assert.equal( flow.attributes.skipLabel, undefined, 'a button holding a skip mention in its text is no skip link' );
	assert.doesNotMatch( proposal.rows.find( ( r ) => 'Root/11#0' === r.key ).reason, /question/, 'a wordless sibling never leads a question' );
	assert.match( proposal.choiceFlow.notes.join( ' ' ), /question 2 \(Root\/12\) has no words/ );
} );

test( 'MUST FAIL: a question\'s container never climbs past another control', () => {
	const wrap = [
		E( 1, 'section', null, { rendered: R0 } ),
		E( 2, 'div', 1, { rendered: R0 } ),
		E( 3, 'div', 2, { words: 'Size', rendered: R0 } ),
		E( 4, 'div', 2, { rendered: R0 } ),
		E( 5, 'sc-for', 4, { items: 2, as: 'o' } ),
		E( 6, 'button', 5, { click: 'o.pick', text: [ 'S', 'M' ], rendered: R01 } ),
		E( 7, 'button', 2, { words: 'Reset', click: 'resetAll', rendered: R0 } ),
	];
	const { skeleton, proposal } = run( wrap, { kind: 'form' } );
	assert.deepEqual( skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes, { question: 'Size', options: [ { label: 'S', value: 's' }, { label: 'M', value: 'm' } ] } );
	assert.deepEqual( proposal.rows.filter( ( r ) => 'unresolved' === r.action ).map( ( r ) => r.key ), [ 'Root/7#0' ], 'the other control is a gap row, never the question\'s intro' );
} );

test( 'MUST FAIL: options are listed only when the loop recorded one value per item; otherwise a note says why', () => {
	const dup = FLOW.map( ( x ) => ( 20 === x.n ? { ...x, text: [ 'Same' ] } : x ) );
	const { skeleton, proposal } = run( dup );
	assert.deepEqual( skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes.options, [] );
	assert.match( proposal.choiceFlow.notes.join( ' ' ), /question 1 "Pick a size".*not listed/ );
	// Control: the aligned loop lists both.
	assert.equal( run( FLOW ).skeleton[ 0 ].innerBlocks[ 0 ].innerBlocks[ 0 ].attributes.options.length, 2 );
} );

// The header's basket drawer: a page-map cart row holds it as a block-owned part.
const DRAWER = [
	E( 1, 'aside', null, { attrs: { 'aria-label': 'Basket' }, rendered: R0 } ),
	E( 2, 'div', 1, { words: 'Your basket', rendered: R0 } ),
	E( 3, 'button', 1, { words: '×', click: 'closeBasket', rendered: R0 } ),
];
const CART = { slug: 'cart', postType: 'page', template: 'cart', parts: [ { kind: 'drawer', label: 'Basket', owner: 'block', draftId: 'Root.dc.html:9:3 <aside aria-label="Basket">' } ] };

test( 'MUST FAIL: a drawer the page map holds as the cart row\'s block-owned part is sgs/cart in drawer mode, never sgs/nav-drawer', () => {
	const r = run( DRAWER, { kind: 'drawer', pageMap: [ CART ] } );
	assert.deepEqual( r.skeleton.map( ( n ) => [ n.name, n.attributes, n.innerBlocks.length ] ), [ [ 'sgs/cart', { displayMode: 'drawer' }, 0 ] ] );
	assert.ok( r.proposal.rows.slice( 1 ).every( ( x ) => 'absorbed' === x.action && 'blockOwnedPart' === x.rule ) );
	assert.deepEqual( r.proposal.surfaceRole, { role: 'blockPart', row: 'cart', part: 'Basket' } );
	// Negative controls: no page map keeps the drawer rule; a header holding the same element is never the part.
	assert.equal( run( DRAWER, { kind: 'drawer', pageMap: [] } ).skeleton[ 0 ].name, 'sgs/nav-drawer' );
	assert.notEqual( run( DRAWER, { kind: 'header', pageMap: [ CART ] } ).skeleton[ 0 ].name, 'sgs/cart' );
	const elsewhere = { ...CART, parts: [ { ...CART.parts[ 0 ], draftId: 'Root.dc.html:9:3 <aside aria-label="Filters">' } ] };
	assert.equal( run( DRAWER, { kind: 'drawer', pageMap: [ elsewhere ] } ).skeleton[ 0 ].name, 'sgs/nav-drawer', 'a part naming another aria-label is another surface' );
	// A part of a row whose template names no owning block leaves the root to the scoring, still never the navigation drawer.
	const other = run( DRAWER, { kind: 'drawer', pageMap: [ { ...CART, template: 'page' } ] } ).skeleton[ 0 ].name;
	assert.notEqual( other, 'sgs/nav-drawer' );
	assert.notEqual( other, 'sgs/cart' );
} );

test( 'surfaceRole and parseTagId read the page map, never a name', () => {
	assert.deepEqual( parseTagId( 'Root.dc.html:9:3 <aside aria-label="Basket">' ), { component: 'Root', tag: 'aside', ariaLabel: 'Basket' } );
	assert.deepEqual( parseTagId( 'Root.dc.html:9:3 <div>' ), { component: 'Root', tag: 'div', ariaLabel: null } );
	assert.equal( parseTagId( 'surfaces.json S-01' ), null );
	assert.equal( surfaceRole( { pageMap: [ FLOW_ROW ], id: 'S-10' } ), null, 'another surface\'s row is not this one\'s' );
	assert.equal( surfaceRole( { pageMap: [ { ...FLOW_ROW, postType: 'sgs_modal' } ], id: 'S-09' } ), null );
	assert.equal( surfaceRole( { pageMap: [ FLOW_ROW ], id: 'S-09' } ).role, 'choiceFlow' );
} );

test( 'decisionsProblems refuses a choiceFlow or blockOwnedPart entry naming no block or an unknown one', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	assert.ok( decisionsProblems( facts( ( r ) => delete r.choiceFlow.question ) ).some( ( p ) => /rules\.choiceFlow must name/.test( p ) ) );
	assert.ok( decisionsProblems( facts( ( r ) => ( r.blockOwnedPart.byTemplate.cart.block = 'sgs/no-such-block' ) ) ).some( ( p ) => /blockOwnedPart\.byTemplate\.cart/.test( p ) ) );
} );
