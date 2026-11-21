// A bare layer that paints only a gradient or a fill and covers its host block's whole box is the host's own overlay
// (lib/skeleton-overlay-layer.mjs; Bean, 2026-11-21: a draft layer's look is absorbed by its parent when the parent has an
// equivalent setting, otherwise it stays a block of its own): it makes no decorative image, it is the overlay's draft element,
// several such layers stack into the one setting with the layer drawn last on top, and Fill reads the stack at the overlay's
// slot (lib/fill-overlay-stack.mjs). A layer with a non-zero inset, a radius, content, a place above the content, or a host
// with no overlay setting stays a decorative image; a single flat colour is the overlay's colour, not its gradient.
// Pure functions and a temporary folder only: no command, no site. The overlay's calibration is given as a slot map in the
// test (the real one needs the overlay settings routed in the framework database; see the route README).
// Mutation list: tests/skeleton-overlay-layer.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { layerRefusal, overlayOf, overlaySetting, paintAt } from '../lib/skeleton-overlay-layer.mjs';
import { stackOverlayLayers, stackOf } from '../lib/fill-overlay-stack.mjs';
import { skeletonNodes, skeletonProblems, OVERLAY_LAYER_SLOT } from '../lib/fill-skeleton.mjs';
import { checkRecords, RECORD_KINDS } from '../lib/skeleton-paint-conservation.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { N, find, build, draftRepo, facts, db } from './fixtures/skeleton-widgets/build.mjs';

const SLOT = '.sgs-bg-overlay';
const GRAD = 'linear-gradient(rgba(20, 20, 20, 0.1) 0%, rgba(20, 20, 20, 0.93) 100%)';
const SCRIM = 'linear-gradient(100deg, rgba(18, 18, 18, 0.86) 0%, rgba(18, 18, 18, 0) 100%)';
const PHONE_SCRIM = 'linear-gradient(rgba(20, 20, 20, 0.44) 0%, rgba(20, 20, 20, 0.5) 100%)';
// The hero's overlay as a calibration would read it once routed: the gradient and colour paint the overlay element, its
// opacity too. Each role is the framework database's own (block_attributes.role).
const OVERLAY = {
	backgroundOverlayGradient: { slot: SLOT, slots: [ SLOT ], property: 'background-image', state: null },
	backgroundOverlayColour: { slot: SLOT, slots: [ SLOT ], property: 'background-color', state: null },
	backgroundOverlayOpacity: { slot: SLOT, slots: [ SLOT ], property: 'opacity', state: null },
	backgroundColourGradient: { slot: '', slots: [ '' ], property: 'background-image', state: null },
};
const withOverlay = ( b ) => ( 'sgs/hero' === b ? OVERLAY : {} );
const noOverlay = ( b ) => ( 'sgs/hero' === b ? { backgroundColourGradient: OVERLAY.backgroundColourGradient } : {} );

const HOST = { 375: { x: 0, y: 100, w: 375, h: 738 }, 768: { x: 0, y: 100, w: 768, h: 756 }, 1440: { x: 0, y: 100, w: 1440, h: 756 } };
// section (the host: a picture behind, layers, then the content) with each layer given as { style, paint: { width: value },
// box (a box per width; the host's by default), words }.
const LAYER = ( o = {} ) => N( 'div', { style: o.style ?? `position:absolute;inset:0;background:${ o.paint?.[ 1440 ] ?? GRAD }`, words: o.words, attrs: { 'aria-hidden': 'true' } } );
const page = ( layers, { contentFirst = false } = {} ) => {
	const content = N( 'div', { style: 'position:relative;padding:40px' }, [ N( 'h1', { words: 'The same designer shades.' } ), N( 'p', { words: 'A good deal less.' } ) ] );
	return N( 'main', {}, [ N( 'section', { style: 'position:relative;height:756px;background:#141414' }, [ ...( contentFirst ? [ content ] : [] ), ...layers.map( LAYER ), ...( contentFirst ? [] : [ content ] ) ] ) ] );
};
// The fixture inventory with each layer's computed paint, place and box set as a browser reads them.
const runPage = ( layers, { cal = withOverlay, contentFirst = false } = {} ) => {
	const b = build( page( layers, { contentFirst } ) );
	const section = b.inventory.elements.find( ( e ) => 'section' === e.tag );
	section.box = structuredClone( HOST );
	const kids = b.inventory.elements.filter( ( e ) => e.parentKey === section.key && 'div' === e.tag && 'true' === e.attrs?.[ 'aria-hidden' ] );
	kids.forEach( ( e, i ) => {
		const o = layers[ i ];
		e.box = structuredClone( o.box ?? HOST );
		e.position = { 375: 'absolute', 768: 'absolute', 1440: 'absolute' };
		e.resolved = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, {
			...( o.colour ? { 'background-color': o.colour } : { 'background-image': o.paint?.[ w ] ?? o.paint?.[ 1440 ] ?? GRAD } ),
			...Object.fromEntries( [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].map( ( c ) => [ `border-${ c }-radius`, o.radius ?? '0px' ] ) ),
		} ] ) );
	} );
	const draft = draftRepo( b.html, 'class Component {}' );
	const rec = { schema: '1', client: 'fixture-client', elements: b.recs, surfaces: {}, sources: { files: { 'Root.dc.html': draft.hash } } };
	const r = proposeSkeleton( { inventory: b.inventory, facts: facts( draft.repo ), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: rec, openers: {}, carried: null, calSettings: cal } );
	const host = find( r.skeleton, ( n ) => section.key === n.draftRef?.tpl )[ 0 ];
	return { r, host, section, layers: kids, rowOf: ( e ) => r.proposal.rows.find( ( x ) => x.key === e.key ), nodeOf: ( e ) => find( r.skeleton, ( n ) => e.key === n.draftRef?.tpl )[ 0 ] ?? null };
};

test( 'MUST FAIL: two full-cover gradient layers are the host\'s overlay, stacked with the layer drawn last on top', () => {
	const { r, host, layers, rowOf, nodeOf } = runPage( [ { paint: { 1440: GRAD } }, { paint: { 1440: SCRIM, 375: PHONE_SCRIM } } ] );
	const [ grad, scrim ] = layers;
	assert.equal( nodeOf( grad ), null, 'no decorative image is made for the lower layer' );
	assert.equal( nodeOf( scrim ), null, 'no decorative image is made for the top layer' );
	assert.equal( host.name, 'sgs/hero', 'the fixture section is a hero (rules.hero)' );
	assert.deepEqual( host.draftSlots?.[ SLOT ], { tpl: scrim.key }, 'the top layer is the overlay\'s draft element' );
	assert.deepEqual( host.draftOverlay, { slot: SLOT, setting: 'backgroundOverlayGradient', property: 'background-image', layers: [ { tpl: grad.key }, { tpl: scrim.key } ] }, 'every layer in drawing order' );
	for ( const e of layers ) {
		const row = rowOf( e );
		assert.equal( row.rule, 'overlayLayer' );
		assert.equal( row.action, 'unwrap' );
		const rec = row.conserve.find( ( c ) => 'overlay' === c.kind );
		assert.deepEqual( { node: rec.node, slot: rec.slot, setting: rec.setting, layer: rec.layer }, { node: host.draftRef.tpl, slot: SLOT, setting: 'backgroundOverlayGradient', layer: e.key } );
		assert.ok( rec.settings.includes( 'backgroundOverlayOpacity' ), 'the record names the overlay\'s other settings Fill writes' );
		// The paint detector verifies the record against the host's node.
		const nodes = new Map( [ [ host.draftRef.tpl, host ] ] );
		assert.deepEqual( checkRecords( row.conserve, { looks: [ 'background' ], nodes } ).delivered, [ 'background' ] );
	}
	layers.forEach( ( e ) => assert.match( rowOf( e ).reason, /width ladder/, 'each row says the phone stack is written as scoped CSS' ) );
	assert.deepEqual( skeletonProblems( r.skeleton ).filter( ( p ) => /draftOverlay/.test( p ) ), [] );
} );

test( 'a layer with a non-zero inset, a radius, content or a place above the content stays a decorative image', () => {
	const inset = runPage( [ { style: `position:absolute;inset:24px;background:${ GRAD }`, box: Object.fromEntries( Object.entries( HOST ).map( ( [ w, b ] ) => [ w, { x: 24, y: b.y + 24, w: b.w - 48, h: b.h - 48 } ] ) ) } ] );
	assert.equal( inset.rowOf( inset.layers[ 0 ] ).rule, 'decorationLayer' );
	assert.equal( inset.host.draftOverlay, undefined );
	// A radius from the draft's stylesheet (none inline) is read from the computed corners.
	const radius = runPage( [ { style: `position:absolute;inset:0;background:${ GRAD }`, radius: '24px' } ] );
	assert.equal( radius.rowOf( radius.layers[ 0 ] ).rule, 'decorationLayer' );
	const turned = runPage( [ { style: `position:absolute;inset:0;transform:rotate(3deg);background:${ GRAD }` } ] );
	assert.equal( turned.rowOf( turned.layers[ 0 ] ).rule, 'decorationLayer' );
	const above = runPage( [ { paint: { 1440: GRAD } } ], { contentFirst: true } );
	assert.equal( above.rowOf( above.layers[ 0 ] ).rule, 'decorationLayer', 'a layer drawn after the content covers it' );
	// A ring drawn before the glow stays a decorative image, which the clone draws above the host's overlay: the glow stays too.
	const ringFirst = runPage( [ { style: 'position:absolute;right:-90px;top:-110px;width:340px;height:340px;border-radius:50%;border:2px solid rgba(216, 202, 80, 0.55)', box: Object.fromEntries( Object.entries( HOST ).map( ( [ w, b ] ) => [ w, { x: b.w - 250, y: b.y - 110, w: 340, h: 340 } ] ) ), radius: '50%' }, { paint: { 1440: GRAD } } ] );
	assert.equal( ringFirst.rowOf( ringFirst.layers[ 0 ] ).rule, 'decorativeShape' );
	assert.equal( ringFirst.rowOf( ringFirst.layers[ 1 ] ).rule, 'decorationLayer', 'a layer drawn over a decoration that stays a block' );
	const ringAfter = runPage( [ { paint: { 1440: GRAD } }, { style: 'position:absolute;right:-90px;top:-110px;width:340px;height:340px;border-radius:50%;border:2px solid rgba(216, 202, 80, 0.55)', box: Object.fromEntries( Object.entries( HOST ).map( ( [ w, b ] ) => [ w, { x: b.w - 250, y: b.y - 110, w: 340, h: 340 } ] ) ), radius: '50%' } ] );
	assert.equal( ringAfter.rowOf( ringAfter.layers[ 0 ] ).rule, 'overlayLayer', 'a decoration drawn after the layer stays above it in the clone too' );
	const worded = runPage( [ { words: 'Sale' } ] );
	assert.notEqual( worded.rowOf( worded.layers[ 0 ] ).rule, 'overlayLayer', 'a layer holding words is content' );
	assert.equal( worded.host.draftOverlay, undefined );
} );

test( 'a host with no calibrated overlay setting keeps its layers as decorative images', () => {
	const { host, layers, rowOf } = runPage( [ { paint: { 1440: GRAD } }, { paint: { 1440: SCRIM } } ], { cal: noOverlay } );
	layers.forEach( ( e ) => assert.equal( rowOf( e ).rule, 'decorationLayer' ) );
	assert.equal( host.draftOverlay, undefined );
	assert.equal( host.draftSlots?.[ SLOT ], undefined );
} );

test( 'a single flat-colour layer is the overlay\'s colour, not its gradient; a colour beside a gradient is no one setting', () => {
	const flat = runPage( [ { style: 'position:absolute;inset:0;background:rgba(0, 0, 0, 0.4)', colour: 'rgba(0, 0, 0, 0.4)' } ] );
	assert.equal( flat.rowOf( flat.layers[ 0 ] ).rule, 'overlayLayer' );
	assert.equal( flat.host.draftOverlay.setting, 'backgroundOverlayColour' );
	assert.equal( flat.host.draftOverlay.property, 'background-color' );
	assert.doesNotMatch( flat.rowOf( flat.layers[ 0 ] ).reason, /width ladder/, 'one value at every width needs no ladder' );
	const mixed = runPage( [ { paint: { 1440: GRAD } }, { style: 'position:absolute;inset:0;background:rgba(0, 0, 0, 0.4)', colour: 'rgba(0, 0, 0, 0.4)' } ] );
	mixed.layers.forEach( ( e ) => assert.equal( mixed.rowOf( e ).rule, 'decorationLayer' ) );
} );

test( 'the pure parts: a layer\'s paint, its refusals and the host\'s overlay setting by role', () => {
	assert.equal( paintAt( { 'background-image': GRAD } ), 'gradient' );
	assert.equal( paintAt( { 'background-image': 'url("a.jpg")' } ), null, 'a picture is no overlay' );
	assert.equal( paintAt( { 'background-color': 'rgba(0, 0, 0, 0)' } ), null );
	assert.equal( paintAt( { 'background-color': 'rgb(20, 20, 20)' } ), 'colour' );
	const roleOf = ( a ) => ( { backgroundOverlayGradient: 'colour-gradient', backgroundOverlayColour: 'color', backgroundColourGradient: 'colour-gradient' } )[ a ] ?? null;
	assert.deepEqual( overlaySetting( { settings: OVERLAY, kind: 'gradient', coverSlots: [ SLOT ], roleOf, roles: { gradient: 'colour-gradient', colour: 'color' } } ), { slot: SLOT, setting: 'backgroundOverlayGradient', property: 'background-image' } );
	assert.equal( overlaySetting( { settings: OVERLAY, kind: 'gradient', coverSlots: [], roleOf, roles: { gradient: 'colour-gradient' } } ), null, 'a slot not known to cover the host is no overlay' );
	const m = { shownAt: () => [ 375, 768, 1440 ], kids: () => [] };
	const host = { key: 'H', box: HOST };
	const layer = ( o ) => ( { key: 'L', parentKey: 'H', visible: { 375: true, 768: true, 1440: true }, position: { 375: 'absolute', 768: 'absolute', 1440: 'absolute' }, box: HOST, resolved: { 375: { 'background-image': GRAD }, 768: { 'background-image': GRAD }, 1440: { 'background-image': GRAD } }, ...o } );
	const props = [ 'position', 'inset', 'background' ];
	assert.equal( layerRefusal( { layer: layer(), host, st: { position: 'absolute', inset: '0', background: GRAD }, m, layerProps: props } ), null );
	assert.match( layerRefusal( { layer: layer( { visible: { 375: false, 768: true, 1440: true } } ), host, st: {}, m, layerProps: props } ), /every width/ );
	assert.match( layerRefusal( { layer: layer( { box: { ...HOST, 375: { x: 0, y: 100, w: 375, h: 500 } } } ), host, st: {}, m, layerProps: props } ), /box differs .* 375px/ );
	assert.match( layerRefusal( { layer: layer(), host, st: { animation: 'spin 2s' }, m, layerProps: props } ), /animation/ );
	assert.match( layerRefusal( { layer: layer(), host, st: { opacity: '0.5' }, m, layerProps: [ ...props, 'opacity' ] } ), /opacity/ );
	assert.match( layerRefusal( { layer: layer( { resolved: { 375: { 'background-image': GRAD }, 768: { 'background-color': 'rgb(1, 1, 1)' }, 1440: { 'background-image': GRAD } } } ), host, st: {}, m, layerProps: props } ), /single fill or gradient/ );
	// No overlay opacity setting: the overlay would show at its default strength, so the layers stay.
	const one = layer();
	const out = overlayOf( { host: { ...host, key: 'H' }, candidates: [ one ], m: { ...m, kids: () => [ one ] }, declaredOf: () => ( {} ), settings: { backgroundOverlayGradient: OVERLAY.backgroundOverlayGradient }, roleOf, R: { coverSlots: [ SLOT ], roles: { gradient: 'colour-gradient' } } } );
	assert.equal( out.setting, undefined );
	assert.match( out.refused.L, /opacity/ );
} );

test( 'Fill reads the layers as one stack at the overlay slot, the top layer first, at every width and in the sweep', () => {
	const node = { name: 'sgs/container', draftRef: { tpl: 'H' }, draftSlots: { [ SLOT ]: { tpl: 'B' } }, draftOverlay: { slot: SLOT, setting: 'backgroundOverlayGradient', property: 'background-image', layers: [ { tpl: 'A' }, { tpl: 'B' } ] } };
	const nodes = skeletonNodes( [ node ] );
	const lower = `0:${ OVERLAY_LAYER_SLOT }0`;
	assert.ok( nodes[ 0 ].targets.some( ( t ) => t.id === lower && 'A' === t.finder.tpl ), 'the lower layer is read as a target of its own' );
	const reads = {
		widths: { 375: { [ lower ]: { styles: { 'background-image': GRAD } }, [ `0:${ SLOT }` ]: { styles: { 'background-image': PHONE_SCRIM } } }, 1440: { [ lower ]: { styles: { 'background-image': GRAD } }, [ `0:${ SLOT }` ]: { styles: { 'background-image': SCRIM } } } },
		declared: { 1440: { [ `0:${ SLOT }` ]: { background: SCRIM } } },
		sweep: { [ lower ]: { 'background-image': [ { width: 400, value: GRAD } ] }, [ `0:${ SLOT }` ]: { 'background-image': [ { width: 400, value: SCRIM } ] } },
	};
	const lines = stackOverlayLayers( reads, nodes );
	assert.equal( lines.length, 1 );
	assert.equal( reads.widths[ 1440 ][ `0:${ SLOT }` ].styles[ 'background-image' ], `${ SCRIM }, ${ GRAD }` );
	assert.equal( reads.widths[ 375 ][ `0:${ SLOT }` ].styles[ 'background-image' ], `${ PHONE_SCRIM }, ${ GRAD }` );
	assert.equal( reads.sweep[ `0:${ SLOT }` ][ 'background-image' ][ 0 ].value, `${ SCRIM }, ${ GRAD }` );
	assert.equal( reads.declared[ 1440 ][ `0:${ SLOT }` ].background, undefined, 'the stack is no value the code declares' );
	assert.equal( reads.widths[ 1440 ][ lower ], undefined, 'the lower layer leaves no read of its own' );
	assert.ok( ! nodes[ 0 ].targets.some( ( t ) => t.id === lower ), 'nor a target the resolver would map' );
	assert.equal( stackOf( [ GRAD, 'none', SCRIM ] ), `${ SCRIM }, ${ GRAD }` );
} );

test( 'the overlay record is verified against the host\'s draftOverlay, and refused without it', () => {
	assert.ok( RECORD_KINDS.overlay?.delivers );
	const rec = { kind: 'overlay', node: 'H', slot: SLOT, setting: 'backgroundOverlayGradient', settings: [ 'backgroundOverlayGradient' ], layer: 'A', looks: [ 'background' ] };
	const host = { draftSlots: { [ SLOT ]: { tpl: 'B' } }, draftOverlay: { slot: SLOT, layers: [ { tpl: 'A' }, { tpl: 'B' } ] } };
	assert.deepEqual( checkRecords( [ rec ], { looks: [ 'background' ], nodes: new Map( [ [ 'H', host ] ] ) } ).delivered, [ 'background' ] );
	assert.equal( checkRecords( [ { ...rec, layer: 'Z' } ], { looks: [ 'background' ], nodes: new Map( [ [ 'H', host ] ] ) } ).bad.length, 1, 'a layer the overlay does not list' );
	assert.equal( checkRecords( [ rec ], { looks: [ 'background' ], nodes: new Map( [ [ 'H', { draftSlots: host.draftSlots } ] ] ) } ).bad.length, 1, 'a host with no overlay' );
} );
