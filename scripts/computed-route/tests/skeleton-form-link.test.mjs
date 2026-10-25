// A form on a page is a link to its saved form (Spec 48 FR-48-57, §3.3 reference blocks; lib/skeleton-form-link.mjs). A planted
// fact record holds a page, the form record that sits on it (its root is the draft's condition around the <form>) and a second
// form record on another page that shares the same root template (an inline form repeated for several pages). The page
// proposal holds one linked `sgs/form` where its form is, with no children and no draft link, and the form's own proposal is
// still its tree. Each test fails against code that leaves the page's form inline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { recordView, surfaceContext } from '../lib/skeleton-record.mjs';
import { formLinksOf, linkedFormOf } from '../lib/skeleton-form-link.mjs';
import { skeletonProblems } from '../lib/fill-skeleton.mjs';
import { lintSkeleton } from '../lint.mjs';

const db = openDb();
const REFS = { 'sgs/form': { kind: 'linked', flag: 'formIsLinked', key: 'formId' }, 'sgs/modal': { kind: 'frame', key: 'modalRef' } };
const BOX = { 375: { x: 0, y: 0, w: 300, h: 40 }, 768: { x: 0, y: 0, w: 300, h: 40 }, 1440: { x: 0, y: 0, w: 300, h: 40 } };
const SHOWN = { 375: true, 768: true, 1440: true };

const tplOf = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words, x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: tplOf( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ tplOf( key ) }">${ words }</${ tag }>`, box: BOX, visible: SHOWN, display: 'block', flexDirection: 'row', screenshots: {} } );
const input = ( key, parentKey, type = 'text' ) => el( key, parentKey, 'input', '', { depth: 3, attrs: { type, name: key, required: '' } } );

// The page: main > h1, div > (a condition) > form > two inputs and a button.
const inventory = () => ( {
	generated: 'x', source: 'planted', root: 'main', keyFormat: 'x', checks: { duplicateKeys: 0 },
	elements: [
		el( 'Root/1#0', null, 'main', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'h1', 'Contact us' ),
		el( 'Root/3#0', 'Root/1#0', 'div', '' ),
		el( 'Root/6#0', 'Root/3#0', 'form', '', { depth: 2 } ),
		input( 'Root/7#0', 'Root/6#0' ),
		input( 'Root/8#0', 'Root/6#0', 'email' ),
		el( 'Root/9#0', 'Root/6#0', 'button', 'Send', { depth: 3, attrs: { type: 'submit' } } ),
	],
} );

const tpl = ( tag, parent, realParent, chain ) => ( { realTag: tag, attrs: {}, style: { static: [], holes: [] }, holes: [], membership: { scIf: [], scFor: [] }, parent, realParent, parentChain: chain } );
const entry = ( tag, parent, realParent, chain, surfaces = [] ) => ( { template: tpl( tag, parent, realParent, chain ), surfaces, logic: { holes: {} } } );
const RECORD = ( { formParent = 'S-1', extra = {} } = {} ) => ( {
	surfaces: {
		'S-1': { id: 'S-1', kind: 'page', name: 'Contact us', dc: 'Site', parent: null, roots: [ 'Site/1' ], parts: [] },
		'S-2': { id: 'S-2', kind: 'form', name: 'Enquiry', dc: 'Site', parent: formParent, roots: [ 'Site/4', 'Site/5' ], parts: [] },
		'S-3': { id: 'S-3', kind: 'form', name: 'Newsletter', dc: 'Site', parent: 'S-9', roots: [ 'Site/4', 'Site/5' ], parts: [] },
		...extra,
	},
	elements: {
		'Site/1': entry( 'main', null, null, [] ),
		'Site/2': entry( 'h1', 'Site/1', 'Site/1', [ 'Site/1' ] ),
		'Site/3': entry( 'div', 'Site/1', 'Site/1', [ 'Site/1' ] ),
		'Site/4': entry( 'sc-if', 'Site/3', 'Site/3', [ 'Site/3', 'Site/1' ] ),
		'Site/5': entry( 'sc-if', 'Site/4', 'Site/3', [ 'Site/4', 'Site/3', 'Site/1' ] ),
		'Site/6': entry( 'form', 'Site/5', 'Site/3', [ 'Site/5', 'Site/4', 'Site/3', 'Site/1' ] ),
		'Site/7': entry( 'input', 'Site/6', 'Site/6', [ 'Site/6' ] ),
		'Site/8': entry( 'input', 'Site/6', 'Site/6', [ 'Site/6' ] ),
		'Site/9': entry( 'button', 'Site/6', 'Site/6', [ 'Site/6' ] ),
	},
} );
const LINKS = [ { recordId: 'S-2', slug: 'enquiry', block: 'sgs/form' }, { recordId: 'S-3', slug: 'newsletter', block: 'sgs/form' } ];

const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: new URL( '../../..', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), siteName: 'Planted' } );
const propose = ( o = {} ) => proposeSkeleton( { inventory: inventory(), facts: facts(), surface: 'contact', surfaceKind: 'page', surfaceName: 'Contact us', db, rootComponent: 'Site', factRecord: RECORD(), formLinks: LINKS, openers: {}, ...o } );

test( 'formLinksOf takes the form entries a manifest provides, by the record id of their intake skeleton', () => {
	const surfaces = {
		'form-enquiry': { intakeSurface: 'contact-enquiry', provides: [ 'sgs/form:enquiry' ] },
		'form-newsletter': { intakeSurface: 'inline-form-newsletter', provides: [ 'sgs/form:newsletter' ] },
		header: { intakeSurface: 'sticky-header', provides: [ 'core/template-part:header' ] },
		'form-nowhere': { provides: [ 'sgs/form:nowhere' ] },
		'modal-x': { intakeSurface: 'modal-x', provides: [ 'sgs/modal:x' ] },
	};
	const intake = { skeletons: { 'contact-enquiry': { id: 'S-2' }, 'inline-form-newsletter': { id: 'S-3' }, 'sticky-header': { id: 'S-7' }, 'modal-x': { id: 'S-8' } } };
	assert.deepEqual( formLinksOf( { surfaces, intake, refs: REFS } ), LINKS );
} );

test( 'the form root on a page is the draft element under the innermost root of the form record that sits on that page', () => {
	const view = recordView( RECORD(), { rootComponent: 'Site' } );
	const scope = surfaceContext( view, { kind: 'page', name: 'Contact us' } );
	const of = linkedFormOf( { view, scope, links: LINKS, refs: REFS, els: inventory().elements, rule: { block: 'sgs/form' } } );
	const byKey = Object.fromEntries( inventory().elements.map( ( e ) => [ e.key, e ] ) );
	assert.deepEqual( of( byKey[ 'Root/6#0' ] ), { block: 'sgs/form', attributes: { formIsLinked: true, formId: 'enquiry' } } );
	for ( const k of [ 'Root/1#0', 'Root/2#0', 'Root/3#0', 'Root/7#0', 'Root/9#0' ] ) {
		assert.equal( of( byKey[ k ] ), null, k );
	}
} );

test( 'a form record on another page, a form surface and a page with no record link nothing', () => {
	const els = inventory().elements;
	const view = ( rec ) => recordView( rec, { rootComponent: 'Site' } );
	const call = ( rec, o ) => {
		const v = view( rec );
		return linkedFormOf( { view: v, scope: surfaceContext( v, { kind: o.kind ?? 'page', name: o.name ?? 'Contact us' } ), links: LINKS, refs: REFS, els, rule: { block: 'sgs/form' } } )( els[ 3 ] );
	};
	assert.equal( call( RECORD( { formParent: 'S-9' } ), {} ), null );
	assert.equal( call( RECORD(), { kind: 'form', name: 'Enquiry' } ), null );
	assert.equal( call( { surfaces: {}, elements: {} }, {} ), null );
} );

test( 'a block that is not a linked reference block is never a link', () => {
	const view = recordView( RECORD(), { rootComponent: 'Site' } );
	const scope = surfaceContext( view, { kind: 'page', name: 'Contact us' } );
	const els = inventory().elements;
	const of = linkedFormOf( { view, scope, links: [ { recordId: 'S-2', slug: 'enquiry', block: 'sgs/modal' } ], refs: REFS, els, rule: { block: 'sgs/form' } } );
	assert.equal( of( els[ 3 ] ), null );
} );

test( 'a page proposal holds the form as one linked sgs/form with no children and no draft link, and its fields are absorbed', () => {
	const r = propose();
	const forms = nodes( r.skeleton ).filter( ( n ) => 'sgs/form' === n.name );
	assert.equal( forms.length, 1 );
	assert.deepEqual( forms[ 0 ].attributes, { formIsLinked: true, formId: 'enquiry' } );
	assert.deepEqual( forms[ 0 ].innerBlocks, [] );
	assert.equal( forms[ 0 ].draftRef, undefined );
	assert.equal( forms[ 0 ].draftSlots, undefined );
	assert.equal( nodes( r.skeleton ).filter( ( n ) => /^sgs\/form-field-/.test( n.name ) ).length, 0 );
	assert.equal( nodes( r.skeleton ).some( ( n ) => 'sgs/button' === n.name && 'Send' === n.attributes?.text ), false );
	const row = ( key ) => r.proposal.rows.find( ( x ) => x.key === key );
	assert.equal( row( 'Root/6#0' ).block, 'sgs/form' );
	for ( const k of [ 'Root/7#0', 'Root/8#0', 'Root/9#0' ] ) {
		assert.equal( row( k ).action, 'absorbed', k );
		assert.equal( row( k ).into, 'Root/6#0', k );
	}
	assert.deepEqual( [ ...skeletonProblems( r.skeleton ), ...lintSkeleton( r.skeleton, db ) ], [] );
	assert.deepEqual( r.problems, [] );
} );

test( 'the same page with no form link keeps the fields inline, so the link is what removed them', () => {
	const r = propose( { formLinks: [] } );
	assert.ok( nodes( r.skeleton ).filter( ( n ) => /^sgs\/form-field-/.test( n.name ) ).length >= 2 );
} );

test( 'the form surface is still its own tree: a form host with its fields, never a link', () => {
	const form = inventory();
	form.elements = form.elements.slice( 3 ).map( ( e, i ) => ( 0 === i ? { ...e, depth: 0, parentKey: null } : { ...e, depth: e.depth - 2 } ) );
	const r = propose( { inventory: form, surface: 'form-enquiry', surfaceKind: 'form', surfaceName: 'Enquiry' } );
	const root = r.skeleton[ 0 ];
	assert.equal( root.name, 'sgs/form' );
	assert.equal( root.attributes.formIsLinked, undefined );
	assert.deepEqual( root.innerBlocks.map( ( n ) => n.name ).filter( ( n ) => /^sgs\/form-field-/.test( n ) ), [ 'sgs/form-field-text', 'sgs/form-field-email' ] );
} );

test( 'two draft elements under the form root are one link: the second is dropped', () => {
	const inv = inventory();
	inv.elements.push( el( 'Root/10#0', 'Root/3#0', 'div', 'After the form', { depth: 2 } ) );
	const rec = RECORD();
	rec.elements[ 'Site/10' ] = entry( 'div', 'Site/5', 'Site/3', [ 'Site/5', 'Site/4', 'Site/3', 'Site/1' ] );
	const r = propose( { inventory: inv, factRecord: rec } );
	assert.equal( nodes( r.skeleton ).filter( ( n ) => 'sgs/form' === n.name ).length, 1 );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/10#0' === x.key ).action, 'remove' );
} );

// A form surface whose draft is a wizard drawn in a <div>: the surface root is the saved form's root block.
const wizard = () => {
	const inv = inventory();
	inv.elements = [
		{ ...el( 'Root/6#0', null, 'div', '', { depth: 0 } ) },
		el( 'Root/10#0', 'Root/6#0', 'h2', 'Step one', { depth: 1 } ),
		{ ...input( 'Root/7#0', 'Root/6#0' ), depth: 1 },
		{ ...input( 'Root/8#0', 'Root/6#0', 'email' ), depth: 1 },
	];
	return inv;
};
const STEPS = [ { key: 'a', label: 'Business', fields: [ { name: 'a1' } ] }, { key: 'b', label: 'Contact', fields: [ { name: 'b1' } ] }, { key: 'r', label: 'Review', fields: [] } ];
const divRecord = () => {
	const rec = RECORD();
	rec.elements[ 'Site/6' ].template.realTag = 'div';
	return rec;
};
const withSchema = ( component ) => ( { ...divRecord(), logic: { statics: { [ component ]: { entries: [ { name: 'schema', kind: 'array', value: STEPS } ] } } } } );

test( 'the root of a form surface is the form block even when the draft draws it in a div', () => {
	const r = propose( { inventory: wizard(), surface: 'form-enquiry', surfaceKind: 'form', surfaceName: 'Enquiry', factRecord: divRecord() } );
	assert.equal( r.skeleton.length, 1 );
	assert.equal( r.skeleton[ 0 ].name, 'sgs/form' );
	assert.equal( nodes( r.skeleton ).filter( ( n ) => 'sgs/form' === n.name ).length, 1 );
	assert.equal( r.proposal.rows.find( ( x ) => 'Root/6#0' === x.key ).rule, 'formHost' );
} );

test( 'the root of a page is not made a form block because it holds fields', () => {
	const inv = wizard();
	const r = propose( { inventory: inv, surface: 'contact', surfaceKind: 'page', surfaceName: 'Contact us', formLinks: [], factRecord: divRecord() } );
	assert.notEqual( r.skeleton[ 0 ].name, 'sgs/form' );
} );

test( 'a form surface takes the steps of its own draft component, never another form\'s schema', () => {
	const own = propose( { inventory: wizard(), surface: 'form-enquiry', surfaceKind: 'form', surfaceName: 'Enquiry', factRecord: withSchema( 'Site' ) } );
	assert.deepEqual( own.skeleton[ 0 ].innerBlocks.filter( ( n ) => /^sgs\/form-(step|review)$/.test( n.name ) ).map( ( n ) => n.attributes.label ?? 'review' ), [ 'Business', 'Contact', 'review' ] );
	const other = propose( { inventory: wizard(), surface: 'form-enquiry', surfaceKind: 'form', surfaceName: 'Enquiry', factRecord: withSchema( 'SomeoneElse' ) } );
	assert.equal( other.skeleton[ 0 ].innerBlocks.some( ( n ) => /^sgs\/form-(step|review)$/.test( n.name ) ), false );
} );
