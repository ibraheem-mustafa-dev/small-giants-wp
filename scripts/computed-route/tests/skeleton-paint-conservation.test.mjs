// Paint conservation (lib/skeleton-paint-conservation.mjs): a draft element that paints something is read by a node (its own
// element, a slot, a loop copy), or by another surface, or it is a row naming what dropped it. The cases are the shapes the
// saved drafts hold: a hero wrapper unwrapped with its card paint, a chip absorbed into a block whose slots do not name it,
// a loop whose first copy a slot names, a form's field listed once under the form's own surface, a per-site removal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { styleOf, declaredLooks, computedLooks, paintsBox, namedKeys, loopOf, templateOf, identityOf, namedIdentities, heldIdentities, droppedBy, conservationRows, groupRows } from '../lib/skeleton-paint-conservation.mjs';
import { listAll, loadClient, markdown, main } from '../tools/paint-conservation.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SHOWN = { 375: true, 768: true, 1440: true };
const el = ( key, style, extra = {} ) => ( { key, parentKey: extra.parentKey ?? null, tag: 'div', template: /^Root\//.test( key ) ? 'Root' : key.replace( /^.*>([^@>]+)@[^/]*\/.*$/, '$1' ), tpl: Number( /\/(\d+)#\d+$/.exec( key )[ 1 ] ), attrs: style ? { style } : {}, words: '', visible: SHOWN, ...extra } );
const row = ( key, extra = {} ) => ( { key, block: null, action: null, rule: null, reason: null, source: null, ...extra } );
const node = ( name, tpl, extra = {} ) => ( { name, attributes: {}, draftRef: { tpl }, innerBlocks: [], ...extra } );

test( 'styleOf splits declarations and keeps a semicolon inside brackets', () => {
	assert.deepEqual( styleOf( 'Background: url(data:image/png;base64,AAA) ; padding : 4px 8px' ), { background: 'url(data:image/png;base64,AAA)', padding: '4px 8px' } );
	assert.deepEqual( styleOf( '' ), {} );
	assert.deepEqual( styleOf( null ), {} );
} );

test( 'declaredLooks names each look a declaration paints, and nothing for values that paint nothing', () => {
	const looks = ( text ) => [ ...declaredLooks( styleOf( text ) ) ].sort();
	assert.deepEqual( looks( 'background: #F5C2C8' ), [ 'background' ] );
	assert.deepEqual( looks( 'background-color: rgb(1, 2, 3)' ), [ 'background' ] );
	assert.deepEqual( looks( 'background-image: linear-gradient(red, blue)' ), [ 'background' ] );
	assert.deepEqual( looks( 'border: 2px solid rgb(58, 42, 34)' ), [ 'border' ] );
	assert.deepEqual( looks( 'border-bottom: 1px dashed red' ), [ 'border' ] );
	assert.deepEqual( looks( 'border-width: 0px 0px 2px; border-style: solid' ), [ 'border' ] );
	assert.deepEqual( looks( 'border-top-width: 3px; border-top-style: solid' ), [ 'border' ] );
	assert.deepEqual( looks( 'box-shadow: rgb(0, 0, 0) 4px 4px 0px' ), [ 'shadow' ] );
	assert.deepEqual( looks( 'border-radius: 16px' ), [ 'radius' ] );
	assert.deepEqual( looks( 'border-top-left-radius: 8px' ), [ 'radius' ] );
	assert.deepEqual( looks( 'padding: 0px 24px' ), [ 'padding' ] );
	assert.deepEqual( looks( 'padding-left: 52px' ), [ 'padding' ] );
	assert.deepEqual( looks( 'width: 44px' ), [ 'width' ] );
	assert.deepEqual( looks( 'max-width: 640px' ), [ 'max-width' ] );
	assert.deepEqual( looks( 'margin: 0px auto' ), [ 'margin-auto' ] );
	assert.deepEqual( looks( 'margin-left: auto' ), [ 'margin-auto' ] );
	assert.deepEqual( looks( 'text-align: center' ), [ 'text-centre' ] );
	// Negative controls: each of these paints nothing a block must read.
	for ( const none of [ 'background: none', 'background: transparent', 'background-color: rgba(0, 0, 0, 0)', 'background-image: none', 'border: 0px', 'border: 0px solid red', 'border: none', 'border: medium none', 'border-width: 0px; border-style: solid', 'border-top-width: 2px; border-top-style: none', 'box-shadow: none', 'border-radius: 0px', 'padding: 0px', 'padding: 0px 0px 0px 0px', 'width: 100%', 'width: auto', 'max-width: none', 'max-width: 100%', 'margin: auto 0px', 'margin: 12px', 'text-align: left', 'color: red; font-size: 30px; display: flex' ] ) {
		assert.deepEqual( looks( none ), [], none );
	}
} );

test( 'computedLooks reads only the values the inventory recorded, and an inherited text alignment counts once', () => {
	const looks = ( v, p ) => [ ...computedLooks( v, p ) ].sort();
	assert.deepEqual( looks( { 'padding-top': '0px', 'padding-left': '24px', 'border-top-left-radius': '0px' } ), [ 'padding' ] );
	assert.deepEqual( looks( { 'border-bottom-right-radius': '12px', 'padding-top': '0px' } ), [ 'radius' ] );
	assert.deepEqual( looks( { 'background-color': 'rgb(245, 194, 200)' } ), [ 'background' ] );
	assert.deepEqual( looks( { 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'box-shadow': 'none', 'max-width': 'none' } ), [] );
	assert.deepEqual( looks( { 'border-top-width': '2px', 'border-top-style': 'solid' } ), [ 'border' ] );
	assert.deepEqual( looks( { 'border-top-width': '2px', 'border-top-style': 'none' } ), [] );
	assert.deepEqual( looks( { 'box-shadow': 'rgb(0, 0, 0) 4px 4px 0px 0px', 'max-width': '640px' } ), [ 'max-width', 'shadow' ] );
	assert.deepEqual( looks( { 'text-align': 'center' }, { 'text-align': 'start' } ), [ 'text-centre' ] );
	assert.deepEqual( looks( { 'text-align': 'center' }, { 'text-align': 'center' } ), [], 'inherited from a centred parent' );
	assert.deepEqual( looks( { 'font-size': '16px', width: '375px', height: '20px' } ), [], 'a computed width says nothing: every box has one' );
	assert.deepEqual( looks( undefined ), [] );
} );

test( 'paintsBox gives each look the widths it shows at, from computed values per width and declarations at every rendered width', () => {
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'background: red' ) ), { background: [ 375, 768, 1440 ] } );
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'background: red', { visible: { 375: false, 768: true, 1440: true } } ) ), { background: [ 768, 1440 ] } );
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'background: red', { visible: { 375: false, 768: false, 1440: false } } ) ), {}, 'an element that renders nowhere paints nothing' );
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'color: red' ) ), {} );
	// Computed values differ by width: padding only on a phone.
	const e = el( 'Root/1#0', null, { resolved: { 375: { 'padding-left': '20px' }, 768: { 'padding-left': '0px' }, 1440: { 'padding-left': '0px' } } } );
	assert.deepEqual( paintsBox( e ), { padding: [ 375 ] } );
	// The fact record's declared styles count where the rendered attribute holds none.
	assert.deepEqual( paintsBox( el( 'Root/1#0', null ), { declared: { 'max-width': '640px' } } ), { 'max-width': [ 375, 768, 1440 ] } );
	// The parent's computed alignment is passed through.
	const child = el( 'Root/2#0', null, { resolved: { 1440: { 'text-align': 'center' } } } );
	assert.deepEqual( paintsBox( child, { parent: { resolved: { 1440: { 'text-align': 'center' } } } } ), {} );
	assert.deepEqual( paintsBox( child, { parent: { resolved: { 1440: { 'text-align': 'left' } } } } ), { 'text-centre': [ 1440 ] } );
} );

test( 'namedKeys collects every finder on a node, and never a value in its attributes or fingerprint', () => {
	const tree = [ node( 'sgs/container', 'Root/1#0', {
		attributes: { ref: { tpl: 'Root/99#0' } },
		draftFingerprint: { tpl: 'Root/98#0' },
		draftSlots: { '.a > .b': { tpl: 'Root/3#0' } },
		draftBandWrappers: [ { tpl: 'Root/4#0' } ],
		widthAlternatives: [ { at: 375, slots: { '.c': { tpl: 'Root/5#0' } } } ],
		innerBlocks: [ node( 'sgs/text', 'Root/2#0' ) ],
	} ) ];
	assert.deepEqual( [ ...namedKeys( tree ) ].sort(), [ 'Root/1#0', 'Root/2#0', 'Root/3#0', 'Root/4#0', 'Root/5#0' ] );
	assert.deepEqual( [ ...namedKeys( tree[ 0 ] ) ].sort(), [ 'Root/1#0', 'Root/2#0', 'Root/3#0', 'Root/4#0', 'Root/5#0' ], 'a single node is read as a tree of one' );
} );

test( 'loopOf, templateOf and identityOf', () => {
	assert.equal( loopOf( 'Root>Card@40#1/3#2' ), 'Root>Card@40#1/3' );
	assert.equal( templateOf( 'Root>Card@40#1/3#2' ), 'Root>Card@40/3' );
	assert.equal( identityOf( { template: 'Root', tpl: 18 }, 'Help' ), 'Help/18' );
	assert.equal( identityOf( { template: 'SiteFooter', tpl: 4 }, 'Help' ), 'SiteFooter/4' );
	assert.equal( identityOf( { template: 'Root', tpl: 18 }, null ), 'Root/18' );
} );

test( 'droppedBy tells a per-site decision from a standing rule, and a row inside a removed element takes its remover', () => {
	const rows = new Map( [
		[ 'Root/1#0', row( 'Root/1#0', { action: 'remove', source: 'client decision', reason: 'Bean marked remove in the intake review on 2026-10-19: the element is absorbed into its parent block' } ) ],
		[ 'Root/2#0', row( 'Root/2#0', { action: 'remove', reason: 'inside a removed element (Root/1#0)' } ) ],
		[ 'Root/3#0', row( 'Root/3#0', { action: 'unwrap', rule: 'heroInner', source: 'rule heroInner' } ) ],
		[ 'Root/4#0', row( 'Root/4#0', { action: 'remove', reason: 'inside a removed element (Root/3#0)' } ) ],
		[ 'Root/5#0', row( 'Root/5#0', { block: 'sgs/text' } ) ],
		[ 'Root/6#0', row( 'Root/6#0', { action: 'remove', reason: 'inside a removed element (Root/77#0)' } ) ],
		[ 'Root/7#0', row( 'Root/7#0', { action: 'remove', source: 'decisions photo-credit-note' } ) ],
	] );
	assert.deepEqual( droppedBy( rows.get( 'Root/1#0' ), rows ), { by: 'site-decision', rule: null } );
	assert.deepEqual( droppedBy( rows.get( 'Root/2#0' ), rows ), { by: 'site-decision', rule: null } );
	assert.deepEqual( droppedBy( rows.get( 'Root/3#0' ), rows ), { by: 'rule', rule: 'heroInner' } );
	assert.deepEqual( droppedBy( rows.get( 'Root/4#0' ), rows ), { by: 'rule', rule: 'heroInner' } );
	assert.deepEqual( droppedBy( rows.get( 'Root/5#0' ), rows ), { by: 'none', rule: null } );
	assert.deepEqual( droppedBy( rows.get( 'Root/6#0' ), rows ), { by: 'none', rule: null }, 'a remover the proposal does not hold answers nothing' );
	assert.deepEqual( droppedBy( rows.get( 'Root/7#0' ), rows ), { by: 'site-decision', rule: null } );
	assert.deepEqual( droppedBy( null, rows ), { by: 'none', rule: null } );
} );

// One surface: a hero with a painted wrapper the hero rule unwraps, a picker whose chips are absorbed with no slot, a strip
// whose first tile a slot names, a removed dot, a plain text, and an element the proposal has no row for.
const surface = ( { chipSlot = false, wrapperNamed = false } = {} ) => {
	const inventory = { elements: [
		el( 'Root/1#0', 'background: pink; padding: 40px' ),
		el( 'Root/2#0', 'background: white; border: 2px solid black; border-radius: 16px; max-width: 640px', { parentKey: 'Root/1#0' } ),
		el( 'Root/3#0', 'color: red', { parentKey: 'Root/2#0' } ),
		el( 'Root/4#0', 'display: flex', { parentKey: 'Root/1#0' } ),
		el( 'Root/5#0', 'background: cream; border-radius: 999px', { parentKey: 'Root/4#0' } ),
		el( 'Root/5#1', 'background: cream; border-radius: 999px', { parentKey: 'Root/4#0' } ),
		el( 'Root/6#0', 'display: flex', { parentKey: 'Root/1#0' } ),
		el( 'Root/7#0', 'background: white; box-shadow: 0 2px 0 black', { parentKey: 'Root/6#0' } ),
		el( 'Root/7#1', 'background: white; box-shadow: 0 2px 0 black', { parentKey: 'Root/6#0' } ),
		el( 'Root/8#0', 'background: gold; width: 8px; border-radius: 50%', { parentKey: 'Root/1#0' } ),
		el( 'Root/9#0', 'background: grey', { parentKey: 'Root/1#0' } ),
	] };
	const proposal = { rows: [
		row( 'Root/1#0', { block: 'sgs/hero', rule: 'hero' } ),
		row( 'Root/2#0', { action: 'unwrap', rule: 'heroInner', source: 'rule heroInner' } ),
		row( 'Root/3#0', { block: 'sgs/text' } ),
		row( 'Root/4#0', { block: 'sgs/option-picker', rule: 'optionSetFilter', slots: chipSlot ? { '.chip:nth-of-type(1)': { tpl: 'Root/5#0' } } : null } ),
		row( 'Root/5#0', { action: 'absorbed', rule: 'optionSetFilter', into: 'Root/4#0' } ),
		row( 'Root/5#1', { action: 'absorbed', rule: 'optionSetFilter', into: 'Root/4#0' } ),
		row( 'Root/6#0', { block: 'sgs/brand-strip', rule: 'marquee', slots: { '.item:nth-of-type(1)': { tpl: 'Root/7#0' } } } ),
		row( 'Root/7#0', { action: 'absorbed', rule: 'marquee', into: 'Root/6#0' } ),
		row( 'Root/7#1', { action: 'absorbed', rule: 'marquee', into: 'Root/6#0' } ),
		row( 'Root/8#0', { action: 'remove', rule: 'dotMarker' } ),
	] };
	const skeleton = [ node( 'sgs/hero', 'Root/1#0', {
		...( wrapperNamed ? { draftBandWrappers: [ { tpl: 'Root/2#0' } ] } : {} ),
		innerBlocks: [
			node( 'sgs/text', 'Root/3#0' ),
			node( 'sgs/option-picker', 'Root/4#0', chipSlot ? { draftSlots: { '.chip:nth-of-type(1)': { tpl: 'Root/5#0' } } } : {} ),
			node( 'sgs/brand-strip', 'Root/6#0', { draftSlots: { '.item:nth-of-type(1)': { tpl: 'Root/7#0' } } } ),
		],
	} ) ];
	return { inventory, proposal, skeleton, component: 'Home' };
};

test( 'conservationRows lists each painted element no node reads, with its class, its rule and its host', () => {
	const { rows, counts } = conservationRows( surface() );
	assert.deepEqual( counts, { painted: 8, exact: 2, loopCopy: 1, instanceCopy: 0, otherSurface: 0, ownedElsewhere: 0, unread: 5 } );
	assert.deepEqual( rows.map( ( r ) => [ r.key, r.class, r.by, r.rule ] ), [
		[ 'Root/2#0', 'unwrapped', 'rule', 'heroInner' ],
		[ 'Root/5#0', 'host-unread', 'rule', 'optionSetFilter' ],
		[ 'Root/5#1', 'host-unread', 'rule', 'optionSetFilter' ],
		[ 'Root/8#0', 'removed', 'rule', 'dotMarker' ],
		[ 'Root/9#0', 'no-row', 'none', null ],
	] );
	const wrapper = rows.find( ( r ) => 'Root/2#0' === r.key );
	assert.deepEqual( Object.keys( wrapper.looks ).sort(), [ 'background', 'border', 'max-width', 'radius' ] );
	assert.equal( wrapper.into, null, 'an unwrapped wrapper records no destination' );
	const chip = rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.deepEqual( [ chip.into, chip.host, chip.hostBlock, chip.hostSlots ], [ 'Root/4#0', 'Root/4#0', 'sgs/option-picker', 0 ] );
	assert.ok( ! rows.some( ( r ) => 'Root/3#0' === r.key || 'Root/4#0' === r.key ), 'an element that paints nothing is never a row' );
} );

test( 'a slot that names the first loop copy reads the loop, and a named wrapper is read', () => {
	const { rows, counts } = conservationRows( surface( { chipSlot: true, wrapperNamed: true } ) );
	assert.deepEqual( rows.map( ( r ) => r.key ), [ 'Root/8#0', 'Root/9#0' ] );
	assert.deepEqual( [ counts.exact, counts.loopCopy, counts.unread ], [ 4, 2, 2 ] );
} );

test( 'a copy under another host instance is read through its template, and counted apart', () => {
	const inventory = { elements: [ el( 'Root>Card@40#0/3#0', 'background: red' ), el( 'Root>Card@40#1/3#0', 'background: red' ) ] };
	const skeleton = [ node( 'sgs/container', 'Root>Card@40#0/3#0' ) ];
	const r = conservationRows( { inventory, proposal: { rows: [] }, skeleton } );
	assert.deepEqual( [ r.counts.exact, r.counts.loopCopy, r.counts.instanceCopy, r.rows.length ], [ 1, 0, 1, 0 ] );
} );

test( 'another surface that names the element reads it; a narrower surface that only holds it lists it', () => {
	const page = surface();
	// The form surface names the chips' elements (as its own fields) and holds the dot.
	const formInventory = { elements: [ el( 'Root/5#0', 'background: cream' ), el( 'Root/8#0', 'background: gold' ) ] };
	const formSkeleton = [ node( 'sgs/form-field-tiles', 'Root/5#0' ) ];
	const other = { surface: 'form', identities: namedIdentities( { inventory: formInventory, skeleton: formSkeleton, component: 'Home' } ) };
	assert.deepEqual( [ ...other.identities ], [ 'Home/5' ] );
	assert.deepEqual( [ ...heldIdentities( { inventory: formInventory, component: 'Home' } ) ].sort(), [ 'Home/5', 'Home/8' ] );
	const r = conservationRows( { ...page, otherSurfaces: [ other ], ownedElsewhere: new Set( [ 'Home/8' ] ) } );
	assert.deepEqual( r.rows.map( ( x ) => x.key ), [ 'Root/2#0', 'Root/9#0' ] );
	assert.deepEqual( [ r.counts.otherSurface, r.counts.ownedElsewhere ], [ 2, 1 ] );
	// The same file name on another draft file is another element: a page of a different component is not read by it.
	const elsewhere = conservationRows( { ...page, component: 'Gifts', otherSurfaces: [ other ] } );
	assert.equal( elsewhere.counts.otherSurface, 0 );
} );

test( 'groupRows ranks by who dropped the rows', () => {
	const { rows } = conservationRows( surface() );
	const groups = groupRows( rows.map( ( r ) => ( { client: 'c', surface: 's', ...r } ) ), { examples: 1 } );
	assert.deepEqual( groups.map( ( g ) => [ g.count, g.class, g.by, g.rule ] ), [ [ 2, 'host-unread', 'rule', 'optionSetFilter' ], [ 1, 'unwrapped', 'rule', 'heroInner' ], [ 1, 'removed', 'rule', 'dotMarker' ], [ 1, 'no-row', 'none', null ] ] );
	assert.deepEqual( groups[ 0 ].looks, { background: 2, radius: 2 } );
	assert.equal( groups[ 0 ].examples.length, 1 );
	assert.deepEqual( groups[ 0 ].surfaces, [ 'c/s' ] );
} );

test( 'the tool reads a client folder, lists an element once under its narrowest surface and writes its report', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'paint-conservation-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	const put = ( name, s ) => [ 'inventory', 'proposal', 'skeleton' ].forEach( ( k ) => fs.writeFileSync( path.join( dir, `${ name }.${ k }.json` ), JSON.stringify( s[ k ] ) ) );
	const page = surface();
	put( 'home', page );
	// A form surface that holds the two chips and names neither.
	put( 'form-x', { inventory: { elements: page.inventory.elements.filter( ( e ) => /^Root\/5#/.test( e.key ) ) }, proposal: { rows: page.proposal.rows.filter( ( r ) => /^Root\/5#/.test( r.key ) ) }, skeleton: [] } );
	put( 'held-out', page );
	fs.writeFileSync( path.join( dir, 'half.inventory.json' ), '{"elements":[]}' );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html' }, 'form-x': { draftIndex: 'Home.dc.html' }, 'held-out': { draftIndex: 'Other.dc.html' } } ) );
	const skip = new Set( [ 'demo/held-out' ] );
	assert.deepEqual( loadClient( { repo, client: 'demo', skip } ).map( ( s ) => [ s.surface, s.component ] ), [ [ 'form-x', 'Home' ], [ 'home', 'Home' ] ], 'a surface missing a file and a skipped surface are left out' );
	const result = listAll( { repo, clients: [ 'demo' ], skip } );
	assert.deepEqual( result.rows.map( ( r ) => `${ r.surface } ${ r.key }` ), [ 'form-x Root/5#0', 'form-x Root/5#1', 'home Root/2#0', 'home Root/8#0', 'home Root/9#0' ] );
	assert.equal( result.counts.demo.home.ownedElsewhere, 2 );
	const md = markdown( result, 'T' );
	assert.match( md, /\| demo \| 2 \| 10 \| 2 \| 1 \| 0 \| 0 \| 2 \| 5 \|/ );
	assert.match( md, /\| 2 \| host-unread \| rule \| optionSetFilter \| 1 \|/ );
	const out = path.join( repo, 'out' );
	const lines = [];
	assert.equal( main( [ '--client', 'demo', '--root', repo, '--skip', 'demo/held-out', '--out', out ], { log: ( l ) => lines.push( l ) } ), 0 );
	assert.equal( JSON.parse( fs.readFileSync( path.join( out, 'list.json' ), 'utf8' ) ).rows.length, 5 );
	assert.match( fs.readFileSync( path.join( out, 'LIST.md' ), 'utf8' ), /^# Painted draft elements no block reads/ );
	assert.equal( main( [ '--root', repo ], { log: ( l ) => lines.push( l ) } ), 2, 'no client named' );
	// A regeneration kept outside the repo is read with --dir.
	const moved = path.join( repo, 'elsewhere' );
	fs.cpSync( dir, moved, { recursive: true } );
	fs.rmSync( dir, { recursive: true } );
	const viaDir = [];
	assert.equal( main( [ '--client', 'demo', '--root', repo, '--dir', `demo=${ moved }`, '--skip', 'demo/held-out', '--json' ], { log: ( l ) => viaDir.push( l ) } ), 0 );
	assert.equal( JSON.parse( viaDir[ 0 ] ).rows.length, 5 );
	fs.rmSync( repo, { recursive: true } );
} );
