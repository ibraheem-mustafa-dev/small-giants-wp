// Spec 48 FR-48-95: a draft control that opens a modal or a flow is a button linking the target's anchor, and the target's
// frame (an sgs/modal with no trigger, holding the linked flow for a flow) is placed once, on the footer or header when they
// open it, else on each page that does; the modal post keeps only its dialog's inner content (lib/skeleton-openers.mjs,
// called by lib/skeleton-rules.mjs::makeRules and lib/skeleton-propose.mjs::proposeSkeleton). Fixture
// tests/fixtures/surface-frames: one draft component, Shop. The product page's buy box opens the size guide and the lens
// flow; the footer's "Size guide" link opens the size guide; the size guide is a fixed root holding a backdrop that closes it
// on click, a dialog panel and a close button; the lens flow's root paints an opaque background and holds its own Close.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openerTargets, controlWrites, openedBy, openerAttributes, frameParts, frameNode, frameLook, frameHosts, surfaceFrames, modalPostTree, surfaceRow, surfaceOpenerControls, openerListItems, frameSettings } from '../lib/skeleton-openers.mjs';
import { openDb } from '../lib/db.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import os from 'os';
import { E, R0, build, facts as fixtureFacts } from './fixtures/choice-flow-fixture.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'surface-frames' );
const FACTS = JSON.parse( fs.readFileSync( path.join( FOLDER, 'facts.json' ), 'utf8' ) );
const R = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ).rules;
const S = R.surfaceOpener;
const MODAL = 'modal-size-guide';
const FLOW = 'choice-flow-lens';
const PAGE_MAP = () => [
	{ slug: 'product', postType: 'product', route: 'product', opens: [ { kind: 'modal', slug: MODAL }, { kind: 'flow', slug: FLOW, buyBox: true } ] },
	{ slug: 'help', postType: 'page', route: 'help' },
	{ slug: 'footer', postType: 'sgs_footer', draftId: 'surfaces.json S-06', opens: [ { kind: 'modal', slug: MODAL } ] },
	{ slug: MODAL, postType: 'sgs_modal', draftId: 'surfaces.json S-25' },
	{ slug: FLOW, postType: 'sgs_choice_flow', draftId: 'surfaces.json S-27' },
];
const db = openDb();
const settings = frameSettings( db, S.frame.block );
const has = ( b, a ) => !! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( b, a );
const targets = () => openerTargets( { pageMap: PAGE_MAP(), folder: FOLDER } );
const writes = ( handler ) => controlWrites( { folder: FOLDER, component: 'Shop', handler } );

test( 'MUST FAIL: a control opening a modal or a flow is a button linking the target\'s anchor; any other control opens nothing', () => {
	assert.deepEqual( targets().map( ( t ) => [ t.kind, t.slug, t.recordId, t.writes ] ), [ [ 'modal', MODAL, 'S-25', [ 'modal="size"' ] ], [ 'flow', FLOW, 'S-27', [ 'lens.open=true' ] ] ] );
	assert.deepEqual( targets().map( ( t ) => [ ...t.components ] ), [ [ 'Shop' ], [ 'Shop' ] ], 'a call naming no component runs on the record\'s own (dc)' );
	assert.equal( openedBy( writes( 'openSize' ), targets(), null, 'Shop' )?.slug, MODAL );
	assert.equal( openedBy( writes( '{{ openLens }}' ), targets(), null, 'Shop' )?.slug, FLOW );
	assert.equal( openedBy( writes( 'o.openSize' ), targets(), null, 'Shop' )?.slug, MODAL, 'a loop item\'s handler is read by its own name' );
	for ( const h of [ 'toHelp', 'closeSize', 'closeLens', 'nothing', '' ] ) {
		assert.equal( openedBy( writes( h ), targets(), null, 'Shop' ), null, h );
	}
	assert.equal( openedBy( writes( 'openSize' ), targets(), 'S-25', 'Shop' ), null, 'a control on the modal\'s own surface opens nothing' );
	assert.deepEqual( openerAttributes( targets()[ 0 ], 'Which size am I?', S ), { label: 'Which size am I?', url: '#modal-size-guide' } );
	assert.deepEqual( openerAttributes( targets()[ 0 ], '', S ), { url: '#modal-size-guide' } );
} );

test( 'MUST FAIL: the draft\'s frame is read part by part: root, backdrop, panel, close, and whether the backdrop closes it', () => {
	const t = targets();
	assert.deepEqual( frameParts( { factRecord: FACTS, surfaceId: 'S-25', folder: FOLDER, opening: t[ 0 ].writes } ), { root: 'Shop/10', backdrop: 'Shop/11', panel: 'Shop/12', close: 'Shop/15', closesOnBackdrop: true } );
	assert.deepEqual( frameParts( { factRecord: FACTS, surfaceId: 'S-27', folder: FOLDER, opening: t[ 1 ].writes } ), { root: 'Shop/18', backdrop: 'Shop/18', panel: 'Shop/19', close: 'Shop/20', closesOnBackdrop: false } );
	assert.deepEqual( frameParts( { factRecord: FACTS, surfaceId: 'S-99', folder: FOLDER } ), { root: null, backdrop: null, panel: null, close: null, closesOnBackdrop: false } );
	const look = frameLook( { S, parts: frameParts( { factRecord: FACTS, surfaceId: 'S-25', folder: FOLDER, opening: t[ 0 ].writes } ), factRecord: FACTS, settings } );
	assert.deepEqual( look.map( ( l ) => [ l.part, l.attr, l.value ] ), [
		[ 'backdrop', 'scrimColour', 'rgba(20, 20, 20, 0.5)' ],
		[ 'dialog', 'borderColour', 'rgb(230, 225, 218)' ],
		[ 'dialog', 'borderStyle', 'solid' ],
		[ 'dialog', 'borderWidth', '1px' ],
		[ 'dialog', 'modalBackground', 'rgb(250, 248, 245)' ],
		[ 'close', 'closeColourText', 'rgb(20, 20, 20)' ],
	], 'a transparent close background paints nothing' );
} );

test( 'MUST FAIL: the frame node carries structure only: anchor, no trigger, backdrop close, full screen for an opaque backdrop, the linked flow', () => {
	const [ modal, flow ] = targets();
	const m = frameNode( { target: modal, S, flowBlock: R.choiceFlow.block, parts: frameParts( { factRecord: FACTS, surfaceId: 'S-25', folder: FOLDER, opening: modal.writes } ), factRecord: FACTS, settings, has } );
	assert.deepEqual( m.node, { name: 'sgs/modal', attributes: { anchor: MODAL, triggerStyle: 'none', closeOnOverlay: true }, innerBlocks: [], handover: [ { owner: 'behaviour', kind: 'link', detail: 'sgs/modal modalRef: the id of the modal-size-guide post (the frame names its post by id only)' } ] } );
	assert.match( m.notes[ 0 ], /scrimColour rgba\(20, 20, 20, 0\.5\) \(backdrop, Shop\/11\)/ );
	const f = frameNode( { target: flow, S, flowBlock: R.choiceFlow.block, parts: frameParts( { factRecord: FACTS, surfaceId: 'S-27', folder: FOLDER, opening: flow.writes } ), factRecord: FACTS, settings, has } );
	assert.deepEqual( f.node, { name: 'sgs/modal', attributes: { anchor: FLOW, triggerStyle: 'none', size: 'fullscreen' }, innerBlocks: [ { name: 'sgs/choice-flow', attributes: { flowIsLinked: true, flowId: FLOW }, innerBlocks: [] } ] } );
} );

test( 'MUST FAIL: the frame goes full screen for any opaque backdrop colour, whatever its notation, and for no translucent or unknown one', () => {
	const [ , flow ] = targets();
	const parts = frameParts( { factRecord: FACTS, surfaceId: 'S-27', folder: FOLDER, opening: flow.writes } );
	// The lens flow's backdrop (its root) declares the colour under test.
	const sized = ( colour ) => {
		const facts = JSON.parse( JSON.stringify( FACTS ) );
		facts.elements[ 'Shop/18' ].template.style.static.find( ( [ k ] ) => 'background-color' === k )[ 1 ] = colour;
		return 'fullscreen' === frameNode( { target: flow, S, flowBlock: R.choiceFlow.block, parts, factRecord: facts, settings, has } ).node.attributes.size;
	};
	for ( const opaque of [ 'rgb(250, 248, 245)', '#000', '#FAF8F5', '#faf8f5ff', 'black', 'White', 'rgba(0, 0, 0, 1)', 'rgb(0 0 0 / 100%)', 'hsl(30 40% 96%)' ] ) {
		assert.equal( sized( opaque ), true, opaque );
	}
	// Negative controls: a translucent colour, in any notation, and a value the route cannot resolve are not opaque.
	for ( const open of [ 'rgb(0 0 0 / 50%)', 'rgb(0, 0, 0, 0.5)', 'rgba(20, 20, 20, 0.5)', '#00000080', 'hsl(0 0% 0% / 0.4)', 'var(--scrim)', 'linear-gradient(#000, #fff)' ] ) {
		assert.equal( sized( open ), false, open );
	}
} );

test( 'MUST FAIL: the footer hosts a frame every page opens; a page hosts only what no footer or header opens', () => {
	const rows = PAGE_MAP();
	const [ modal, flow ] = targets();
	assert.deepEqual( rows.filter( frameHosts( rows, modal, S ) ).map( ( r ) => r.slug ), [ 'footer' ] );
	assert.deepEqual( rows.filter( frameHosts( rows, flow, S ) ).map( ( r ) => r.slug ), [ 'product' ] );
	const noFooter = rows.map( ( r ) => ( 'footer' === r.slug ? { ...r, opens: undefined } : r ) );
	assert.deepEqual( noFooter.filter( frameHosts( noFooter, modal, S ) ).map( ( r ) => r.slug ), [ 'product' ] );
	const place = ( row ) => {
		const tree = [ { name: 'sgs/container', attributes: {}, innerBlocks: [] } ];
		const r = surfaceFrames( { tree, targets: targets(), row, pageMap: rows, R, factRecord: FACTS, folder: FOLDER, settings, has } );
		return { tree, r };
	};
	assert.deepEqual( place( rows[ 2 ] ).tree.slice( 1 ).map( ( n ) => n.attributes.anchor ), [ MODAL ] );
	assert.deepEqual( place( rows[ 0 ] ).tree.slice( 1 ).map( ( n ) => n.attributes.anchor ), [ FLOW ] );
	assert.deepEqual( place( rows[ 1 ] ).tree.length, 1, 'a page opening nothing gets no frame' );
	assert.deepEqual( place( null ).tree.length, 1 );
	assert.deepEqual( surfaceFrames( { tree: [], targets: targets(), row: rows[ 2 ], pageMap: rows, R: {}, factRecord: FACTS, folder: FOLDER } ), { placed: [], notes: [] }, 'no rule, no frame' );
} );

// c00f466ea (lost in the 2026-11-02 rewind) kept a modal frame root's overlay placement read open (fixed, inset 0, z-index)
// off the closed sgs/modal wrapper, where it was an invisible full-screen sheet taking every click. Today the frame node is
// built from the page map and carries no draft element, so Fill measures nothing for it and no writer can put that placement
// there; this pins that, so a later change that measures the frame (to write its look) meets c00f466ea's rule first.
test( 'the frame node is never measured: it carries no draft element, so Fill writes no resting style on the closed wrapper', () => {
	const tree = [ { name: 'sgs/container', attributes: {}, innerBlocks: [] } ];
	const rows = PAGE_MAP();
	surfaceFrames( { tree, targets: openerTargets( { pageMap: rows, folder: FOLDER } ), row: rows[ 0 ], pageMap: rows, R, factRecord: FACTS, folder: FOLDER, settings, has } );
	const frames = skeletonNodes( tree ).filter( ( n ) => S.frame.block === n.name );
	assert.equal( frames.length, 1 );
	assert.deepEqual( frames.map( ( n ) => [ n.targets.length, n.node.draftRef, n.node.draftSlots ] ), [ [ 0, undefined, undefined ] ] );
} );

// MUST FAIL: on the 2026-11-19 lab run Eye Care's lens flow rendered twice on a linked product (`.sgs-choice-flow` count 2):
// the route's own frame, which nothing opened, and the frame the buy box wires for the product's linked flow.
test( 'MUST FAIL: a product row gets no frame for the flow its product link wires through the buy box', () => {
	const place = ( product ) => {
		const rows = PAGE_MAP().map( ( r ) => ( 'product' === r.slug ? { ...r, ...product } : r ) );
		const tree = [ { name: 'sgs/container', attributes: {}, innerBlocks: [] } ];
		const r = surfaceFrames( { tree, targets: openerTargets( { pageMap: rows, folder: FOLDER } ), row: rows[ 0 ], pageMap: rows, R, factRecord: FACTS, folder: FOLDER, settings, has } );
		return { anchors: tree.slice( 1 ).map( ( n ) => n.attributes.anchor ), notes: r.notes };
	};
	const linked = place( { opensFlow: FLOW } );
	assert.deepEqual( linked.anchors, [], 'the buy box draws the linked flow\'s frame' );
	assert.ok( linked.notes.some( ( n ) => /choice-flow-lens: the product link wires it through the buy box/.test( n ) ) );
	// Negative controls: a row with no flow link, or whose flow entry is not the buy box's, keeps the route's frame.
	assert.deepEqual( place( {} ).anchors, [ FLOW ] );
	assert.deepEqual( place( { opensFlow: FLOW, opens: [ { kind: 'modal', slug: MODAL }, { kind: 'flow', slug: FLOW } ] } ).anchors, [ FLOW ] );
	assert.deepEqual( place( { opensFlow: 'choice-flow-other' } ).anchors, [ FLOW ] );
} );

// MUST FAIL: the lab run of 2026-11-19 (Eye Care) pushed the size-guide frame beside sgs/site-footer, and the build refuses a
// footer tree that is not exactly one sgs/site-footer; the frame also had no modalRef, so the help page's link opened nothing.
test( 'MUST FAIL: a footer or header tree takes the frame in its root block\'s last row, and a modal frame names its post by the row\'s id', () => {
	const rowsOf = ( root, slots ) => [ { name: root, attributes: {}, innerBlocks: slots.map( ( s ) => ( { name: `${ root }-row`, attributes: { rowSlot: s }, innerBlocks: [ { name: 'sgs/text', attributes: {} } ] } ) ) } ];
	const map = PAGE_MAP().map( ( r ) => ( MODAL === r.slug ? { ...r, id: 118 } : r ) );
	const footer = rowsOf( 'sgs/site-footer', [ 'top', 'columns', 'bottom' ] );
	const placed = surfaceFrames( { tree: footer, targets: openerTargets( { pageMap: map, folder: FOLDER } ), row: map[ 2 ], pageMap: map, R, factRecord: FACTS, folder: FOLDER, settings, has } );
	assert.deepEqual( placed.placed, [ MODAL ] );
	assert.equal( footer.length, 1, 'the footer tree stays one sgs/site-footer' );
	assert.deepEqual( footer[ 0 ].innerBlocks.map( ( r ) => r.innerBlocks.map( ( n ) => n.name ) ), [ [ 'sgs/text' ], [ 'sgs/text' ], [ 'sgs/text', 'sgs/modal' ] ], 'the frame sits in the bottom row' );
	const frame = footer[ 0 ].innerBlocks[ 2 ].innerBlocks[ 1 ];
	assert.equal( frame.attributes.anchor, MODAL );
	assert.equal( frame.attributes.modalRef, 118 );
	assert.equal( frame.handover, undefined, 'a resolved post needs no handover' );
	// The header's rows in a shuffled order: the template's last row (bottom) holds it.
	const header = rowsOf( 'sgs/site-header', [ 'top', 'bottom', 'middle' ] );
	const hmap = map.map( ( r ) => ( 'footer' === r.slug ? { ...r, postType: 'sgs_header' } : r ) );
	surfaceFrames( { tree: header, targets: openerTargets( { pageMap: hmap, folder: FOLDER } ), row: hmap[ 2 ], pageMap: hmap, R, factRecord: FACTS, folder: FOLDER, settings, has } );
	assert.deepEqual( header[ 0 ].innerBlocks.map( ( r ) => [ r.attributes.rowSlot, r.innerBlocks.length ] ), [ [ 'top', 1 ], [ 'bottom', 2 ], [ 'middle', 1 ] ] );
	// Negative controls: one root that is no slotted container keeps the frame beside it; a modal row with no id keeps the handover.
	const page = rowsOf( 'sgs/container', [ 'top', 'bottom' ] );
	const plain = PAGE_MAP();
	surfaceFrames( { tree: page, targets: targets(), row: plain[ 2 ], pageMap: plain, R, factRecord: FACTS, folder: FOLDER, settings, has } );
	assert.deepEqual( page.map( ( n ) => n.name ), [ 'sgs/container', 'sgs/modal' ] );
	assert.equal( page[ 1 ].attributes.modalRef, undefined );
	assert.match( page[ 1 ].handover[ 0 ].detail, /modalRef: the id of the modal-size-guide post/ );
	assert.equal( openerTargets( { pageMap: map.map( ( r ) => ( MODAL === r.slug ? { ...r, id: '118' } : r ) ), folder: FOLDER } )[ 0 ].postId, undefined, 'an id that is not a number names no post' );
} );

test( 'MUST FAIL: the modal post keeps only its dialog\'s inner content', () => {
	const node = ( key, name, kids = [] ) => ( { name, attributes: {}, key, innerBlocks: kids } );
	const tree = [ node( 'Shop/10', 'sgs/container', [ node( 'Shop/12', 'sgs/container', [ node( 'Shop/13', 'sgs/container', [ node( 'Shop/14', 'sgs/text' ), node( 'Shop/15', 'sgs/button' ) ] ), node( 'Shop/16', 'sgs/text' ) ] ) ] ) ];
	const parts = { root: 'Shop/10', backdrop: 'Shop/11', panel: 'Shop/12', close: 'Shop/15' };
	const kept = modalPostTree( tree, parts, ( n ) => n.key );
	assert.deepEqual( kept.map( ( n ) => [ n.key, n.innerBlocks.map( ( k ) => k.key ) ] ), [ [ 'Shop/13', [ 'Shop/14' ] ], [ 'Shop/16', [] ] ] );
	const own = [ ...JSON.parse( JSON.stringify( tree ) ) ];
	const r = surfaceFrames( { tree: own, targets: targets(), row: PAGE_MAP()[ 3 ], pageMap: PAGE_MAP(), R, factRecord: FACTS, folder: FOLDER, settings, has, keyOf: ( n ) => n.key } );
	assert.deepEqual( own.map( ( n ) => n.key ), [ 'Shop/13', 'Shop/16' ] );
	assert.match( r.notes.at( -1 ), /holds only its dialog's inner content/ );
} );

test( 'MUST FAIL: a surface is its page-map row by record, by route or by slug; a list item opening a target links its anchor', () => {
	const rows = PAGE_MAP();
	assert.equal( surfaceRow( { pageMap: rows, surfaceId: 'S-06', folder: FOLDER } )?.slug, 'footer' );
	assert.equal( surfaceRow( { pageMap: rows, surfaceId: 'S-10', surface: 'page-product', folder: FOLDER } )?.slug, 'product' );
	assert.equal( surfaceRow( { pageMap: rows, surface: 'help', folder: FOLDER } )?.slug, 'help' );
	assert.equal( surfaceRow( { pageMap: rows, surfaceId: 'S-99', surface: 'nowhere', folder: FOLDER } ), null );
	const controls = surfaceOpenerControls( { factRecord: FACTS, surfaceId: 'S-06', targets: targets(), folder: FOLDER } );
	assert.deepEqual( controls, [ { key: 'Shop/7', words: 'Size guide', slug: MODAL } ] );
	const tree = [ { name: 'sgs/icon-list', attributes: { items: [ { text: 'Help' }, { text: 'Size  guide' }, { text: 'Size guide', url: '/sizes/' } ] }, innerBlocks: [] } ];
	assert.deepEqual( openerListItems( tree, controls, { text: 'text', url: 'url' } ), [ 'Size guide' ] );
	assert.deepEqual( tree[ 0 ].attributes.items, [ { text: 'Help' }, { text: 'Size  guide', url: '#modal-size-guide' }, { text: 'Size guide', url: '/sizes/' } ], 'an item already linked keeps its link' );
	assert.deepEqual( openerListItems( tree, controls, null ), [] );
	assert.deepEqual( surfaceOpenerControls( { factRecord: FACTS, surfaceId: 'S-25', targets: targets(), folder: FOLDER } ), [], 'the modal\'s own controls open nothing' );
	const named = ( component ) => targets().map( ( t ) => ( { ...t, components: new Set( [ component ] ) } ) );
	assert.deepEqual( surfaceOpenerControls( { factRecord: FACTS, surfaceId: 'S-06', targets: named( 'Shop' ), folder: FOLDER } ), controls, 'a target run on the component of the control (Shop) is opened by it' );
	assert.deepEqual( surfaceOpenerControls( { factRecord: FACTS, surfaceId: 'S-06', targets: named( 'Home' ), folder: FOLDER } ), [], 'a target run on another component is opened by no Shop control' );
} );

test( 'MUST FAIL: the rule\'s settings are settings the blocks hold, and the skeleton calls the rule and its last pass', () => {
	for ( const [ block, attr ] of [ [ S.button.block, S.button.label ], [ S.button.block, S.button.url ], [ S.frame.block, 'triggerStyle' ], [ S.frame.block, S.frame.closeOnOverlay ], [ S.frame.block, S.frame.ref ], [ S.frame.block, S.frame.scrim ], [ S.frame.block, 'size' ], [ R.choiceFlow.block, S.flow.linked ], [ R.choiceFlow.block, S.flow.id ] ] ) {
		assert.ok( has( block, attr ), `${ block } holds ${ attr }` );
	}
	assert.ok( settings( 'dialog' ).every( ( s ) => ! /gradient|transition|transform/.test( s.property ) ) );
	const rules = fs.readFileSync( path.join( HERE, '..', 'lib', 'skeleton-rules.mjs' ), 'utf8' );
	assert.ok( rules.includes( "return t ? v( 'surfaceOpener', { block: R.surfaceOpener.button.block, absorb: true, attributes: openerAttributes(" ) );
	const propose = fs.readFileSync( path.join( HERE, '..', 'lib', 'skeleton-propose.mjs' ), 'utf8' );
	assert.ok( propose.includes( 'openerListItems( skeleton, surfaceOpenerControls(' ) );
	assert.ok( propose.includes( 'const framed = surfaceFrames( { tree: skeleton, targets, row: surfaceRow(' ) );
} );

test( 'MUST FAIL: the frame parts are told apart by role, fill and handler, and a form target has no frame', () => {
	assert.equal( openedBy( new Set( [ 'a=1' ] ), [ { kind: 'modal', slug: 'x', recordId: 'S-1', writes: [ 'a=1', 'b=2' ] } ] ), null, 'part of the opening writes opens nothing' );
	// A target whose opening calls name their component (dcLogic('Home').setState) is opened only by a control of that component.
	const homeOnly = [ { kind: 'flow', slug: 'x', recordId: 'S-1', writes: [ 'sub=true' ], components: new Set( [ 'Home' ] ) } ];
	assert.equal( openedBy( new Set( [ 'sub=true' ] ), homeOnly, null, 'Product' ), null, 'a control of another component opens nothing' );
	assert.equal( openedBy( new Set( [ 'sub=true' ] ), homeOnly, null, null ), null, 'a control of no known component opens nothing' );
	assert.equal( openedBy( new Set( [ 'sub=true' ] ), homeOnly, null, 'Home' )?.slug, 'x', 'negative control: a control of the named component opens it' );
	assert.equal( openedBy( new Set( [ 'sub=true' ] ), [ { ...homeOnly[ 0 ], components: null } ], null, 'Product' )?.slug, 'x', 'negative control: a target naming no component is opened from any draft' );
	// A childless element that does not fill the root, a dialog with fewer elements than a sibling, and a button in the panel that
	// opens the modal again, each placed before the part it could be mistaken for.
	const el = ( key, tag, chain, attrs = {}, stat = [] ) => [ key, { template: { key, component: 'Shop', n: key.split( '/' )[ 1 ], tag, attrs, words: '', parentChain: chain, style: { static: stat, holes: [] } } } ];
	const extra = [
		el( 'Shop/30', 'span', [ 'Shop/10', 'Shop/9' ] ),
		el( 'Shop/31', 'div', [ 'Shop/10', 'Shop/9' ] ), el( 'Shop/32', 'p', [ 'Shop/31', 'Shop/10', 'Shop/9' ] ), el( 'Shop/33', 'p', [ 'Shop/31', 'Shop/10', 'Shop/9' ] ), el( 'Shop/34', 'p', [ 'Shop/31', 'Shop/10', 'Shop/9' ] ), el( 'Shop/35', 'p', [ 'Shop/31', 'Shop/10', 'Shop/9' ] ), el( 'Shop/36', 'p', [ 'Shop/31', 'Shop/10', 'Shop/9' ] ),
		el( 'Shop/37', 'button', [ 'Shop/13', 'Shop/12', 'Shop/10', 'Shop/9' ], { onClick: '{{ openSize }}' } ),
	];
	const busy = { ...FACTS, elements: { ...Object.fromEntries( extra ), ...FACTS.elements } };
	assert.deepEqual( frameParts( { factRecord: busy, surfaceId: 'S-25', folder: FOLDER, opening: targets()[ 0 ].writes } ), { root: 'Shop/10', backdrop: 'Shop/11', panel: 'Shop/12', close: 'Shop/15', closesOnBackdrop: true } );
	const rows = [ ...PAGE_MAP(), { slug: 'form-contact', postType: 'sgs_form', draftId: 'surfaces.json S-25' } ];
	rows[ 2 ].opens = [ ...rows[ 2 ].opens, { kind: 'form', slug: 'form-contact' } ];
	const tree = [];
	surfaceFrames( { tree, targets: [ ...targets(), { kind: 'form', slug: 'form-contact', recordId: 'S-25', writes: [ 'modal="size"' ] } ], row: rows[ 2 ], pageMap: rows, R, factRecord: FACTS, folder: FOLDER, settings, has } );
	assert.deepEqual( tree.map( ( n ) => n.attributes.anchor ), [ MODAL ], 'a form is opened by its own anchor, never a frame' );
} );

// The skeleton writer's own opener rule (lib/skeleton-rules.mjs::makeRules, opensSurface) passes the control's component to
// openedBy: a modal whose surfaces.json record runs on the page's own component is opened by the page's button, and one whose
// record runs on another component is not. A temp repo holds the draft (Root.dc.html) and the record (surfaces.json).
function scopeRepo( dc ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'opener-scope-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const logic = [ 'class Component {', '\tstate = { modal: null };', '\trenderVals() {', "\t\treturn { openSize: () => this.setState( { modal: 'size' } ) };", '\t}', '}' ].join( '\n' );
	fs.writeFileSync( path.join( dir, 'Root.dc.html' ), `<x-dc name="Root"><div></div></x-dc>\n<script data-dc-script>\n${ logic }\n</script>\n` );
	fs.writeFileSync( path.join( dir, 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-50', kind: 'modal', name: 'Size guide', dc, states: [ { name: 'open', how_to_reach_structured: { setState: { modal: 'size' } } } ] } ] } ) );
	return repo;
}
const scopeRun = ( dc ) => {
	const b = build( [ E( 1, 'div', null, { rendered: R0 } ), E( 2, 'button', 1, { words: 'Size guide', click: 'openSize', rendered: R0 } ) ], { ids: { 'S-01': { kind: 'page', name: 'Page', root: 1 } } } );
	const button = b.inventory.elements.find( ( x ) => 'Root/2#0' === x.key );
	button.snippet = '<button data-dc-tpl="2" sc-camel-on-click="{{ openSize }}">Size guide</button>';
	const r = proposeSkeleton( { inventory: b.inventory, facts: { ...fixtureFacts(), repo: scopeRepo( dc ) }, surface: 'page', surfaceKind: 'page', surfaceName: 'Page', db, factRecord: b.record, openers: {}, pageMap: [ { slug: 'modal-size-guide', postType: 'sgs_modal', draftId: 'surfaces.json S-50' } ], surfaceId: 'S-01' } );
	return r.proposal.rows.find( ( x ) => 'Root/2#0' === x.key );
};

test( 'MUST FAIL: the skeleton writer turns a button into an opener only for a target whose record runs on the button\'s own component', () => {
	const own = scopeRun( 'Root' );
	assert.equal( own?.rule, 'surfaceOpener', 'the record runs on Root, the button\'s component' );
	assert.equal( own.attributes?.[ S.button.url ], '#modal-size-guide' );
} );

test( 'negative control: a target whose record runs on another component is opened by no button of this draft', () => {
	assert.notEqual( scopeRun( 'Home' )?.rule, 'surfaceOpener' );
} );

// The close control's writes are read on the modal's own component (lib/intake-pagemap-flow-openers.mjs::ownWrites with the
// record's dc): a close written through dcLogic('Shop') still closes the Shop modal, one written on another component does not.
const closeVia = ( name ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'frame-close-' ) );
	for ( const f of fs.readdirSync( FOLDER ) ) {
		fs.copyFileSync( path.join( FOLDER, f ), path.join( dir, f ) );
	}
	const file = path.join( dir, 'Shop.dc.html' );
	const text = fs.readFileSync( file, 'utf8' );
	const out = text.replace( 'closeSize: () => this.setState({ modal: null }),', `closeSize: () => dcLogic('${ name }').setState({ modal: null }),` );
	assert.notEqual( out, text );
	fs.writeFileSync( file, out );
	return frameParts( { factRecord: FACTS, surfaceId: 'S-25', folder: dir, opening: targets()[ 0 ].writes } );
};

test( 'MUST FAIL: a close control written through dcLogic on the modal\'s own component is the frame\'s close', () => {
	assert.deepEqual( closeVia( 'Shop' ), { root: 'Shop/10', backdrop: 'Shop/11', panel: 'Shop/12', close: 'Shop/15', closesOnBackdrop: true } );
} );

test( 'negative control: a close written on another component closes nothing of this modal', () => {
	const parts = closeVia( 'Home' );
	assert.equal( parts.close, null );
	assert.equal( parts.closesOnBackdrop, false );
} );
