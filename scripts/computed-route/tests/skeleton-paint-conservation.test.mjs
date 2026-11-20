// Paint conservation (lib/skeleton-paint-conservation.mjs): a draft element that paints something is read by a node (its own
// element, a slot, a loop copy), or by another surface, or it is a row naming what dropped it. The cases are the shapes the
// saved drafts hold: a hero wrapper unwrapped with its card paint, a chip absorbed into a block whose slots do not name it,
// a loop whose first copy a slot names, a form's field listed once under the form's own surface, a per-site removal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RECORD_KINDS, RECORDED_CLASSES, INHERITED_LOOKS, lookOfProperty, checkRecords, recordsOf, nodesByRef, paintProblems, styleOf, declaredLooks, computedLooks, paintsBox, namedKeys, namedReads, BAND_LOOKS, loopOf, templateOf, identityOf, namedIdentities, heldIdentities, droppedBy, conservationRows, groupRows } from '../lib/skeleton-paint-conservation.mjs';
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

test( 'the looks a tag gives: a replaced element\'s height, an svg glyph, a link\'s underline; and a transparent border is no paint', () => {
	const looks = ( text, tag ) => [ ...declaredLooks( styleOf( text ), tag ) ].sort();
	assert.deepEqual( looks( 'height: 60px; width: auto; display: block', 'img' ), [ 'height' ] );
	assert.deepEqual( looks( 'height: 60px', 'div' ), [], 'a box\'s height is not a look of its own' );
	assert.deepEqual( looks( 'height: auto', 'img' ), [] );
	assert.deepEqual( looks( 'fill: none; stroke: currentcolor; stroke-width: 1.8', 'svg' ), [ 'glyph' ] );
	assert.deepEqual( looks( 'fill: none; stroke: none', 'svg' ), [] );
	assert.deepEqual( looks( 'fill: red', 'span' ), [], 'only an svg is a glyph' );
	assert.deepEqual( looks( 'text-decoration: none', 'a' ), [ 'text-decoration' ], 'a link told not to underline' );
	assert.deepEqual( looks( 'text-decoration: none', 'span' ), [] );
	assert.deepEqual( looks( 'text-decoration-line: underline', 'span' ), [ 'text-decoration' ] );
	assert.deepEqual( looks( 'text-decoration: underline dotted', 'p' ), [ 'text-decoration' ] );
	assert.deepEqual( looks( 'border: 1px solid transparent' ), [] );
	assert.deepEqual( looks( 'border-bottom: 2px solid rgba(0, 0, 0, 0)' ), [] );
	assert.deepEqual( looks( 'border-width: 1px; border-style: solid; border-color: transparent' ), [] );
	assert.deepEqual( looks( 'border-width: 1px; border-style: solid; border-color: rgb(1, 2, 3)' ), [ 'border' ] );
} );

test( 'a flex or grid box holding two or more elements lays them out; one child, or a block box, does not', () => {
	const box = ( display, children ) => Object.keys( paintsBox( el( 'Root/1#0', 'gap: 18px', { display } ), { children } ) );
	assert.deepEqual( box( 'flex', 3 ), [ 'layout' ] );
	assert.deepEqual( box( 'inline-grid', 2 ), [ 'layout' ] );
	assert.deepEqual( box( 'flex', 1 ), [] );
	assert.deepEqual( box( 'block', 3 ), [] );
	assert.deepEqual( box( undefined, 3 ), [] );
	// conservationRows counts the children itself: an unwrapped flex column of three is a row for its layout alone.
	const inventory = { elements: [ el( 'Root/1#0', null ), el( 'Root/2#0', 'gap: 18px', { parentKey: 'Root/1#0', display: 'flex' } ), ...[ 3, 4, 5 ].map( ( n ) => el( `Root/${ n }#0`, null, { parentKey: 'Root/2#0' } ) ) ] };
	const proposal = { rows: [ row( 'Root/2#0', { action: 'unwrap', rule: 'heroInner' } ) ] };
	const r = conservationRows( { inventory, proposal, skeleton: [ node( 'sgs/hero', 'Root/1#0', { innerBlocks: [ 3, 4, 5 ].map( ( n ) => node( 'sgs/text', `Root/${ n }#0` ) ) } ) ] } );
	assert.deepEqual( r.rows.map( ( x ) => [ x.key, x.class, Object.keys( x.looks ) ] ), [ [ 'Root/2#0', 'unwrapped', [ 'layout' ] ] ] );
} );

test( 'a static sibling of the same tag and style as a read sibling is read through it; a different style or parent is not', () => {
	const link = 'padding: 8px 12px; border-bottom: 1px solid rgb(1, 2, 3)';
	const inventory = { elements: [
		el( 'Root/1#0', null ),
		el( 'Root/2#0', link, { parentKey: 'Root/1#0', tag: 'a' } ),
		el( 'Root/3#0', link, { parentKey: 'Root/1#0', tag: 'a' } ),
		el( 'Root/4#0', 'padding: 8px 12px; border-bottom: 3px solid rgb(9, 9, 9)', { parentKey: 'Root/1#0', tag: 'a' } ),
		el( 'Root/5#0', link, { parentKey: 'Root/9#0', tag: 'a' } ),
		el( 'Root/6#0', link, { parentKey: 'Root/1#0', tag: 'span' } ),
	] };
	const skeleton = [ node( 'sgs/nav', 'Root/1#0', { draftSlots: { '.item:nth-of-type(1)': { tpl: 'Root/2#0' } } } ) ];
	const r = conservationRows( { inventory, proposal: { rows: [] }, skeleton } );
	assert.equal( r.counts.siblingCopy, 1 );
	assert.deepEqual( r.rows.map( ( x ) => x.key ), [ 'Root/4#0', 'Root/5#0', 'Root/6#0' ] );
	// A band finder is no representative: its siblings' paint is still unread.
	const band = conservationRows( { inventory, proposal: { rows: [] }, skeleton: [ node( 'sgs/nav', 'Root/1#0', { draftBandWrappers: [ { tpl: 'Root/2#0' } ] } ) ] } );
	assert.equal( band.counts.siblingCopy, 0 );
} );

test( 'a width alternative names its element by key', () => {
	const tree = [ node( 'sgs/site-header-row', 'Root/1#0', { widthAlternatives: [ { key: 'Root/15#0', shown: [ 375, 768 ] } ], attributes: { other: { key: 'Root/99#0', shown: [ 375 ] } } } ) ];
	assert.deepEqual( [ ...namedReads( tree ) ], [ [ 'Root/1#0', 'full' ], [ 'Root/15#0', 'full' ] ] );
	assert.deepEqual( [ ...namedReads( [ node( 'sgs/x', 'Root/1#0', { other: { key: 'Root/7#0' } } ) ] ) ], [ [ 'Root/1#0', 'full' ] ], 'a key with no shown list is not a finder' );
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
const surface = ( { chipSlot = false, wrapperNamed = false, wrapperBand = false } = {} ) => {
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
		...( wrapperNamed ? { draftSlots: { '.card': { tpl: 'Root/2#0' } } } : {} ),
		...( wrapperBand ? { draftBandWrappers: [ { tpl: 'Root/2#0' } ] } : {} ),
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
	assert.deepEqual( counts, { painted: 8, exact: 2, loopCopy: 1, instanceCopy: 0, siblingCopy: 0, otherSurface: 0, ownedElsewhere: 0, recorded: 0, listedApart: 0, unread: 5 } );
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

test( 'a band wrapper finder reads the width cap only: the wrapper\'s paint is still a row (MUST FAIL where any finder counts as read)', () => {
	const { rows, counts } = conservationRows( surface( { wrapperBand: true } ) );
	const wrapper = rows.find( ( r ) => 'Root/2#0' === r.key );
	assert.equal( wrapper.class, 'band-only' );
	assert.deepEqual( Object.keys( wrapper.looks ).sort(), [ 'background', 'border', 'radius' ], 'the cap the band reads is not listed' );
	assert.deepEqual( [ wrapper.by, wrapper.rule ], [ 'rule', 'heroInner' ] );
	assert.equal( counts.unread, 5 );
	assert.ok( BAND_LOOKS.includes( 'max-width' ) && ! BAND_LOOKS.includes( 'background' ) );
} );

test( 'a band wrapper that paints nothing beyond its cap is read, a slot naming the same element reads all of it, and a loop is not read through a band finder', () => {
	// Negative control: a wrapper with a cap and centring only.
	const capOnly = surface( { wrapperBand: true } );
	capOnly.inventory.elements.find( ( e ) => 'Root/2#0' === e.key ).attrs.style = 'max-width: 640px; margin: 0px auto';
	assert.ok( ! conservationRows( capOnly ).rows.some( ( r ) => 'Root/2#0' === r.key ) );
	// Both a slot and a band finder name it: read in full.
	assert.ok( ! conservationRows( surface( { wrapperBand: true, wrapperNamed: true } ) ).rows.some( ( r ) => 'Root/2#0' === r.key ) );
	assert.deepEqual( [ ...namedReads( [ node( 'sgs/hero', 'Root/1#0', { draftBandWrappers: [ { tpl: 'Root/2#0' }, { tpl: 'Root/1#0' } ] } ) ] ) ], [ [ 'Root/1#0', 'full' ], [ 'Root/2#0', 'band' ] ] );
	assert.deepEqual( [ ...namedReads( [ node( 'sgs/hero', 'Root/1#0', { draftBandWrappers: [ { tpl: 'Root/2#0' } ], draftSlots: { '.a': { tpl: 'Root/2#0' } } } ) ] ) ], [ [ 'Root/1#0', 'full' ], [ 'Root/2#0', 'full' ] ] );
	// A band finder on the first copy of a loop does not read the other copies' paint.
	const inventory = { elements: [ el( 'Root/5#0', 'background: red' ), el( 'Root/5#1', 'background: red' ) ] };
	const r = conservationRows( { inventory, proposal: { rows: [] }, skeleton: [ node( 'sgs/hero', 'Root/1#0', { draftBandWrappers: [ { tpl: 'Root/5#0' } ] } ) ] } );
	assert.deepEqual( r.rows.map( ( x ) => [ x.key, x.class ] ), [ [ 'Root/5#0', 'band-only' ], [ 'Root/5#1', 'no-row' ] ] );
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
	assert.match( md, /\| demo \| 2 \| 10 \| 2 \| 1 \| 0 \| 0 \| 0 \| 2 \| 0 \| 0 \| 5 \|/ );
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

// The record model: a row's `conserve` records where a dissolved element's look goes. A record that delivers takes the looks it
// names off the list once it can be verified; one that delivers nothing lists the element in its own class, counted apart.
test( 'a setting record delivers the looks it names only where its node holds the setting (MUST FAIL with no record model)', () => {
	const s = surface();
	s.proposal.rows.find( ( r ) => 'Root/2#0' === r.key ).conserve = [ { kind: 'setting', node: 'Root/3#0', setting: 'maxWidth', looks: [ 'background', 'border', 'radius', 'max-width' ] } ];
	// Negative control: the node does not hold the setting, so the record cannot be verified and the row stays, unrecorded.
	const unverified = conservationRows( s ).rows.find( ( r ) => 'Root/2#0' === r.key );
	assert.deepEqual( [ unverified.class, unverified.state, unverified.was ], [ 'record-unverified', 'unrecorded', 'unwrapped' ] );
	s.skeleton[ 0 ].innerBlocks[ 0 ].decided = { maxWidth: { desktop: '640px' } };
	const r = conservationRows( s );
	assert.ok( ! r.rows.some( ( x ) => 'Root/2#0' === x.key ) );
	assert.deepEqual( [ r.counts.recorded, r.counts.unread ], [ 1, 4 ] );
	// A record naming only some looks leaves the others listed.
	s.proposal.rows.find( ( x ) => 'Root/2#0' === x.key ).conserve[ 0 ].looks = [ 'max-width' ];
	assert.deepEqual( Object.keys( conservationRows( s ).rows.find( ( x ) => 'Root/2#0' === x.key ).looks ).sort(), [ 'background', 'border', 'radius' ] );
} );

test( 'an inherited look is delivered where a node inside reads it, and a no-part record is listed apart, never unrecorded', () => {
	const s = surface();
	s.inventory.elements.find( ( e ) => 'Root/2#0' === e.key ).attrs.style = 'text-align: center';
	s.proposal.rows.find( ( r ) => 'Root/2#0' === r.key ).conserve = [ { kind: 'inherited', looks: INHERITED_LOOKS } ];
	assert.ok( ! conservationRows( s ).rows.some( ( r ) => 'Root/2#0' === r.key ) );
	// Negative control: nothing inside it is a node, so the inherited look reaches no node.
	s.skeleton[ 0 ].innerBlocks.shift();
	assert.equal( conservationRows( s ).rows.find( ( r ) => 'Root/2#0' === r.key ).class, 'record-unverified' );
	const t = surface();
	t.proposal.rows.find( ( r ) => 'Root/5#0' === r.key ).conserve = [ { kind: 'no-part', block: 'sgs/option-picker', looks: [ 'background', 'radius' ], checked: 'cache/option-picker.json' } ];
	t.proposal.rows.find( ( r ) => 'Root/5#1' === r.key ).conserve = [ { kind: 'no-part', block: 'sgs/option-picker', looks: [ 'background' ] } ];
	const rows = conservationRows( t );
	const chip = rows.rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.deepEqual( [ chip.class, chip.state, chip.record.block ], [ 'no-part', 'recorded', 'sgs/option-picker' ] );
	assert.deepEqual( [ rows.rows.find( ( r ) => 'Root/5#1' === r.key ).class, rows.counts.listedApart, rows.counts.unread ], [ 'record-unverified', 1, 4 ], 'a no-part record that names no calibration file is no record' );
} );

test( 'a per-site decision is listed apart, a row inside a removed element takes its remover\'s record, and a kind outside the list is refused', () => {
	assert.deepEqual( [ ...RECORDED_CLASSES ].sort(), [ 'handover', 'no-part', 'own-surface', 'site-decision' ] );
	const rows = new Map( [ [ 'Root/1#0', row( 'Root/1#0', { action: 'remove', conserve: { kind: 'handover', delivers: 'the glare effect' } } ) ], [ 'Root/2#0', row( 'Root/2#0', { action: 'remove', reason: 'inside a removed element (Root/1#0)' } ) ] ] );
	assert.deepEqual( recordsOf( rows.get( 'Root/2#0' ), rows ), [ { kind: 'handover', delivers: 'the glare effect' } ] );
	assert.deepEqual( checkRecords( [ { kind: 'moved', node: 'Root/1#0' } ], { looks: [ 'background' ], nodes: new Map() } ).bad, [ 'no record kind moved' ] );
	const s = surface();
	Object.assign( s.proposal.rows.find( ( r ) => 'Root/8#0' === r.key ), { rule: null, source: 'client decision', reason: 'Bean marked remove in the intake review' } );
	const dot = conservationRows( s ).rows.find( ( r ) => 'Root/8#0' === r.key );
	assert.deepEqual( [ dot.class, dot.state, dot.was ], [ 'site-decision', 'recorded', 'removed' ] );
	// A valid record beside one that cannot be verified leaves the row unrecorded.
	s.proposal.rows.find( ( r ) => 'Root/9#0' === r.key ) || s.proposal.rows.push( row( 'Root/9#0', { action: 'remove', conserve: [ { kind: 'handover', delivers: 'the glare effect' }, { kind: 'setting', node: 'Root/3#0' } ] } ) );
	const grey = conservationRows( s ).rows.find( ( r ) => 'Root/9#0' === r.key );
	assert.deepEqual( [ grey.class, grey.state ], [ 'record-unverified', 'unrecorded' ] );
	assert.ok( Object.values( RECORD_KINDS ).every( ( k ) => Array.isArray( k.needs ) ) );
	assert.equal( nodesByRef( s.skeleton ).get( 'Root/4#0' ).name, 'sgs/option-picker' );
} );

test( 'lookOfProperty maps a calibrated setting\'s property to the look it paints', () => {
	const map = [ [ 'background-color', 'background' ], [ 'background-image', 'background' ], [ 'border-top-width', 'border' ], [ 'border-color', 'border' ], [ 'border-top-left-radius', 'radius' ], [ 'border-radius', 'radius' ], [ 'box-shadow', 'shadow' ], [ 'padding-left', 'padding' ], [ 'max-width', 'max-width' ], [ 'width', 'width' ], [ 'margin', 'margin-auto' ], [ 'text-align', 'text-centre' ], [ 'gap', 'layout' ], [ 'text-decoration-color', 'text-decoration' ], [ 'height', 'height' ], [ 'fill', 'glyph' ] ];
	map.forEach( ( [ p, l ] ) => assert.equal( lookOfProperty( p ), l, p ) );
	assert.equal( lookOfProperty( 'color' ), null );
	assert.equal( lookOfProperty( 'color', 'svg' ), 'glyph' );
	assert.equal( lookOfProperty( 'font-size' ), null );
} );

test( 'paintProblems names each unrecorded element once per class and rule, and none where every element is read or recorded', () => {
	const lines = paintProblems( surface() );
	assert.equal( lines.length, 4 );
	assert.ok( lines.some( ( l ) => /2 painted elements host-unread \(rule optionSetFilter, host sgs\/option-picker\).*Root\/5#0 background\/radius; Root\/5#1/.test( l ) ), lines.join( '\n' ) );
	// A recorded row (a per-site removal) is listed, never a problem.
	const decided = surface();
	Object.assign( decided.proposal.rows.find( ( r ) => 'Root/8#0' === r.key ), { rule: null, source: 'client decision' } );
	assert.equal( paintProblems( decided ).length, 3 );
	const s = surface( { chipSlot: true, wrapperNamed: true } );
	s.inventory.elements = s.inventory.elements.filter( ( e ) => ! [ 'Root/8#0', 'Root/9#0' ].includes( e.key ) );
	assert.deepEqual( paintProblems( s ), [] );
} );

test( 'the tool\'s --check exits 1 while an element is neither read nor recorded', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'paint-check-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	const write = ( s ) => [ 'inventory', 'proposal', 'skeleton' ].forEach( ( k ) => fs.writeFileSync( path.join( dir, [ 'home', k, 'json' ].join( '.' ) ), JSON.stringify( s[ k ] ) ) );
	write( surface() );
	const lines = [];
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check' ], { log: ( l ) => lines.push( l ) } ), 1 );
	assert.match( lines.at( -1 ), /5 painted elements neither read nor recorded/ );
	assert.equal( main( [ '--root', repo, '--client', 'demo' ], { log: () => {} } ), 0, 'without --check the list is a report' );
	const read = surface( { chipSlot: true, wrapperNamed: true } );
	read.inventory.elements = read.inventory.elements.filter( ( e ) => ! [ 'Root/8#0', 'Root/9#0' ].includes( e.key ) );
	write( read );
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check' ], { log: () => {} } ), 0 );
	fs.rmSync( repo, { recursive: true, force: true } );
} );
