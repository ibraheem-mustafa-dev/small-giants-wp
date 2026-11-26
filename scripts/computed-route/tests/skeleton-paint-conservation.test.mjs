// Paint conservation (lib/skeleton-paint-conservation.mjs): a draft element that paints something is read by a node (its own
// element, a slot, a loop copy), or by another surface, or it is a row naming what dropped it. The cases are the shapes the
// saved drafts hold: a hero wrapper unwrapped with its card paint, a chip absorbed into a block whose slots do not name it,
// a loop whose first copy a slot names, a form's field listed once under the form's own surface, a per-site removal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uaKeyOf, RECORD_KINDS, RECORDED_CLASSES, INHERITED_LOOKS, lookOfProperty, checkRecords, unreadList, recordsOf, nodesByRef, paintProblems, styleOf, declaredLooks, computedLooks, paintsBox, namedKeys, namedReads, BAND_LOOKS, loopOf, templateOf, identityOf, namedIdentities, heldIdentities, droppedBy, conservationRows, groupRows } from '../lib/skeleton-paint-conservation.mjs';
import { listAll, loadClient, markdown, main, factRecordOf } from '../tools/paint-conservation.mjs';
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

test( 'styleOf drops the !important flag, and a shorthand splits outside brackets only (MUST FAIL where the flag stays in the value or a calc() splits)', () => {
	assert.deepEqual( styleOf( 'text-align:center !important; background: none!IMPORTANT' ), { 'text-align': 'center', background: 'none' } );
	const looks = ( text ) => [ ...declaredLooks( styleOf( text ) ) ].sort();
	assert.deepEqual( looks( 'text-align:center !important' ), [ 'text-centre' ] );
	assert.deepEqual( looks( 'background:none !important' ), [], 'a flagged none paints nothing' );
	// calc( 100% - 2rem ) is one side: the right margin is auto, so the box is centred only where the bracket is kept whole.
	assert.deepEqual( looks( 'margin: 0 calc( 50% - 10px ) 0 auto' ), [ 'margin-auto' ] );
	assert.deepEqual( looks( 'margin: calc( 1rem + 2px ) auto' ), [ 'margin-auto' ] );
	assert.deepEqual( looks( 'border-width: calc( 1px + 0px ) 0 0; border-style: none solid solid' ), [], 'the drawn width sits on the top side, whose style is none' );
	// Negative controls: a value with no flag and no bracket reads as before.
	assert.deepEqual( styleOf( 'text-align: center' ), { 'text-align': 'center' } );
	assert.deepEqual( looks( 'margin: 0 auto' ), [ 'margin-auto' ] );
	assert.deepEqual( looks( 'margin: 4px 0' ), [] );
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
	assert.deepEqual( looks( { 'border-top-width': '2px' } ), [ 'border' ], 'an inventory read before side styles were recorded: a drawn width is a border' );
	assert.deepEqual( looks( { 'border-top-width': '2px', 'border-top-style': 'solid', 'border-top-color': 'rgba(0, 0, 0, 0)' } ), [], 'a transparent side' );
	assert.deepEqual( looks( { 'border-top-width': '2px', 'border-top-style': 'hidden' } ), [] );
	assert.deepEqual( looks( { 'box-shadow': 'rgb(0, 0, 0) 4px 4px 0px 0px', 'max-width': '640px' } ), [ 'max-width', 'shadow' ] );
	assert.deepEqual( looks( { 'text-align': 'center' }, { 'text-align': 'start' } ), [ 'text-centre' ] );
	assert.deepEqual( looks( { 'text-align': 'center' }, { 'text-align': 'center' } ), [], 'inherited from a centred parent' );
	assert.deepEqual( looks( { 'font-size': '16px', width: '375px', height: '20px' } ), [], 'a computed width says nothing: every box has one' );
	assert.deepEqual( looks( undefined ), [] );
} );

test( 'a declared token that computes to nothing paints nothing where the width holds every side (MUST FAIL where the declaration alone decides)', () => {
	const zero = { 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px' };
	const flat = el( 'Root/1#0', 'padding: var(--section) 0', { resolved: { 375: zero, 768: zero, 1440: zero } } );
	assert.deepEqual( paintsBox( flat ), {}, 'the token resolves to 0px on every side at every width' );
	// Negative controls: the computed read shows padding; no computed read; a read that holds only some sides; one width only.
	const padded = el( 'Root/1#0', 'padding: var(--section) 0', { resolved: { 375: { ...zero, 'padding-top': '64px' }, 768: zero, 1440: zero } } );
	assert.deepEqual( paintsBox( padded ), { padding: [ 375 ] } );
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'padding: var(--section) 0' ) ), { padding: [ 375, 768, 1440 ] }, 'no computed read: the declaration stands' );
	const partial = el( 'Root/1#0', 'padding: var(--section) 0', { resolved: { 375: { 'padding-top': '0px' }, 768: { 'padding-top': '0px' }, 1440: { 'padding-top': '0px' } } } );
	assert.deepEqual( paintsBox( partial ), { padding: [ 375, 768, 1440 ] }, 'a read that does not hold every side does not overrule the declaration' );
	const oneWidth = el( 'Root/1#0', 'padding: var(--section) 0', { resolved: { 1440: zero } } );
	assert.deepEqual( paintsBox( oneWidth ), { padding: [ 375, 768 ] }, 'only the width that was read is decided' );
	// A look the computed read does not decide keeps its declaration: a background beside the refuted padding.
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'background: red; padding: var(--section) 0', { resolved: { 375: zero, 768: zero, 1440: zero } } ) ), { background: [ 375, 768, 1440 ] } );
	// Corners: a radius token computing to 0px on every corner is no radius.
	const square = { 'border-top-left-radius': '0px', 'border-top-right-radius': '0px', 'border-bottom-right-radius': '0px', 'border-bottom-left-radius': '0px' };
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'border-radius: var(--r)', { resolved: { 375: square, 768: square, 1440: square } } ) ), {} );
} );

test( 'a declared padding with no browser baseline for its tag stands where a recorded side computes above zero (MUST FAIL where a missing baseline refutes it)', () => {
	const pad = { 'padding-top': '64px', 'padding-right': '24px', 'padding-bottom': '64px', 'padding-left': '24px' };
	const padded = el( 'Root/1#0', 'padding: 64px 24px', { resolved: { 375: pad, 768: pad, 1440: pad } } );
	// No measurement in the inventory (null), or one that lacks the tag: the computed read adds no padding of its own, and
	// the declaration it does not refute stands.
	assert.deepEqual( paintsBox( padded, { uaPadding: null } ), { padding: [ 375, 768, 1440 ] } );
	assert.deepEqual( paintsBox( padded, { uaPadding: { p: {} } } ), { padding: [ 375, 768, 1440 ] } );
	// Negative controls: every side computing to zero is still no padding with no baseline; a padding that computes to the
	// browser's own for the tag is still no padding of the draft's.
	const zero = { 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px' };
	assert.deepEqual( paintsBox( el( 'Root/1#0', 'padding: var(--section) 0', { resolved: { 375: zero, 768: zero, 1440: zero } } ), { uaPadding: null } ), {} );
	assert.deepEqual( paintsBox( padded, { uaPadding: { div: pad } } ), {}, 'the padding is the browser\'s own for a div' );
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

test( 'MUST FAIL: a Site Info row item also names the first svg inside it (Fill reads each generated icon glyph there), and an svg outside the items stays unnamed', () => {
	const at = ( key, tpl, parentKey, tag = 'div' ) => ( { key, tpl, parentKey, template: 'SiteFooter', tag } );
	const elements = [ at( 'F/2#0', 2, null ), at( 'F/44#0', 44, 'F/2#0' ), at( 'F/45#0', 45, 'F/44#0', 'a' ), at( 'F/46#0', 46, 'F/45#0', 'svg' ), at( 'F/47#0', 47, 'F/46#0', 'rect' ), at( 'F/50#0', 50, 'F/44#0', 'a' ), at( 'F/60#0', 60, 'F/2#0', 'svg' ) ];
	const tree = [ { name: 'sgs/social-icons', attributes: {}, draftRef: 'footer[data-dc-tpl="2"] [data-dc-tpl="44"]', siteInfoRow: [ 'instagram', 'whatsapp' ], childRefs: { instagram: '[data-dc-tpl="45"]', whatsapp: '[data-dc-tpl="50"]' } } ];
	assert.deepEqual( [ ...namedKeys( tree, elements ) ].sort(), [ 'F/44#0', 'F/45#0', 'F/46#0', 'F/50#0' ], 'the item with an svg names it; the item with none and the svg outside the row name nothing more' );
} );

test( 'a Site Info row\'s selector finder names its element and its items inside it; a selector the draft holds twice, or no number, names none; MUST FAIL where only { tpl } finders count', () => {
	const at = ( key, tpl, parentKey, template = 'SiteFooter' ) => ( { key, tpl, parentKey, template, tag: 'div' } );
	const elements = [ at( 'F/2#0', 2, null ), at( 'F/44#0', 44, 'F/2#0' ), at( 'F/45#0', 45, 'F/44#0' ), at( 'F/50#0', 50, 'F/44#0' ), at( 'F/9#0', 9, null ), at( 'F/45#1', 45, 'F/9#0' ), at( 'X/44#0', 44, null, 'Other' ) ];
	const tree = [ { name: 'sgs/social-icons', attributes: {}, draftRef: 'footer[data-dc-tpl="2"] [data-dc-tpl="44"]', siteInfoRow: [ 'instagram', 'whatsapp' ], childRefs: { instagram: '[data-dc-tpl="45"]', whatsapp: '[data-dc-tpl="50"]' } } ];
	assert.deepEqual( [ ...namedKeys( tree, elements ) ].sort(), [ 'F/44#0', 'F/45#0', 'F/50#0' ], 'the row, and each item inside the row only (not F/45#1 under another element)' );
	assert.deepEqual( [ ...namedKeys( tree ) ], [], 'without the inventory nothing resolves' );
	assert.deepEqual( [ ...namedKeys( [ { ...tree[ 0 ], draftRef: '[data-dc-tpl="45"]', childRefs: {} } ], elements ) ], [], 'a number the draft holds twice names no element' );
	assert.deepEqual( [ ...namedKeys( [ { ...tree[ 0 ], draftRef: 'footer .social', childRefs: {} } ], elements ) ], [], 'a selector with no number names none' );
	// conservationRows reads the selector finder: the painted row is read, not kept-unnamed.
	const SHOWN = { 375: { x: 0, y: 0, w: 100, h: 20 }, 768: { x: 0, y: 0, w: 100, h: 20 }, 1440: { x: 0, y: 0, w: 100, h: 20 } };
	const inventory = { elements: elements.map( ( e ) => ( { ...e, box: SHOWN, visible: { 375: true, 768: true, 1440: true }, attrs: 'F/44#0' === e.key ? { style: 'display:flex;gap:10px;padding:8px' } : {}, display: 'F/44#0' === e.key ? 'flex' : 'block' } ) ) };
	const proposal = { rows: elements.map( ( e ) => ( { key: e.key, block: 'sgs/social-icons', action: null } ) ) };
	assert.deepEqual( conservationRows( { inventory, proposal, skeleton: tree } ).rows.map( ( r ) => r.key ), [] );
	assert.deepEqual( conservationRows( { inventory, proposal, skeleton: [] } ).rows.map( ( r ) => [ r.key, r.class ] ), [ [ 'F/44#0', 'kept-unnamed' ] ], 'negative control: with no node it is a row' );
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
	assert.deepEqual( counts, { painted: 8, statePainted: 0, exact: 2, loopCopy: 1, instanceCopy: 0, siblingCopy: 0, otherSurface: 0, ownedElsewhere: 0, recorded: 0, listedApart: 0, unread: 5 } );
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
	assert.deepEqual( r.rows.map( ( x ) => [ x.key, x.class ] ), [ [ 'Root/5#0', 'band-only' ], [ 'Root/5#1', 'band-only' ] ] );
} );

test( 'a copy of a band wrapper takes its representative\'s band read: its cap is read, its paint is a band-only row (MUST FAIL where copies resolve through full finders only)', () => {
	const band = ( key ) => node( 'sgs/hero', 'Root/1#0', { draftBandWrappers: [ { tpl: key } ] } );
	const rowsOf = ( elements, tree ) => conservationRows( { inventory: { elements }, proposal: { rows: [] }, skeleton: [ tree ] } );
	// A loop copy: the cap alone is read, so the copy is read; a cap with paint is a band-only row holding the paint only.
	const capOnly = rowsOf( [ el( 'Root/5#0', 'max-width: 640px; margin: 0 auto' ), el( 'Root/5#1', 'max-width: 640px; margin: 0 auto' ) ], band( 'Root/5#0' ) );
	assert.deepEqual( [ capOnly.rows.length, capOnly.counts.exact, capOnly.counts.loopCopy ], [ 0, 1, 1 ] );
	const painted = rowsOf( [ el( 'Root/5#0', 'max-width: 640px; background: red' ), el( 'Root/5#1', 'max-width: 640px; background: red' ) ], band( 'Root/5#0' ) );
	assert.deepEqual( painted.rows.map( ( x ) => [ x.key, x.class, Object.keys( x.looks ) ] ), [ [ 'Root/5#0', 'band-only', [ 'background' ] ], [ 'Root/5#1', 'band-only', [ 'background' ] ] ] );
	// A copy under another host instance, and a like sibling, resolve the same way.
	const host = rowsOf( [ el( 'Root>Card@40#0/3#0', 'max-width: 640px' ), el( 'Root>Card@40#1/3#0', 'max-width: 640px' ) ], band( 'Root>Card@40#0/3#0' ) );
	assert.deepEqual( [ host.rows.length, host.counts.instanceCopy ], [ 0, 1 ] );
	const sibs = rowsOf( [ el( 'Root/1#0', null ), el( 'Root/2#0', 'max-width: 640px', { parentKey: 'Root/1#0' } ), el( 'Root/3#0', 'max-width: 640px', { parentKey: 'Root/1#0' } ) ], band( 'Root/2#0' ) );
	assert.deepEqual( [ sibs.rows.length, sibs.counts.siblingCopy ], [ 0, 1 ] );
	// Negative control: a full finder on the representative still reads every copy in full.
	const full = rowsOf( [ el( 'Root/5#0', 'max-width: 640px; background: red' ), el( 'Root/5#1', 'max-width: 640px; background: red' ) ], node( 'sgs/hero', 'Root/5#0' ) );
	assert.deepEqual( [ full.rows.length, full.counts.loopCopy ], [ 0, 1 ] );
	// A copy of both a fully read and a band-read representative is read in full.
	const both = rowsOf( [ 0, 1, 2 ].map( ( i ) => el( `Root/5#${ i }`, 'max-width: 640px; background: red' ) ), node( 'sgs/hero', 'Root/5#0', { draftBandWrappers: [ { tpl: 'Root/5#1' } ] } ) );
	assert.deepEqual( both.rows.map( ( x ) => x.key ), [ 'Root/5#1' ] );
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
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html' }, 'form-x': { draftIndex: 'Home.dc.html' }, 'held-out': { draftIndex: 'Other.dc.html' }, half: { draftIndex: 'Home.dc.html' } } ) );
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

test( 'the tool reads each surface\'s declared styles through the fact record view, and names a surface read without a record (MUST FAIL where listAll passes no view)', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'paint-conservation-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( path.join( repo, 'sites', 'demo', 'build', 'intake' ), { recursive: true } );
	fs.mkdirSync( dir, { recursive: true } );
	const page = surface();
	// A box whose centring the template declares (its rendered style attribute and computed read hold none of it).
	page.inventory.elements.push( el( 'Root/10#0', null, { parentKey: 'Root/1#0' } ) );
	[ 'inventory', 'proposal', 'skeleton' ].forEach( ( k ) => fs.writeFileSync( path.join( dir, `home.${ k }.json` ), JSON.stringify( page[ k ] ) ) );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html', intakeSurface: 'page-home' } } ) );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'page-home': { inventory: { checks: { rootName: 'Home' } } } } } ) );
	assert.equal( loadClient( { repo, client: 'demo' } )[ 0 ].rootComponent, 'Home', 'a served inventory\'s root host is the intake skeleton\'s root component' );
	const record = { elements: { 'Home/10': { template: { tag: 'div', realTag: 'div', realParent: 'Home/1', style: { static: [ [ 'margin-left', 'auto' ], [ 'margin-right', 'auto' ], [ 'max-width', '720px' ] ], holes: [] }, attrs: {}, membership: { scFor: [] } } } } };
	const withRecord = listAll( { repo, clients: [ 'demo' ], factRecord: () => ( { record, why: null } ) } );
	const row = withRecord.rows.find( ( r ) => 'Root/10#0' === r.key );
	assert.deepEqual( Object.keys( row?.looks ?? {} ).sort(), [ 'margin-auto', 'max-width' ] );
	assert.deepEqual( withRecord.facts, { demo: { home: null } } );
	assert.doesNotMatch( markdown( withRecord, 'T' ), /Surfaces read with no fact record/ );
	// Negative control: a client with no record reads the style attribute only, and the report names the surface.
	const without = listAll( { repo, clients: [ 'demo' ], factRecord: () => ( { record: null, why: 'no facts.json' } ) } );
	assert.ok( ! without.rows.some( ( r ) => 'Root/10#0' === r.key ) );
	assert.match( markdown( without, 'T' ), /\| 5 \| 1 \| 0 \|\n/, 'the table counts the surface read without a record' );
	assert.deepEqual( without.facts, { demo: { home: 'no facts.json' } } );
	assert.match( markdown( without, 'T' ), /Surfaces read with no fact record \(the template's declared styles not read\): demo\/home \(no facts\.json\)/ );
	// A record out of step with the inventory (its entry for the element is another tag: an inventory read from an older draft) is not read.
	record.elements[ 'Home/10' ].template.realTag = 'button';
	record.elements[ 'Home/10' ].template.tag = 'button';
	const stale = listAll( { repo, clients: [ 'demo' ], factRecord: () => ( { record, why: null } ) } );
	assert.ok( ! stale.rows.some( ( r ) => 'Root/10#0' === r.key ) );
	assert.deepEqual( stale.facts, { demo: { home: 'the record is out of step with this inventory: 1 of 12 elements are another tag there' } } );
	// The default loader reads sites/<client>/build/intake/facts.json, and a client without one is named.
	assert.deepEqual( factRecordOf( { repo, client: 'demo' } ), { record: null, why: 'no fact record (sites/demo/build/intake/facts.json)' } );
	fs.rmSync( repo, { recursive: true } );
} );

test( 'a surface the manifest does not list is reported by name and never read, nor taken as another surface (MUST FAIL where every inventory trio in the folder loads)', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'paint-conservation-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	const put = ( folder, name, s ) => [ 'inventory', 'proposal', 'skeleton' ].forEach( ( k ) => fs.writeFileSync( path.join( folder, `${ name }.${ k }.json` ), JSON.stringify( s[ k ] ) ) );
	const page = surface();
	put( dir, 'home', page );
	// A stale regeneration of a surface the manifest dropped, whose skeleton names the grey box the page leaves unread.
	put( dir, 'old-page', { inventory: { elements: [ el( 'Root/9#0', 'background: grey' ) ] }, proposal: { rows: [] }, skeleton: [ node( 'sgs/container', 'Root/9#0' ) ] } );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html' } } ) );
	const unlisted = [];
	assert.deepEqual( loadClient( { repo, client: 'demo', unlisted } ).map( ( s ) => s.surface ), [ 'home' ] );
	assert.deepEqual( unlisted, [ 'old-page' ] );
	const result = listAll( { repo, clients: [ 'demo' ] } );
	assert.deepEqual( result.unlisted, { demo: [ 'old-page' ] } );
	assert.ok( result.rows.some( ( r ) => 'home' === r.surface && 'Root/9#0' === r.key ), 'the stale surface does not read the page\'s element' );
	assert.match( markdown( result, 'T' ), /Surfaces the manifest does not list \(not read\): demo\/old-page/ );
	// The same holds for a folder given with --dir.
	const moved = path.join( repo, 'elsewhere' );
	fs.cpSync( dir, moved, { recursive: true } );
	assert.deepEqual( listAll( { repo, clients: [ 'demo' ], dirs: { demo: moved } } ).unlisted, { demo: [ 'old-page' ] } );
	// Negative control: once the manifest lists it, it is read and reads the element.
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html' }, 'old-page': { draftIndex: 'Home.dc.html' } } ) );
	const listed = listAll( { repo, clients: [ 'demo' ] } );
	assert.deepEqual( listed.unlisted, { demo: [] } );
	assert.ok( ! listed.rows.some( ( r ) => 'home' === r.surface && 'Root/9#0' === r.key ) );
	assert.doesNotMatch( markdown( listed, 'T' ), /manifest does not list/ );
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
	// The record is verified against the block's calibration: a setting painting the look at any slot refuses it, and so does
	// no calibration at all (that is not calibrated, not no-part).
	const textOnly = ( b ) => ( 'sgs/option-picker' === b ? { pillText: { slot: '.chip:nth-of-type(1)', property: 'color' }, gap: { slot: '', property: 'font-size' } } : null );
	const rows = conservationRows( { ...t, calibration: textOnly } );
	const chip = rows.rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.deepEqual( [ chip.class, chip.state, chip.record.block ], [ 'no-part', 'recorded', 'sgs/option-picker' ] );
	assert.deepEqual( [ rows.rows.find( ( r ) => 'Root/5#1' === r.key ).class, rows.counts.listedApart, rows.counts.unread ], [ 'record-unverified', 1, 4 ], 'a no-part record that names no calibration file is no record' );
	const painting = ( b ) => ( 'sgs/option-picker' === b ? { pillBg: { slot: '.chip:nth-of-type(2)', property: 'background-color', state: 'hover' } } : null );
	const refused = conservationRows( { ...t, calibration: painting } ).rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.deepEqual( [ refused.class, refused.state ], [ 'record-unverified', 'unrecorded' ], 'a calibration that paints the look at any slot refuses no-part' );
	assert.match( refused.recordProblems[ 0 ], /its calibration paints background/ );
	const none = conservationRows( t ).rows.find( ( r ) => 'Root/5#0' === r.key );
	assert.match( none.recordProblems[ 0 ], /not calibrated, not no-part/ );
	t.proposal.rows.find( ( r ) => 'Root/5#1' === r.key ).conserve = [ { kind: 'not-calibrated', block: 'sgs/option-picker' } ];
	assert.deepEqual( [ conservationRows( t ).rows.find( ( r ) => 'Root/5#1' === r.key ).state, conservationRows( { ...t, calibration: textOnly } ).rows.find( ( r ) => 'Root/5#1' === r.key ).state ], [ 'recorded', 'unrecorded' ], 'not-calibrated holds only where the block has no calibration' );
} );

test( 'a link-slot record delivers its looks where the block it names holds the dissolved link at that part (MUST FAIL where the kind is unknown or never verified)', () => {
	const LINK = '.sgs-responsive-logo__link';
	const rec = [ { kind: 'link-slot', node: 'Root/3#0', slot: LINK, looks: [ 'width' ] } ];
	const held = new Map( [ [ 'Root/3#0', node( 'sgs/responsive-logo', 'Root/3#0', { draftSlots: { [ LINK ]: { tpl: 'Root/2#0' } } } ) ] ] );
	assert.deepEqual( checkRecords( rec, { looks: [ 'width', 'margin-auto' ], nodes: held } ), { delivered: [ 'width' ], listed: null, bad: [] } );
	// Negative controls: the logo built without the part (the guard's prediction failed), no such node, and a record with no slot.
	const bare = new Map( [ [ 'Root/3#0', node( 'sgs/responsive-logo', 'Root/3#0' ) ] ] );
	assert.deepEqual( checkRecords( rec, { looks: [ 'width' ], nodes: bare } ).bad, [ 'link-slot Root/3#0  cannot be verified' ] );
	assert.equal( checkRecords( rec, { looks: [ 'width' ], nodes: new Map() } ).delivered.length, 0 );
	assert.deepEqual( checkRecords( [ { kind: 'link-slot', node: 'Root/3#0', looks: [ 'width' ] } ], { looks: [ 'width' ], nodes: held } ).bad, [ 'link-slot names no slot' ] );
} );

test( 'a per-site decision is listed apart, a row inside a removed element takes its remover\'s record, and a kind outside the list is refused', () => {
	assert.deepEqual( [ ...RECORDED_CLASSES ].sort(), [ 'handover', 'no-part', 'not-calibrated', 'own-surface', 'site-decision', 'unpaired' ] );
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
	assert.equal( paintProblems( { ...decided, strict: true } ).length, 4, 'strict: a recorded row that no block reads fails too' );
	assert.match( paintProblems( { ...decided, strict: true } ).find( ( l ) => /site-decision/.test( l ) ), /is recorded, and no block reads it/ );
	assert.deepEqual( unreadList( decided ), [ { key: 'Root/8#0', block: null, kind: 'site-decision', looks: [ 'background', 'radius', 'width' ] } ] );
	const s = surface( { chipSlot: true, wrapperNamed: true } );
	s.inventory.elements = s.inventory.elements.filter( ( e ) => ! [ 'Root/8#0', 'Root/9#0' ].includes( e.key ) );
	assert.deepEqual( paintProblems( s ), [] );
} );

test( 'the tool\'s --check exits 1 while an element is neither read nor recorded', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'paint-check-' ) );
	const dir = path.join( repo, 'sites', 'demo', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	const write = ( s ) => [ 'inventory', 'proposal', 'skeleton' ].forEach( ( k ) => fs.writeFileSync( path.join( dir, [ 'home', k, 'json' ].join( '.' ) ), JSON.stringify( s[ k ] ) ) );
	fs.writeFileSync( path.join( repo, 'sites', 'demo', 'build', 'surfaces.json' ), JSON.stringify( { home: { draftIndex: 'Home.dc.html' } } ) );
	write( surface() );
	const lines = [];
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check' ], { log: ( l ) => lines.push( l ) } ), 1 );
	assert.match( lines.at( -1 ), /5 painted elements FAILING/ );
	assert.match( lines.join( ' ' ), /\| demo \| 8 \| 3 \| 0 \| 5 \|/, 'READ, RECORDED-UNREAD and FAILING are three numbers' );
	assert.equal( main( [ '--root', repo, '--client', 'demo' ], { log: () => {} } ), 0, 'without --check the list is a report' );
	const read = surface( { chipSlot: true, wrapperNamed: true } );
	read.inventory.elements = read.inventory.elements.filter( ( e ) => ! [ 'Root/8#0', 'Root/9#0' ].includes( e.key ) );
	write( read );
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check' ], { log: () => {} } ), 0 );
	const decided = surface( { chipSlot: true, wrapperNamed: true } );
	decided.inventory.elements = decided.inventory.elements.filter( ( e ) => 'Root/9#0' !== e.key );
	Object.assign( decided.proposal.rows.find( ( r ) => 'Root/8#0' === r.key ), { rule: null, source: 'client decision' } );
	write( decided );
	const said = [];
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check' ], { log: ( l ) => said.push( l ) } ), 0, 'a recorded row fails only in strict mode' );
	assert.match( said.join( ' ' ), /\| demo \| 7 \| 6 \| 1 \| 0 \|/, 'a recorded row is RECORDED-UNREAD, never READ' );
	assert.equal( main( [ '--root', repo, '--client', 'demo', '--check', '--strict' ], { log: () => {} } ), 1 );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'a row no block fits is class unresolved, not kept-unnamed', () => {
	const s = surface();
	s.proposal.rows.push( row( 'Root/9#0', { action: 'unresolved' } ) );
	assert.equal( conservationRows( s ).rows.find( ( r ) => 'Root/9#0' === r.key ).class, 'unresolved' );
} );

test( 'a drawn part a row lists in its parts is host-unread in that row\'s block, not no-row; an element no row lists stays no-row; MUST FAIL without the parts lookup', () => {
	const SHOWN = { 375: { x: 0, y: 0, w: 20, h: 20 }, 768: { x: 0, y: 0, w: 20, h: 20 }, 1440: { x: 0, y: 0, w: 20, h: 20 } };
	const E = ( key, parentKey, tag, style ) => ( { key, parentKey, tag, template: 'Root', tpl: Number( /\/(\d+)#/.exec( key )[ 1 ] ), attrs: style ? { style } : {}, box: SHOWN, visible: { 375: true, 768: true, 1440: true }, display: 'block' } );
	const inventory = { elements: [ E( 'Root/1#0', null, 'div' ), E( 'Root/2#0', 'Root/1#0', 'a' ), E( 'Root/3#0', 'Root/2#0', 'svg', 'stroke:#3A2A22' ), E( 'Root/4#0', 'Root/1#0', 'svg', 'stroke:#3A2A22' ) ] };
	const proposal = { rows: [ { key: 'Root/1#0', block: 'sgs/container' }, { key: 'Root/2#0', block: 'sgs/button', parts: [ 'Root/3#0' ] } ] };
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, innerBlocks: [ { name: 'sgs/button', draftRef: { tpl: 'Root/2#0' } } ] } ];
	const { rows } = conservationRows( { inventory, proposal, skeleton } );
	assert.deepEqual( rows.map( ( r ) => [ r.key, r.class, r.host, r.hostBlock ] ), [ [ 'Root/3#0', 'host-unread', 'Root/2#0', 'sgs/button' ], [ 'Root/4#0', 'no-row', null, null ] ] );
} );

test( 'an element only a state shows is checked like the others: read through a node or a copy, else a state-only row naming the state (MUST FAIL where revealed records are never checked)', () => {
	const open = { component: 'Root', keys: { faqOpen: { a: true } } };
	const s = surface();
	s.inventory.revealed = [
		// An accordion answer with its own panel paint, which no node names.
		el( 'Root/20#0', 'background: ivory; padding: 16px', { parentKey: 'Root/1#0', reveal: open } ),
		// The same answer read again in a second state that also shows it: listed once.
		el( 'Root/20#0', 'background: ivory; padding: 16px', { parentKey: 'Root/1#0', reveal: { component: 'Root', keys: { faqOpen: { a: true, b: true } } } } ),
		// A chip copy the option picker's slot reads through its loop.
		el( 'Root/7#2', 'background: white; box-shadow: 0 2px 0 black', { parentKey: 'Root/6#0', reveal: open } ),
		// A text that paints nothing.
		el( 'Root/21#0', 'color: red', { parentKey: 'Root/20#0', reveal: open } ),
		// A flex row the state shows, laying out two children of its own state.
		el( 'Root/22#0', 'gap: 8px', { parentKey: 'Root/1#0', display: 'flex', reveal: open } ),
		el( 'Root/23#0', null, { parentKey: 'Root/22#0', reveal: open } ),
		el( 'Root/23#1', null, { parentKey: 'Root/22#0', reveal: open } ),
	];
	const r = conservationRows( s );
	assert.deepEqual( Object.keys( r.rows.find( ( x ) => 'Root/22#0' === x.key )?.looks ?? {} ), [ 'layout' ], 'its children are counted in its state' );
	const row = r.rows.find( ( x ) => 'Root/20#0' === x.key );
	assert.deepEqual( [ row?.class, row?.state, row?.shownIn ], [ 'state-only', 'unrecorded', open ] );
	assert.deepEqual( Object.keys( row.looks ).sort(), [ 'background', 'padding' ] );
	assert.equal( r.rows.filter( ( x ) => 'Root/20#0' === x.key ).length, 1, 'one element shown in two states is one row' );
	assert.deepEqual( [ r.counts.painted, r.counts.statePainted, r.counts.loopCopy, r.counts.unread ], [ 11, 3, 2, 7 ] );
	// Negative control: a node naming the answer reads it, and an inventory with no states has no state rows.
	s.skeleton[ 0 ].innerBlocks.push( node( 'sgs/text', 'Root/20#0' ), node( 'sgs/container', 'Root/22#0' ) );
	assert.ok( ! conservationRows( s ).rows.some( ( x ) => 'state-only' === x.class ) );
	assert.equal( conservationRows( surface() ).counts.statePainted, 0 );
	// The tool's table counts the state's painted elements.
	assert.match( markdown( { rows: [], counts: { demo: { home: conservationRows( { ...s, skeleton: surface().skeleton } ).counts } } }, 'T' ), /\| 0 \| 3 \|\n/ );
	// The propose-time check names it.
	const t = surface();
	t.inventory.revealed = [ el( 'Root/20#0', 'background: ivory', { parentKey: 'Root/1#0', reveal: open } ) ];
	assert.ok( paintProblems( t ).some( ( p ) => /state-only/.test( p ) && /Root\/20#0/.test( p ) ) );
} );

test( 'conservationRows counts computed padding against the inventory\'s measurement of the browser\'s own, and only declared padding without one (MUST FAIL where any computed padding is a look)', () => {
	const pad = ( left ) => ( { 375: { 'padding-left': left }, 768: { 'padding-left': left }, 1440: { 'padding-left': left } } );
	const elements = [ el( 'Root/1#0', null, { tag: 'ul', resolved: pad( '40px' ) } ), el( 'Root/2#0', null, { tag: 'ul', resolved: pad( '24px' ) } ), el( 'Root/3#0', 'padding-left: 24px', { tag: 'ul', resolved: pad( '24px' ) } ) ];
	const rowsOf = ( inventory ) => conservationRows( { inventory, proposal: { rows: [] }, skeleton: [] } ).rows.map( ( r ) => r.key );
	const uaPadding = { ul: { 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '40px' } };
	assert.deepEqual( rowsOf( { elements, uaPadding } ), [ 'Root/2#0', 'Root/3#0' ], 'a list indented as the browser indents it paints no padding' );
	// Negative control: a saved inventory read before the measurement counts the declared padding only.
	assert.deepEqual( rowsOf( { elements } ), [ 'Root/3#0' ] );
	// The key of an input carries its type.
	assert.equal( uaKeyOf( { tag: 'input', attrs: { type: 'Checkbox' } } ), 'input[type=checkbox]' );
	assert.equal( uaKeyOf( { tag: 'input', attrs: {} } ), 'input' );
	assert.equal( uaKeyOf( { tag: 'td' } ), 'td' );
} );

test( 'MUST FAIL: a host-band record is refused when the host already holds a content width that is not the wrapper cap it replaces', () => {
	const band = { contentWidth: { slot: '.sgs-hero__inner', slots: [ '.sgs-hero__inner' ], property: 'max-width' } };
	const record = [ { kind: 'host-band', node: 'Root/2#0', looks: [ 'max-width', 'margin-auto' ], width: 1120 } ];
	const at = ( attributes, decided ) => new Map( [ [ 'Root/2#0', { name: 'sgs/hero', draftRef: { tpl: 'Root/2#0' }, attributes, decided } ] ] );
	const check = ( nodes ) => checkRecords( record, { looks: [ 'max-width', 'margin-auto' ], nodes, calibration: () => band } );
	assert.deepEqual( check( at( { contentWidth: { desktop: '1240px' } } ) ).bad, [ 'host-band Root/2#0: sgs/hero holds contentWidth 1240px but the wrapper it replaces caps at 1120px' ] );
	assert.deepEqual( check( at( {}, { contentWidth: { desktop: '900px' } } ) ).bad, [ 'host-band Root/2#0: sgs/hero holds contentWidth 900px but the wrapper it replaces caps at 1120px' ], 'a decided setting counts too' );
	assert.deepEqual( check( at( { contentWidth: { desktop: '1120px', tablet: '1120.3px' } } ) ), { delivered: [ 'max-width', 'margin-auto' ], listed: null, bad: [] }, 'the cap, within the tolerance' );
	assert.deepEqual( check( at( { contentWidth: { desktop: '1120px', mobile: '335px' } } ) ).bad, [], 'a narrower tier may hold less: only the tier the cap was read at is compared' );
	assert.deepEqual( check( at( {} ) ).bad, [], 'a host that holds no width yet is left to the band Fill writes' );
	assert.deepEqual( checkRecords( [ { ...record[ 0 ], width: undefined } ], { looks: [ 'max-width', 'margin-auto' ], nodes: at( { contentWidth: { desktop: '1240px' } } ), calibration: () => band } ).bad, [], 'a record that names no width states nothing to compare' );
} );

test( 'MUST FAIL: a host-band record delivers a width cap and auto margins when its node is in the skeleton, and nothing else', () => {
	const nodes = new Map( [ [ 'Root/2#0', { draftRef: { tpl: 'Root/2#0' } } ] ] );
	const rec = [ { kind: 'host-band', node: 'Root/2#0', looks: [ 'max-width', 'margin-auto' ] } ];
	assert.deepEqual( checkRecords( rec, { looks: [ 'max-width', 'margin-auto' ], nodes } ), { delivered: [ 'max-width', 'margin-auto' ], listed: null, bad: [] } );
	assert.deepEqual( checkRecords( rec, { looks: [ 'max-width', 'margin-auto' ], nodes: new Map() } ).bad, [ 'host-band Root/2#0  cannot be verified' ], 'no such node in the skeleton' );
	assert.deepEqual( checkRecords( [ { kind: 'host-band', node: 'Root/2#0', looks: [ 'background' ] } ], { looks: [ 'background' ], nodes } ).bad, [ 'host-band Root/2#0  cannot be verified' ], 'a background is no band look' );
	assert.deepEqual( checkRecords( [ { kind: 'host-band', looks: [ 'max-width' ] } ], { looks: [ 'max-width' ], nodes } ).bad, [ 'host-band names no node' ] );
} );
