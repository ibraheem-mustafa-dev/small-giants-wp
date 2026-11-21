// lib/hand-vs-clone.mjs and tools/hand-vs-clone.mjs: the hand-built surface against the clone's Fill tree. Small trees,
// each rule with a negative control. `facts` stands in for the framework database's content roles. No site, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { comparable, compareSurface, differingDevices, flatten, lookClasses, pairBlocks, perDevice, reportText, settingGroup, totals, withoutKeys } from '../lib/hand-vs-clone.mjs';
import { newestRun, sectionOf, SECTION_OF } from '../tools/hand-vs-clone.mjs';
import { parseBlockMarkup } from '../lib/block-choice.mjs';

const facts = { contentAttrs: ( n ) => ( { 'sgs/text': new Set( [ 'text' ] ), 'sgs/trust-bar': new Set( [ 'items' ] ) }[ n ] ?? null ) };
const B = ( name, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks } );

test( 'groups: custom CSS, content from the database roles and per-site ids, everything else a look', () => {
	assert.equal( settingGroup( 'sgs/cart', 'sgsCustomCss', facts ), 'custom-css' );
	assert.equal( settingGroup( 'sgs/text', 'text', facts ), 'content' );
	assert.equal( settingGroup( 'sgs/nav-bar-menu', 'drawerRef', facts ), 'look', 'a name ending Ref is no id' );
	assert.equal( settingGroup( 'sgs/nav-bar-menu', 'ref', facts ), 'content' );
	assert.equal( settingGroup( 'sgs/form', 'formId', facts ), 'content' );
	assert.equal( settingGroup( 'sgs/site-header', 'sgsCustomCssNote', facts ), 'content' );
	assert.equal( settingGroup( 'sgs/cart', 'burgerBarCount', facts ), 'look' );
	assert.equal( settingGroup( 'sgs/heading', 'text', facts ), 'look', 'content only where the database lists it for that block' );
} );

test( 'comparable: item keys and route pairing classes never count; other classes do', () => {
	assert.deepEqual( withoutKeys( [ { _key: 'a', label: 'x', sub: { _key: 'b', v: 1 } } ] ), [ { label: 'x', sub: { v: 1 } } ] );
	assert.equal( lookClasses( 'cr-ref-header-3 is-style-pill' ), 'is-style-pill' );
	assert.deepEqual( comparable( { className: 'cr-ref-header-3', gap: 1 } ), { gap: 1 } );
	assert.deepEqual( comparable( { className: 'is-style-pill cr-ref-x-1' } ), { className: 'is-style-pill' } );
} );

test( 'per device: a device left out shows the next wider one, so equal shown values make no row', () => {
	assert.deepEqual( perDevice( { desktop: '22px' } ), { desktop: '22px', tablet: '22px', mobile: '22px' } );
	assert.equal( perDevice( { top: '1px' } ), null );
	assert.equal( perDevice( {} ), null );
	assert.deepEqual( differingDevices( { desktop: '22px' }, { desktop: '22px', mobile: '22px' } ), [] );
	assert.deepEqual( differingDevices( { desktop: '22px' }, { mobile: '22px', tablet: '22px' } ), [ 'desktop' ] );
	assert.deepEqual( differingDevices( { desktop: 1, mobile: 2 }, { desktop: 1 } ), [ 'mobile' ] );
	assert.deepEqual( differingDevices( 'a', 'b' ), [ 'desktop', 'tablet', 'mobile' ] );
	assert.deepEqual( differingDevices( { top: '1px' }, { top: '1px' } ), [] );
} );

test( 'pairing: the most alike block of one name, not the next in order; the same parent counts', () => {
	const hand = flatten( [ B( 'sgs/container', {}, [ B( 'sgs/container', { gap: '8px', layout: 'flex' } ), B( 'sgs/container', { gap: '24px', layout: 'grid' } ) ] ) ] );
	const clone = flatten( [ B( 'sgs/container', { gap: '24px', layout: 'grid' } ) ] );
	const hs = hand.filter( ( b ) => b.name === 'sgs/container' );
	assert.deepEqual( pairBlocks( hs, clone ), [ [ 2, 0 ] ], 'the grid pairs with the grid, though the flex comes first' );
	// Negative control: nothing tells them apart, so they pair in document order.
	const plain = flatten( [ B( 'sgs/icon' ), B( 'sgs/icon' ), B( 'sgs/icon' ) ] );
	assert.deepEqual( pairBlocks( plain, plain ), [ [ 0, 0 ], [ 1, 1 ], [ 2, 2 ] ] );
	assert.deepEqual( pairBlocks( plain, plain.slice( 2 ) ), [ [ 0, 0 ] ] );
} );

test( 'parent: of two equal candidates, the one under the same parent block pairs', () => {
	const hand = flatten( [ B( 'sgs/site-header-row', {}, [ B( 'sgs/cart' ) ] ), B( 'sgs/container', {}, [ B( 'sgs/cart' ) ] ) ] );
	const clone = flatten( [ B( 'sgs/container', {}, [ B( 'sgs/cart' ) ] ) ] );
	const r = compareSurface( [ B( 'sgs/site-header-row', {}, [ B( 'sgs/cart' ) ] ), B( 'sgs/container', {}, [ B( 'sgs/cart' ) ] ) ], [ B( 'sgs/container', {}, [ B( 'sgs/cart' ) ] ) ], facts );
	const cart = r.blocks.find( ( b ) => b.name === 'sgs/cart' && null !== b.clone );
	assert.equal( hand[ cart.hand ].parent, 'sgs/container' );
	assert.equal( clone[ cart.clone ].parent, 'sgs/container' );
} );

test( 'rows: the answer sheet\'s settings the clone lacks or holds at another value, and the clone\'s own', () => {
	const hand = [ B( 'sgs/nav-bar-menu', { burgerBarCount: 2, gap: { desktop: '24px' }, ref: 12, sgsCustomCss: '& { border: 1px solid; }' } ) ];
	const clone = [ B( 'sgs/nav-bar-menu', { gap: { desktop: '24px', mobile: '5px' }, ref: 40, showBurger: true, className: 'cr-ref-header-4' } ) ];
	const r = compareSurface( hand, clone, facts );
	const rows = r.blocks[ 0 ].rows;
	const by = ( attr ) => rows.find( ( x ) => x.attr === attr );
	assert.deepEqual( [ by( 'burgerBarCount' ).kind, by( 'burgerBarCount' ).group ], [ 'hand-only', 'look' ] );
	assert.deepEqual( [ by( 'gap' ).kind, by( 'gap' ).devices ], [ 'different', [ 'mobile' ] ] );
	assert.deepEqual( [ by( 'ref' ).kind, by( 'ref' ).group ], [ 'different', 'content' ] );
	assert.deepEqual( [ by( 'sgsCustomCss' ).kind, by( 'sgsCustomCss' ).group ], [ 'hand-only', 'custom-css' ] );
	assert.deepEqual( [ by( 'showBurger' ).kind, by( 'showBurger' ).group ], [ 'clone-only', 'look' ] );
	assert.equal( by( 'className' ), undefined, 'the route pairing class is no row' );
	assert.deepEqual( totals( r ), { 'hand-only': 1, different: 1, 'clone-only': 1, 'custom-css': 1, content: 1, handBlocksUnpaired: 0, cloneBlocksUnpaired: 0 } );
	// Negative control: identical blocks make no row.
	assert.deepEqual( compareSurface( hand, hand, facts ).blocks[ 0 ].rows, [] );
} );

test( 'unpaired: a block only one side has is listed on its side; the report lists look rows and hides content unless asked', () => {
	const r = compareSurface( [ B( 'sgs/site-header', {}, [ B( 'sgs/business-info' ), B( 'sgs/text', { text: 'Hi', size: 1 } ) ] ) ], [ B( 'sgs/site-header', {}, [ B( 'sgs/button' ), B( 'sgs/text', { text: 'Hello', size: 2 } ) ] ) ], facts );
	assert.deepEqual( r.counts, { 'sgs/business-info': [ 1, 0 ], 'sgs/button': [ 0, 1 ], 'sgs/site-header': [ 1, 1 ], 'sgs/text': [ 1, 1 ] } );
	assert.ok( r.blocks.some( ( b ) => b.name === 'sgs/business-info' && null === b.clone ) );
	assert.ok( r.blocks.some( ( b ) => b.name === 'sgs/button' && null === b.hand ) );
	const text = reportText( r );
	assert.match( text, /business-info.*only the hand-built side has it/ );
	assert.match( text, /button.*only the clone has it/ );
	assert.match( text, /DIFFERENT {2}size = hand-built 1 \| clone 2/ );
	assert.doesNotMatch( text, /"Hi"/ );
	assert.match( reportText( r, { content: true } ), /CONTENT different {2}text = hand-built "Hi"/ );
} );

test( 'tool: the section by its @@@ line, the surface names, the newest run holding a Fill tree', () => {
	const saved = '@@@ sgs_active_header_cpt_id 199\n<!-- wp:sgs/site-header {"align":"full"} -->\n<!-- wp:sgs/cart /-->\n<!-- /wp:sgs/site-header -->\n@@@ page_on_front 208\n<!-- wp:sgs/hero /-->\n';
	assert.equal( sectionOf( saved, SECTION_OF.header ).blocks[ 0 ].innerBlocks[ 0 ].name, 'sgs/cart' );
	assert.equal( sectionOf( saved, SECTION_OF.home ).blocks[ 0 ].name, 'sgs/hero' );
	assert.equal( sectionOf( saved, 'sgs_active_footer_cpt_id' ), null );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'hvc-' ) );
	for ( const [ run, tree ] of [ [ '2026-01-01T00-00-00', true ], [ '2026-01-02T00-00-00', true ], [ '2026-01-03T00-00-00', false ] ] ) {
		fs.mkdirSync( path.join( dir, run ) );
		if ( tree ) {
			fs.writeFileSync( path.join( dir, run, 'filled.tree.json' ), '[]' );
		}
	}
	assert.equal( path.basename( newestRun( dir ) ), '2026-01-02T00-00-00', 'a newer run without a Fill tree is skipped' );
	assert.equal( newestRun( path.join( dir, 'none' ) ), null );
	fs.rmSync( dir, { recursive: true, force: true } );
	// The markup parser gives the hand-built side the same shape flatten reads.
	assert.deepEqual( flatten( parseBlockMarkup( '<!-- wp:sgs/icon {"size":2} /-->' ) ).map( ( b ) => [ b.name, b.attrs ] ), [ [ 'sgs/icon', { size: 2 } ] ] );
} );
