// rules.modalOpener (Spec 48 FR-48-6, FR-48-57; register A1, Bean S9 2026-10-28): a button or link whose click handler writes the state
// a draft modal surface opens on, where the page map holds the modal as an sgs_modal row, is an sgs/button linking #<anchor>; the
// page that holds the control carries one sgs/modal frame with that anchor and no trigger of its own, showing the modal post
// (modalRef, carried once the site build made it). Read by structure (the handler's state write, lib/skeleton-handler-opens.mjs),
// never by a name. Synthetic inventories, fact records and drafts in the readers' shapes. Tests marked MUST FAIL fail before the
// rule; each carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { handlerWrites, opensOnWrites } from '../lib/skeleton-handler-opens.mjs';
import { modalFrame, modalTargets } from '../lib/skeleton-opener.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';
import { writeIdsSite } from '../lib/site-build-map.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const LOGIC = `class Component {
	state = { modal: null, size: false };
	renderVals() {
		return { openSize: ( e ) => { e.preventDefault(); this.setState( { modal: 'size' } ); }, openOther: () => this.setState( { modal: 'other' } ), closeSize: () => this.setState( { modal: null } ), openBool: () => this.setState( { sizeOpen: true } ), openNum: () => this.setState( { step: 2 } ), noop: () => this.setState( { page: 'x' } ) };
	}
}`;
const draftRepo = ( logic = LOGIC ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'modal-opener-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, text, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ), folder: dir };
};
const box = ( n ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: n * 10, y: 0, w: 60, h: 20 } ] ) );
const el = ( n, parent, tag, words, o = {} ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: o.depth ?? 1, tag, template: 'Root', tpl: n, attrs: o.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words,
	snippet: `<${ tag } data-dc-tpl="${ n }"${ o.click ? ` sc-camel-on-click="{{ ${ o.click } }}"` : '' }>${ words }</${ tag }>`, visible: { 375: true, 768: true, 1440: true }, box: box( n ), display: 'block', widths: [ 375, 768, 1440 ], flexDirection: 'row' } );
const rec = ( n, parent, tag, o = {} ) => ( { template: { key: `Root/${ n }`, component: 'Root', n: String( n ), tag, realTag: tag, attrs: o.click ? { onClick: `{{ ${ o.click } }}` } : {}, style: { static: [], holes: [] }, pseudo: {}, holes: [],
	parent: parent ? `Root/${ parent }` : null, realParent: parent ? `Root/${ parent }` : null, parentChain: parent ? [ `Root/${ parent }` ] : [], membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: n }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );

// The page: a heading, two controls opening the size guide (a button and a link), another modal's opener, a closer and a control writing no modal key.
const PAGE = [
	[ 1, null, 'main', '', { depth: 0 } ],
	[ 2, 1, 'h1', 'Round frame' ],
	[ 3, 1, 'button', 'Which size am I?', { click: 'openSize' } ],
	[ 4, 1, 'a', 'Size guide', { click: 'openSize', attrs: { href: '#' } } ],
	[ 5, 1, 'button', 'Other', { click: 'openOther' } ],
	[ 6, 1, 'button', 'Close', { click: 'closeSize' } ],
	[ 7, 1, 'button', 'Elsewhere', { click: 'noop' } ],
	[ 8, 1, 'span', 'Tap', { click: 'openSize' } ],
	[ 9, 1, 'button', '', { click: 'openSize' } ],
	[ 10, 9, 'span', 'Fit guide', { depth: 2 } ],
];
const SURFACES = ( states = [ { name: 'open', state_keys: { modal: 'size' } } ] ) => ( { 'S-25': { id: 'S-25', kind: 'modal', name: 'Size guide', dc: 'Root', parent: null, roots: [ 'Root/50' ], parts: [], states } } );
const ROW = ( o = {} ) => ( { slug: 'modal-size-guide', postType: 'sgs_modal', title: 'Size guide', draftId: 'surfaces.json S-25', ...o } );

function run( o = {} ) {
	const draft = draftRepo( o.logic );
	const list = o.page ?? PAGE;
	const elements = Object.fromEntries( list.map( ( [ n, p, tag, , x ] ) => [ `Root/${ n }`, rec( n, p, tag, x ) ] ) );
	const factRecord = { schema: '1', client: 'fixture-client', elements, surfaces: o.surfaces ?? SURFACES(), sources: { files: { 'Root.dc.html': draft.hash } } };
	const inventory = { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements: list.map( ( [ n, p, tag, words, x ] ) => el( n, p, tag, words, x ) ) };
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	o.edit && o.edit( f.decisions.rules );
	return proposeSkeleton( { inventory, facts: { ...f, repo: draft.repo }, surface: 'product', surfaceKind: 'surfaceKind' in o ? o.surfaceKind : 'page', surfaceName: o.surfaceName ?? 'Product', db, factRecord, openers: {}, pageMap: o.pageMap ?? [ ROW() ], carried: o.carried ?? null } );
}
const all = ( l ) => l.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const nodeOf = ( r, k ) => all( r.skeleton ).find( ( n ) => n.draftRef?.tpl === k );
const rowOf = ( r, k ) => r.proposal.rows.find( ( x ) => x.key === k );
const frames = ( r ) => all( r.skeleton ).filter( ( n ) => 'sgs/modal' === n.name );

test( 'MUST FAIL: a button and a link whose handlers write the modal\'s opening literal are sgs/button linking #<anchor>, with their labels', () => {
	const r = run();
	for ( const [ k, label ] of [ [ 'Root/3#0', 'Which size am I?' ], [ 'Root/4#0', 'Size guide' ] ] ) {
		const b = nodeOf( r, k );
		assert.equal( b?.name, 'sgs/button', k );
		assert.deepEqual( b.attributes, { label, url: '#modal-size-guide' }, k );
		assert.equal( rowOf( r, k ).rule, 'modalOpener' );
		assert.match( rowOf( r, k ).reason, /opens S-25 \(Size guide\), the modal-size-guide row/ );
	}
	const wrapped = nodeOf( r, 'Root/9#0' );
	assert.deepEqual( wrapped.attributes, { label: 'Fit guide', url: '#modal-size-guide' }, 'a button wrapping its words takes them as its label, the words absorbed' );
	assert.equal( wrapped.innerBlocks.length, 0 );
	assert.notEqual( rowOf( r, 'Root/8#0' ).rule, 'modalOpener', 'only a button or link is a control, whatever its handler' );
} );

test( 'NEGATIVE: a modal own surface opens nothing of itself', () => {
	const own = run( { surfaceKind: 'modal', surfaceName: 'Size guide' } );
	assert.notEqual( rowOf( own, 'Root/3#0' ).rule, 'modalOpener' );
	assert.equal( frames( own ).length, 0 );
	assert.equal( own.proposal.openedModals, undefined );
} );

test( 'MUST FAIL: the page carries one sgs/modal frame for the modal, however many controls open it: its anchor, no trigger, the carried post', () => {
	const bare = run();
	assert.equal( frames( bare ).length, 1 );
	assert.deepEqual( frames( bare )[ 0 ], { name: 'sgs/modal', attributes: { triggerStyle: 'none', anchor: 'modal-size-guide' }, innerBlocks: [] } );
	assert.deepEqual( bare.proposal.openedModals, [ { slug: 'modal-size-guide', anchor: 'modal-size-guide', surface: 'S-25' } ] );
	assert.equal( bare.skeleton.at( -1 ).name, 'sgs/modal', 'the frame stands after the page, outside its layout' );
	const carried = run( { carried: { logo: () => null, menu: () => null, postId: ( type, slug ) => ( 'sgs_modal' === type && 'modal-size-guide' === slug ? { id: 118 } : null ) } } );
	assert.equal( frames( carried )[ 0 ].attributes.modalRef, 118 );
	assert.deepEqual( carried.problems, [] );
	const missing = run( { carried: { logo: () => null, menu: () => null, postId: () => ( { reason: 'page-map.json holds post ids for no site' } ) } } );
	assert.equal( frames( missing )[ 0 ].attributes.modalRef, undefined );
	assert.ok( missing.problems.some( ( p ) => /modal-size-guide modal frame carries no modalRef: page-map\.json holds post ids for no site/.test( p ) ) );
} );

test( 'NEGATIVE: a closer, another modal\'s opener, a control writing no modal key, a page map without the row and the rule removed leave plain controls and no frame', () => {
	const plain = ( o, key, why ) => {
		const r = run( o );
		assert.notEqual( rowOf( r, key ).rule, 'modalOpener', why );
		return r;
	};
	assert.equal( frames( plain( {}, 'Root/6#0', 'a handler writing modal: null closes' ) ).length, 1, 'only the opening controls frame it' );
	plain( {}, 'Root/5#0', 'modal: "other" is no state the size guide opens on' );
	plain( {}, 'Root/7#0', 'a handler writing another key' );
	for ( const [ o, why ] of [ [ { pageMap: [] }, 'no page map row' ], [ { pageMap: [ ROW( { postType: 'sgs_choice_flow' } ) ] }, 'a flow row opens by its product link, not an anchor' ], [ { pageMap: [ ROW( { draftId: 'surfaces.json S-99' } ) ] }, 'a row naming another surface' ], [ { edit: ( R ) => delete R.modalOpener }, 'the rule removed' ] ] ) {
		const r = plain( o, 'Root/3#0', why );
		assert.equal( frames( r ).length, 0, why );
		assert.equal( r.proposal.openedModals, undefined, why );
	}
	assert.equal( frames( run( { surfaces: SURFACES( [ { name: 'open', state_keys: { modal: 'other' } } ] ) } ) ).filter( () => true ).length, 1, 'modal: "other" opens a modal whose state holds that literal, through the other control' );
} );

test( 'MUST FAIL: a modal opening on a key at true is opened by any handler writing the key; a header control leaves a note, never a frame', () => {
	const bool = [ ...PAGE.slice( 0, 4 ), [ 5, 1, 'button', 'Open', { click: 'openBool' } ] ];
	const r = run( { page: bool, surfaces: SURFACES( [ { name: 'open', state_keys: { sizeOpen: true } } ] ) } );
	assert.equal( rowOf( r, 'Root/5#0' ).rule, 'modalOpener' );
	assert.equal( frames( r ).length, 1 );
	const header = run( { surfaceKind: 'header' } );
	assert.equal( rowOf( header, 'Root/3#0' ).rule, 'modalOpener', 'the link is still written' );
	assert.equal( frames( header ).length, 0 );
	assert.match( header.proposal.openerNotes[ 0 ], /modal-size-guide modal is opened from this header surface, which stands on no page/ );
} );

test( 'NEGATIVE: the standing decisions stay valid with the rule', () => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	assert.deepEqual( decisionsProblems( f ), [] );
	assert.equal( f.decisions.rules.modalOpener.block, 'sgs/button' );
} );

test( 'handlerWrites, opensOnWrites, modalTargets and modalFrame read structure', () => {
	const d = draftRepo();
	const record = { sources: { files: { 'Root.dc.html': d.hash } } };
	const of = ( handler ) => handlerWrites( { folder: d.folder, record, component: 'Root', handler } );
	assert.deepEqual( [ ...of( 'openSize' ).entries() ].map( ( [ k, v ] ) => [ k, [ ...v ] ] ), [ [ 'modal', [ 'size' ] ] ] );
	assert.equal( of( 'closeSize' ).size, 0 );
	assert.equal( of( 'missing' ).size, 0 );
	const surface = SURFACES()[ 'S-25' ];
	assert.equal( opensOnWrites( surface, of( 'openSize' ) ), true );
	assert.equal( opensOnWrites( { states: [ { state_keys: { step: 2 } } ] }, of( 'openNum' ) ), true, 'a number is a literal too' );
	assert.equal( opensOnWrites( { states: [ { state_keys: { step: 3 } } ] }, of( 'openNum' ) ), false );
	assert.equal( opensOnWrites( surface, of( 'openOther' ) ), false );
	assert.equal( opensOnWrites( { states: [ { state_keys: { modal: true } } ] }, of( 'openOther' ) ), true, 'a key at true opens on any write' );
	assert.deepEqual( modalTargets( { pageMap: [ ROW(), ROW( { slug: 'x', postType: 'page' } ), ROW( { slug: 'y', draftId: 'Root.dc.html:1:1 <div>' } ) ], surfaces: SURFACES() } ).map( ( t ) => t.anchor ), [ 'modal-size-guide' ] );
	assert.deepEqual( modalTargets( { pageMap: null, surfaces: SURFACES() } ), [] );
	const target = modalTargets( { pageMap: [ ROW() ], surfaces: SURFACES() } )[ 0 ];
	assert.deepEqual( modalFrame( { target, carried: { postId: () => ( { id: 5 } ) } } ), { node: { name: 'sgs/modal', attributes: { triggerStyle: 'none', anchor: 'modal-size-guide', modalRef: 5 }, innerBlocks: [] }, missing: null } );
	assert.equal( modalFrame( { target } ).node.attributes.modalRef, undefined );
} );

test( 'MUST FAIL: the post id a skeleton carries for a page-map row is the id the site build wrote for this site, else the reason it has none', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'modal-opener-ids-' ) );
	const build = path.join( repo, 'sites', 'c', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	const mapFile = path.join( build, 'page-map.json' );
	fs.writeFileSync( mapFile, `${ JSON.stringify( [ { slug: 'modal-size-guide', postType: 'page', id: 9 }, ROW( { id: 118 } ), ROW( { slug: 'modal-fit', id: null } ), ROW( { slug: 'modal-str', id: '7' } ) ], null, 2 ) }
` );
	const at = ( site ) => carriedIds( { repo, client: 'c', site } ).postId;
	assert.equal( at( null )( 'sgs_modal', 'modal-size-guide' ), null, 'no site named: nothing carried' );
	assert.match( at( 't' )( 'sgs_modal', 'modal-size-guide' ).reason, /holds post ids for no site, not t/ );
	writeIdsSite( mapFile, 't' );
	assert.deepEqual( at( 't' )( 'sgs_modal', 'modal-size-guide' ), { id: 118 }, 'the row of the type, never the page of the same slug' );
	assert.match( at( 't' )( 'sgs_modal', 'modal-fit' ).reason, /holds no post id for sgs_modal modal-fit/ );
	assert.match( at( 't' )( 'sgs_modal', 'modal-str' ).reason, /holds no post id for sgs_modal modal-str/, 'an id that is no integer is no post id' );
	assert.match( at( 't' )( 'sgs_modal', 'absent' ).reason, /holds no post id for sgs_modal absent/ );
	assert.match( at( 'other' )( 'sgs_modal', 'modal-size-guide' ).reason, /holds post ids for t, not other/ );
} );
