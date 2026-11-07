// The applier's layers family: bare decorative layers the draft paints are inserted as sgs/decorative-image blocks at the draft's
// child position. Covers the target builder (lib/apply-layer-targets.mjs), the family (lib/apply-family-layers.mjs) and the insert
// ops (lib/apply-ops.mjs). Each case has a negative control. Run: node --test tests/apply-layers.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { layers } from '../lib/apply-family-layers.mjs';
import { layerTargets } from '../lib/apply-layer-targets.mjs';
import { declaredSides, layerRef } from '../lib/decoration-layers.mjs';
import { changesPost, insertsOf, patchesFor, restoreOf } from '../lib/apply-ops.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { openDb } from '../lib/db.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';

const HERE = path.dirname( new URL( import.meta.url ).pathname.replace( /^\/(\w:)/, '$1' ) );
const db = openDb();
const decisions = JSON.parse( fs.readFileSync( path.join( HERE, '../data/skeleton-decisions.json' ), 'utf8' ) );
const calibrations = path.join( HERE, '../cache' );
const calFor = ( block ) => loadCalibration( calibrations, block, 'local-indus' );
const snapshot = loadSnapshot( path.join( HERE, '../../../sites/indus-foods/theme-snapshot.json' ) );

// A fixture skeleton for surface `demo`: a section (Root/1) holding a ring (Root/2, paired), a glow layer (Root/3), a glare layer
// (Root/4) and a text (Root/5, paired); and a card (Root/6, unpaired) holding a bar layer (Root/7).
const element = ( n, parent, snippet, style = '' ) => ( { key: `Root/${ n }#0`, parentKey: parent ? `Root/${ parent }#0` : null, tpl: n, attrs: style ? { style } : {}, snippet } );
const GLOW = 'position: absolute; inset: 0px; background: radial-gradient(70% 90% at 0% 100%, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 60%);';
const GLARE = 'position: absolute; inset: 0px; background: radial-gradient(circle at var(--gx,100%) var(--gy,0%), rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0) 55%);';
const BAR = 'position: absolute; top: -2px; left: 0px; width: 44px; height: 3px; background: var(--acc,#D8CA50);';
const elements = [
	element( 1, null, '<section>' ),
	element( 2, 1, '<i>' ),
	element( 3, 1, `<span style="${ GLOW }">`, GLOW ),
	element( 4, 1, `<span style="${ GLARE }">`, GLARE ),
	element( 5, 1, '<p>' ),
	element( 6, null, '<div>' ),
	element( 7, 6, `<span style="${ BAR }">`, BAR ),
];
const rows = [ 3, 4, 7 ].map( ( n ) => ( { key: `Root/${ n }#0`, rule: 'decorationLayer', action: 'remove' } ) );
const fixture = () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'layers-' ) );
	const dir = path.join( repo, 'sites', 'client', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'demo.proposal.json' ), JSON.stringify( { rows } ) );
	fs.writeFileSync( path.join( dir, 'demo.inventory.json' ), JSON.stringify( { elements } ) );
	return repo;
};
const pairs = [ { ref: 'cr-ref-demo-1', tpl: 'Root/1#0' }, { ref: 'cr-ref-demo-2', tpl: 'Root/2#0' }, { ref: 'cr-ref-demo-5', tpl: 'Root/5#0' } ];
const saved = { 'cr-ref-demo-1': { block: 'sgs/hero', attrs: {} }, 'cr-ref-demo-2': { block: 'sgs/decorative-image', attrs: {} }, 'cr-ref-demo-5': { block: 'sgs/text', attrs: {} } };
const build = ( over = {} ) => layerTargets( { repo: fixture(), client: 'client', surface: 'demo', pairs, saved, decisions, ...over } ).targets;

test( 'layerTargets: a glow layer is a target anchored after the block before it; the glare layer is not a target (the motion layer delivers it); MUST FAIL without the delivered kinds', () => {
	const targets = build();
	const glow = targets.find( ( t ) => 'cr-ref-demo-L3' === t.ref );
	assert.deepEqual( glow.layer.anchor, { match: 'cr-ref-demo-2', position: 'after' } );
	assert.equal( glow.layer.anchorTo, 'section', 'a layer in a hero is anchored to the section' );
	assert.equal( glow.layer.sides.top && glow.layer.sides.left, true );
	assert.equal( targets.some( ( t ) => 'cr-ref-demo-L4' === t.ref ), false );
	const without = build( { decisions: { rules: {} } } );
	assert.equal( without.some( ( t ) => 'cr-ref-demo-L4' === t.ref ), true, 'with no delivered kinds the glare layer would be a layer too' );
} );

test( 'layerTargets: a layer whose parent has no block on the post is unpaired with the reason; MUST FAIL when the parent is paired', () => {
	const bar = build().find( ( t ) => 'cr-ref-demo-L7' === t.ref );
	assert.match( bar.layer.unpaired, /Root\/6#0 has no block on the post/ );
	const paired = build( { pairs: [ ...pairs, { ref: 'cr-ref-demo-6', tpl: 'Root/6#0' } ], saved: { ...saved, 'cr-ref-demo-6': { block: 'sgs/container', attrs: {} } } } ).find( ( t ) => 'cr-ref-demo-L7' === t.ref );
	assert.equal( paired.layer.unpaired, undefined );
	assert.deepEqual( paired.layer.anchor, { match: 'cr-ref-demo-6', position: 'first-child' }, 'a layer with no paired sibling is the first child of its parent' );
} );

test( 'layerRef and declaredSides: a repeated template element has one ref per copy; inset places all four sides', () => {
	assert.equal( layerRef( 'our-story', 'Root/518#0' ), 'cr-ref-our-story-L518' );
	assert.equal( layerRef( 'our-story', 'Root/361#2' ), 'cr-ref-our-story-L361-2' );
	assert.deepEqual( declaredSides( 'position: absolute; inset: 0px;' ), { top: true, right: true, bottom: true, left: true } );
	assert.deepEqual( declaredSides( 'position: absolute; top: -2px; left: 0px; width: 44px;' ), { top: true, right: false, bottom: false, left: true } );
	assert.deepEqual( declaredSides( 'position: absolute; width: 44px;' ), { top: false, right: false, bottom: false, left: false } );
} );

const facts = ( styles, layout = { w: 1240, h: 344 } ) => ( { styles: { position: 'absolute', top: '0px', right: '0px', bottom: '0px', left: '0px', width: `${ layout.w }px`, height: `${ layout.h }px`, 'border-radius': '0px', 'background-image': 'radial-gradient(70% 90% at 0% 100%, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 60%)', 'background-color': 'rgba(0, 0, 0, 0)', opacity: '1', ...styles }, layout } );
const at = ( f ) => ( { 1440: f, 768: f, 375: f } );
const glowTarget = () => ( { ref: 'cr-ref-demo-L3', key: 'cr-ref-demo-L3', tpl: 'Root/3#0', via: 'layer', layer: build().find( ( t ) => 'cr-ref-demo-L3' === t.ref ).layer } );
const ctx = ( o = {} ) => ( { target: glowTarget(), block: null, saved: {}, draft: at( facts( {} ) ), live: at( undefined ), db, calFor, snapshot, ...o } );

test( 'layers: a missing glow is an insert op with the box and fill from the draft, and checks that re-read the box and the gradient', () => {
	const [ item ] = layers.decide( ctx() );
	assert.equal( item.status, 'op' );
	assert.equal( item.insert.block, 'sgs/decorative-image' );
	assert.equal( item.insert.attrs.className, 'cr-ref-demo-L3' );
	assert.equal( item.insert.attrs.anchorTo, 'section' );
	assert.equal( item.insert.attrs.width.desktop, '100%' );
	assert.equal( item.insert.attrs.height.desktop, '100%' );
	assert.equal( item.insert.attrs.positionTop.desktop, '0px' );
	assert.match( item.insert.attrs.backgroundColourGradient, /^radial-gradient\(70% 90% at 0% 100%/ );
	assert.deepEqual( item.anchor, { match: 'cr-ref-demo-2', position: 'after' } );
	assert.ok( item.checks.some( ( c ) => 'background-image' === c.prop && 1440 === c.width ) );
	assert.ok( item.checks.some( ( c ) => 'w' === c.box && 1240 === c.want ) );
} );

test( 'layers: a bar placed by two sides and a size gets its px size; a blob gets its radius; MUST FAIL when the radius is zero', () => {
	const bar = { ...glowTarget(), layer: { ...glowTarget().layer, sides: { top: true, right: false, bottom: false, left: true } } };
	const blob = facts( { top: '-2px', left: '0px', width: '44px', height: '3px', 'border-radius': '50%', 'background-image': 'none', 'background-color': 'rgb(216, 202, 80)' }, { w: 44, h: 3 } );
	const [ item ] = layers.decide( ctx( { target: bar, draft: at( blob ) } ) );
	assert.equal( item.insert.attrs.width.desktop, '44px' );
	assert.equal( item.insert.attrs.height.desktop, '3px' );
	assert.equal( item.insert.attrs.positionTop.desktop, '-2px' );
	assert.ok( item.insert.attrs.backgroundColour, 'the fill is written' );
	assert.equal( item.insert.attrs.backgroundColourGradient, undefined );
	assert.ok( item.insert.attrs.borderRadius, 'the radius is written' );
	const square = layers.decide( ctx( { target: bar, draft: at( { ...blob, styles: { ...blob.styles, 'border-radius': '0px' } } ) } ) )[ 0 ];
	assert.equal( square.insert.attrs.borderRadius, undefined );
} );

test( 'layers: a layer already on the post is equal and proposes no insert (the second run); MUST FAIL without the block on the post', () => {
	const done = layers.decide( ctx( { block: 'sgs/decorative-image', saved: { className: 'cr-ref-demo-L3' } } ) );
	assert.deepEqual( done.map( ( i ) => i.status ), [ 'equal' ] );
	assert.equal( done[ 0 ].insert, undefined );
	assert.equal( layers.decide( ctx() )[ 0 ].status, 'op' );
} );

test( 'layers: a layer whose parent is unpaired, or that the draft never draws, is unpaired with a reason; no op', () => {
	const target = { ...glowTarget(), layer: { unpaired: 'the layer\'s parent Root/6#0 has no block on the post' } };
	const [ a ] = layers.decide( ctx( { target } ) );
	assert.equal( a.status, 'unpaired' );
	assert.match( a.why, /no block on the post/ );
	const [ b ] = layers.decide( ctx( { draft: { 1440: undefined, 768: undefined, 375: undefined } } ) );
	assert.equal( b.status, 'unpaired' );
	assert.match( b.why, /not on the draft page/ );
} );

test( 'layers: only layer targets reach the layers family and layer targets reach no other family', async () => {
	const { FAMILIES } = await import( '../lib/apply-families.mjs' );
	assert.deepEqual( FAMILIES.filter( ( f ) => f.layers ).map( ( f ) => f.name ), [ 'layers' ] );
	assert.deepEqual( layers.decide( ctx( { target: { ref: 'cr-ref-x-1', tpl: 'Root/1#0' } } ) ), [] );
} );

test( 'insert ops: an insert is a patch beside its anchor in decision order, always changes the post, and is restored by removing the block', () => {
	const op = ( ref, anchor, position ) => ( { postId: 95, ref, block: 'sgs/decorative-image', family: 'layers', insert: { block: 'sgs/decorative-image', attrs: { className: ref } }, anchor: { match: anchor, position }, writes: [] } );
	const a = op( 'cr-ref-demo-L3', 'cr-ref-demo-2', 'after' );
	const b = op( 'cr-ref-demo-L9', 'cr-ref-demo-2', 'after' );
	assert.deepEqual( insertsOf( [ a, b ] ).get( 95 ).map( ( p ) => p.insert.attrs.className ), [ 'cr-ref-demo-L3', 'cr-ref-demo-L9' ] );
	assert.deepEqual( patchesFor( [ a ], {} ).get( 95 ), [ { match: 'cr-ref-demo-2', insert: a.insert, position: 'after' } ] );
	assert.equal( changesPost( a, {} ), true );
	assert.equal( changesPost( { postId: 95, ref: 'x', block: 'sgs/text', writes: [] }, { 95: { blocks: { x: { attrs: {} } } } } ), false, 'an op that writes nothing changes nothing' );
	assert.deepEqual( restoreOf( a, {} ), { match: 'cr-ref-demo-L3', block: 'sgs/decorative-image', remove: true } );
} );

test( 'layers: an inserted layer takes the draft z-index (auto is zIndex 0) and a check reads it back; a numbered draft keeps its number', () => {
	const [ auto ] = layers.decide( ctx( { draft: at( facts( { 'z-index': 'auto' } ) ) } ) );
	assert.equal( auto.insert.attrs.zIndex, 0 );
	assert.ok( auto.checks.some( ( c ) => 'z-index' === c.prop && '0' === c.want ) );
	const [ three ] = layers.decide( ctx( { draft: at( facts( { 'z-index': '3' } ) ) } ) );
	assert.equal( three.insert.attrs.zIndex, 3 );
} );

test( 'layerstack: a paired decorative image takes the draft z-index; saved 0 against auto is equal; another block is untouched; MUST FAIL for a numbered mismatch', async () => {
	const { layerStack } = await import( '../lib/apply-family-layers.mjs' );
	const base = { target: { ref: 'cr-ref-demo-2', tpl: 'Root/2#0' }, block: 'sgs/decorative-image', saved: {}, db };
	const drawn = ( z ) => at( facts( { 'z-index': z } ) );
	const [ op ] = layerStack.decide( { ...base, draft: drawn( 'auto' ) } );
	assert.equal( op.status, 'op' );
	assert.deepEqual( op.writes, [ { attr: 'zIndex', value: 0 } ] );
	assert.deepEqual( op.checks.map( ( c ) => [ c.width, c.prop, c.want ] ), [ [ 375, 'z-index', '0' ], [ 768, 'z-index', '0' ], [ 1440, 'z-index', '0' ] ] );
	assert.equal( layerStack.decide( { ...base, saved: { zIndex: 0 }, draft: drawn( 'auto' ) } )[ 0 ].status, 'equal' );
	assert.equal( layerStack.decide( { ...base, saved: { zIndex: 1 }, draft: drawn( '1' ) } )[ 0 ].status, 'equal', 'the block default is 1' );
	assert.equal( layerStack.decide( { ...base, saved: { zIndex: 1 }, draft: drawn( '5' ) } )[ 0 ].writes[ 0 ].value, 5 );
	assert.deepEqual( layerStack.decide( { ...base, block: 'sgs/container', draft: drawn( 'auto' ) } ), [] );
	assert.equal( layerStack.decide( { ...base, draft: { 1440: facts( { 'z-index': 'auto' } ), 768: facts( { 'z-index': '2' } ), 375: facts( { 'z-index': 'auto' } ) } } )[ 0 ].status, 'no-setting' );
} );
