// The modal frame look (Spec 48 FR-48-6, FR-48-57; register A1, Bean S8 2026-10-28): a modal surface's backdrop, panel and close
// control are the `sgs/modal` frame's own settings and the post holds only the dialog's inner content. The skeleton carries one frame
// node whose draftSlots read the scrim, the dialog and the close at the block's calibrated parts; Fill lifts it out of the post's tree
// and the site build merges its look onto the page's frame by anchor. Synthetic inventories and fact records in the readers' shapes;
// tests marked MUST FAIL fail before the rule, each part with its negative control.
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
import { closesOn } from '../lib/skeleton-handler-opens.mjs';
import { liftModalFrame } from '../lib/fill-modal-frame.mjs';
import { cleanTree } from '../lib/fill-skeleton.mjs';
import { framedTreeFile, framesIn, mergeModalFrames } from '../lib/site-build-modal-frame.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const LOGIC = `class Component {
	state = { modal: null };
	renderVals() {
		return { closeSize: () => this.setState( { modal: null } ), noop: () => this.setState( { page: 'x' } ) };
	}
}`;
const draftRepo = () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'modal-frame-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const text = `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ LOGIC }\n</script>\n`;
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), text );
	return { repo, hash: crypto.createHash( 'sha256' ).update( text ).digest( 'hex' ) };
};
const FULL = { 375: { x: 0, y: 0, w: 375, h: 900 }, 768: { x: 0, y: 0, w: 768, h: 900 }, 1440: { x: 0, y: 0, w: 1440, h: 900 } };
const small = ( n ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 10 * n, y: 40, w: 80, h: 20 } ] ) );
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );
const el = ( n, parent, tag, words, o = {} ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth: parent ? 1 : 0, tag, template: 'Root', tpl: n, attrs: o.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words,
	snippet: `<${ tag } data-dc-tpl="${ n }"${ o.click ? ` sc-camel-on-click="{{ ${ o.click } }}"` : '' }>${ words }</${ tag }>`, visible: at( true ), box: o.box || small( n ), position: at( o.position || 'static' ), display: 'block', widths: [ 375, 768, 1440 ], flexDirection: 'row' } );
const rec = ( n, parent, tag, o = {} ) => ( { template: { key: `Root/${ n }`, component: 'Root', n: String( n ), tag, realTag: tag, attrs: o.click ? { onClick: `{{ ${ o.click } }}` } : {}, style: { static: [], holes: [] }, pseudo: {}, holes: [],
	parent: parent ? `Root/${ parent }` : null, realParent: parent ? `Root/${ parent }` : null, parentChain: parent ? [ `Root/${ parent }` ] : [], membership: { scIf: [], scFor: [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: [], words: '', srcLine: n }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );

// The size guide modal: the overlay root (1), its backdrop (2), the dialog panel (3) holding a header (4) with a title (5) and the
// close control (6), and a body paragraph (7).
const DIALOG_BOX = { 375: { x: 20, y: 40, w: 335, h: 400 }, 768: { x: 20, y: 40, w: 700, h: 400 }, 1440: { x: 360, y: 40, w: 720, h: 400 } };
const MODAL = [
	[ 1, null, 'div', '', { position: 'fixed', box: FULL } ],
	[ 2, 1, 'div', '', { position: 'absolute', box: FULL, click: 'closeSize' } ],
	[ 3, 1, 'div', '', { attrs: { role: 'dialog' }, box: DIALOG_BOX } ],
	[ 4, 3, 'div', '' ],
	[ 5, 4, 'span', 'Which size am I?' ],
	[ 6, 4, 'button', '×', { click: 'closeSize' } ],
	[ 7, 3, 'p', 'The quickest way: pick up a pair of glasses you already like.' ],
];
const SURFACES = { 'S-25': { id: 'S-25', kind: 'modal', name: 'Size guide', dc: 'Root', parent: null, roots: [ 'Root/1' ], parts: [], states: [ { name: 'open', state_keys: { modal: 'size' } } ] } };
const ROW = { slug: 'modal-size-guide', postType: 'sgs_modal', title: 'Size guide', draftId: 'surfaces.json S-25' };
const CAL = { scrimColour: { slot: '@scrim::before' }, scrimBlur: { slot: '@scrim' }, modalBackground: { slot: '.sgs-modal__dialog' }, dialogWidth: { slot: '.sgs-modal__dialog' }, closeColourText: { slot: '.sgs-modal__dialog > .sgs-modal__close' }, closeColourBackground: { slot: '.sgs-modal__dialog > .sgs-modal__close::after' } };

// The list with the element numbered `n` replaced by `row`.
const swap = ( n, row ) => MODAL.map( ( x ) => ( n === x[ 0 ] ? row : x ) );

function run( o = {} ) {
	const draft = draftRepo();
	const list = o.modal ?? MODAL;
	const elements = Object.fromEntries( list.map( ( [ n, p, tag, , x ] ) => [ `Root/${ n }`, rec( n, p, tag, x ) ] ) );
	const factRecord = { schema: '1', client: 'fixture-client', elements, surfaces: o.surfaces ?? SURFACES, sources: { files: { 'Root.dc.html': draft.hash } } };
	const inventory = { checks: {}, source: 'fixture', root: 'div', generated: 'fixture', elements: list.map( ( [ n, p, tag, words, x ] ) => el( n, p, tag, words, x ) ) };
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	o.edit && o.edit( f.decisions.rules );
	return proposeSkeleton( { inventory, facts: { ...f, repo: draft.repo }, surface: 'size-guide', surfaceKind: o.kind ?? 'modal', surfaceName: 'Size guide', db, factRecord, openers: {}, pageMap: o.pageMap ?? [ ROW ], surfaceId: 'S-25', calSettings: ( b ) => ( 'sgs/modal' === b ? CAL : {} ), ...( o.built ? { built: o.built } : {} ) } );
}
const all = ( l ) => l.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const frameOf = ( r ) => r.skeleton.find( ( n ) => true === n.modalFrame );
const refs = ( r ) => all( r.skeleton.filter( ( n ) => ! n.modalFrame ) ).map( ( n ) => n.draftRef?.tpl );
const rowOf = ( r, n ) => r.proposal.rows.find( ( x ) => x.key === `Root/${ n }#0` );

test( 'MUST FAIL: the modal skeleton carries a frame node reading the scrim, the dialog and the close at the block\'s calibrated parts, and the post holds only the dialog\'s inner content', () => {
	const r = run();
	assert.deepEqual( r.problems, [] );
	const f = frameOf( r );
	assert.equal( f.name, 'sgs/modal' );
	assert.deepEqual( f.attributes, { triggerStyle: 'none', anchor: 'modal-size-guide' } );
	assert.equal( f.draftRef.tpl, 'Root/1#0' );
	assert.deepEqual( f.draftSlots, { '@scrim': { tpl: 'Root/2#0' }, '.sgs-modal__dialog': { tpl: 'Root/3#0' }, '.sgs-modal__dialog > .sgs-modal__close': { tpl: 'Root/6#0' } } );
	assert.deepEqual( refs( r ), [ 'Root/4#0', 'Root/5#0', 'Root/7#0' ], 'the post holds the header, its title and the body: no overlay, backdrop, panel or close' );
	assert.deepEqual( [ 2, 6 ].map( ( n ) => rowOf( r, n ).into ), [ 'Root/1#0', 'Root/1#0' ], 'the backdrop and the close go into the frame' );
	assert.equal( rowOf( r, 1 ).slotNotes, undefined, 'the dialog reads no sub-parts: the close is a part of its own, not a child of the panel' );
	assert.deepEqual( [ 1, 2, 3, 6 ].map( ( n ) => [ rowOf( r, n ).rule, rowOf( r, n ).action ] ), [ [ 'modalFrame', 'unwrap' ], [ 'modalFrame', 'absorbed' ], [ 'modalFrame', 'unwrap' ], [ 'modalFrame', 'absorbed' ] ] );
} );

test( 'MUST FAIL: a modal surface with a hand-built reference post still carries its frame node; the post settles nothing', () => {
	const r = run( { built: { site: 'canary', postType: 'sgs_modal', postId: 9 } } );
	assert.equal( frameOf( r ).name, 'sgs/modal' );
	assert.deepEqual( refs( r ), [ 'Root/4#0', 'Root/5#0', 'Root/7#0' ] );
	assert.equal( rowOf( r, 1 ).rule, 'modalFrame' );
} );

test( 'NEGATIVE: a handler that does not close, a backdrop that does not cover the overlay, a panel without role dialog, a page surface and the rule removed leave the parts as ordinary blocks', () => {
	const noClose = run( { modal: swap( 6, [ 6, 4, 'button', '×', { click: 'noop' } ] ) } );
	assert.equal( frameOf( noClose ).draftSlots[ '.sgs-modal__dialog > .sgs-modal__close' ], undefined, 'a handler writing another key is no close' );
	assert.ok( refs( noClose ).includes( 'Root/6#0' ), 'the control stays a block' );
	const partial = run( { modal: swap( 2, [ 2, 1, 'div', '', { position: 'absolute', box: small( 2 ) } ] ) } );
	assert.equal( frameOf( partial ).draftSlots[ '@scrim' ], undefined, 'a layer that does not cover the overlay is no backdrop' );
	const words = run( { modal: swap( 2, [ 2, 1, 'div', 'Hello', { position: 'absolute', box: FULL } ] ) } );
	assert.equal( frameOf( words ).draftSlots[ '@scrim' ], undefined, 'a layer holding words is no backdrop' );
	const plain = run( { modal: swap( 3, [ 3, 1, 'div', '', { box: DIALOG_BOX } ] ) } );
	assert.equal( frameOf( plain ), undefined, 'no dialog element: no frame' );
	assert.equal( rowOf( plain, 1 ).rule, null );
	for ( const [ o, why ] of [ [ { kind: 'page' }, 'a page surface' ], [ { edit: ( R ) => delete R.modalFrame }, 'the rule removed' ] ] ) {
		const r = run( o );
		assert.equal( frameOf( r ), undefined, why );
		assert.notEqual( rowOf( r, 2 ).rule, 'modalFrame', why );
	}
} );

test( 'NEGATIVE: a backdrop that is static or holds children, a close outside the dialog and a closing span are not frame parts', () => {
	const staticLayer = run( { modal: swap( 2, [ 2, 1, 'div', '', { position: 'static', box: FULL } ] ) } );
	assert.equal( frameOf( staticLayer ).draftSlots[ '@scrim' ], undefined, 'a layer in the flow is no backdrop' );
	const holder = run( { modal: [ ...MODAL, [ 8, 2, 'i', '' ] ] } );
	assert.equal( frameOf( holder ).draftSlots[ '@scrim' ], undefined, 'a layer holding an element is no backdrop' );
	const outside = run( { modal: swap( 6, [ 6, 1, 'button', '×', { click: 'closeSize' } ] ) } );
	assert.equal( frameOf( outside ).draftSlots[ '.sgs-modal__dialog > .sgs-modal__close' ], undefined, 'a control outside the dialog is not the close of the dialog' );
	const nested = run( { modal: [ MODAL[ 0 ], MODAL[ 2 ], [ 2, 3, 'div', '', { position: 'absolute', box: FULL } ], ...MODAL.slice( 3 ) ] } );
	assert.equal( frameOf( nested ).draftSlots[ '@scrim' ], undefined, 'a layer inside the panel is no backdrop of the overlay' );
	const wide = run( { modal: [ MODAL[ 0 ], [ 3, 1, 'div', '', { attrs: { role: 'dialog' }, position: 'absolute', box: FULL } ], MODAL[ 1 ], ...MODAL.slice( 3 ) ] } );
	assert.equal( frameOf( wide ).draftSlots[ '@scrim' ].tpl, 'Root/2#0', 'a panel that fills the overlay is the dialog, never the backdrop' );
	const drawer = run( { kind: 'drawer', surfaces: { 'S-25': { ...SURFACES[ 'S-25' ], kind: 'drawer' } } } );
	assert.equal( frameOf( drawer ), undefined, 'a drawer surface has no modal frame' );
	const span = run( { modal: swap( 6, [ 6, 4, 'span', '×', { click: 'closeSize' } ] ) } );
	assert.equal( frameOf( span ).draftSlots[ '.sgs-modal__dialog > .sgs-modal__close' ], undefined, 'only a button or link is a control' );
} );

test( 'MUST FAIL: a modal with no page map row carries a frame without an anchor and says so; the decisions stay valid', () => {
	const r = run( { pageMap: [] } );
	assert.equal( frameOf( r ).attributes.anchor, undefined );
	assert.match( rowOf( r, 1 ).slotNotes.join( ' ' ), /no sgs_modal row in the page map/ );
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	assert.deepEqual( decisionsProblems( f ), [] );
	f.decisions = structuredClone( f.decisions );
	f.decisions.rules.modalFrame.names.close = 'nonsense';
	assert.match( decisionsProblems( f ).join( ' ' ), /rules\.modalFrame\.names\.close names nonsense/ );
} );

test( 'closesOn: a state holding the key at true or at a literal is closed by clearing it, never by a key it does not hold', () => {
	const s = ( v ) => ( { states: [ { state_keys: { modal: v } } ] } );
	assert.equal( closesOn( s( 'size' ), new Set( [ 'modal' ] ) ), true );
	assert.equal( closesOn( s( true ), new Set( [ 'modal' ] ) ), true );
	assert.equal( closesOn( s( 'size' ), new Set( [ 'other' ] ) ), false );
	assert.equal( closesOn( s( false ), new Set( [ 'modal' ] ) ), false, 'a state that holds the key false is the closed state' );
	assert.equal( closesOn( null, new Set( [ 'modal' ] ) ), false );
} );

test( 'MUST FAIL: Fill lifts the frame node out of the post\'s tree and keeps its written look; a skeleton with no frame lifts nothing', () => {
	const r = run();
	const tree = cleanTree( r.skeleton );
	const frame = tree.find( ( n ) => 'sgs/modal' === n.name );
	assert.equal( frame.modalFrame, undefined, 'the marker is a draft key, never built' );
	frame.attributes.scrimColour = '#141414';
	frame.attributes.className = 'cr-ref-size-guide-9 keep-me';
	const lifted = liftModalFrame( { skeleton: r.skeleton, tree } );
	assert.deepEqual( lifted, { anchor: 'modal-size-guide', attributes: { triggerStyle: 'none', anchor: 'modal-size-guide', scrimColour: '#141414', className: 'keep-me' } } );
	assert.equal( tree.some( ( n ) => 'sgs/modal' === n.name ), false );
	assert.equal( all( tree ).some( ( n ) => undefined !== n.modalFrame ), false );
	const none = [ { name: 'sgs/container', attributes: {}, innerBlocks: [] } ];
	assert.equal( liftModalFrame( { skeleton: none, tree: cleanTree( none ) } ), null );
} );

test( 'MUST FAIL: the page\'s frame takes the look of the frame record with its anchor, keeping its own modalRef; another anchor and a page with no frame are untouched', () => {
	const frames = { 'modal-size-guide': { anchor: 'modal-size-guide', attributes: { triggerStyle: 'none', anchor: 'modal-size-guide', scrimColour: '#141414', modalRef: 1 } } };
	const page = [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/modal', attributes: { triggerStyle: 'none', anchor: 'modal-size-guide', modalRef: 118 }, innerBlocks: [] }, { name: 'sgs/modal', attributes: { anchor: 'modal-other' }, innerBlocks: [] }, { name: 'sgs/container', attributes: { anchor: 'modal-size-guide' }, innerBlocks: [] } ] } ];
	const out = mergeModalFrames( page, frames );
	assert.deepEqual( out.merged, [ 'modal-size-guide' ] );
	assert.deepEqual( out.tree[ 0 ].innerBlocks[ 0 ].attributes, { triggerStyle: 'none', anchor: 'modal-size-guide', scrimColour: '#141414', modalRef: 118 } );
	assert.deepEqual( out.tree[ 0 ].innerBlocks[ 1 ].attributes, { anchor: 'modal-other' } );
	assert.deepEqual( out.tree[ 0 ].innerBlocks[ 2 ].attributes, { anchor: 'modal-size-guide' }, 'an HTML anchor on another block is no frame' );
	assert.equal( page[ 0 ].innerBlocks[ 0 ].attributes.scrimColour, undefined, 'the input is not changed' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'modal-frame-site-' ) );
	const file = path.join( dir, 'filled.tree.json' );
	fs.writeFileSync( file, JSON.stringify( page ) );
	const made = framedTreeFile( { treeFile: file, frames, outDir: dir } );
	assert.deepEqual( made.merged, [ 'modal-size-guide' ] );
	assert.equal( JSON.parse( fs.readFileSync( made.file, 'utf8' ) )[ 0 ].innerBlocks[ 0 ].attributes.scrimColour, '#141414' );
	assert.equal( framedTreeFile( { treeFile: file, frames: {}, outDir: dir } ), null, 'no record: build the tree as it is' );
	assert.equal( framedTreeFile( { treeFile: file, frames: { 'modal-x': { anchor: 'modal-x', attributes: {} } }, outDir: dir } ), null, 'no frame with a record anchor' );
} );

test( 'framesIn reads the newest modal-frame.json of each surface', () => {
	const fill = fs.mkdtempSync( path.join( os.tmpdir(), 'modal-frame-fill-' ) );
	const put = ( surface, stamp, record ) => {
		fs.mkdirSync( path.join( fill, surface, stamp ), { recursive: true } );
		record && fs.writeFileSync( path.join( fill, surface, stamp, 'modal-frame.json' ), JSON.stringify( record ) );
	};
	put( 'size-guide', '2026-10-28-a', { anchor: 'modal-size-guide', attributes: { scrimColour: 'old' } } );
	put( 'size-guide', '2026-10-29-b', { anchor: 'modal-size-guide', attributes: { scrimColour: 'new' } } );
	put( 'size-guide', '2026-10-30-c', null );
	put( 'header', '2026-10-29-b', null );
	assert.deepEqual( Object.entries( framesIn( fill ) ).map( ( [ k, v ] ) => [ k, v.attributes.scrimColour ] ), [ [ 'modal-size-guide', 'new' ] ] );
	assert.deepEqual( framesIn( path.join( fill, 'missing' ) ), {} );
} );
