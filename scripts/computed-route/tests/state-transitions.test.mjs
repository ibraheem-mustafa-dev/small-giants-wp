// The hover and state transitions no motion recogniser took (lib/state-transitions.mjs; detector tools/state-transitions.mjs).
// Rows here are shaped as Fill's never-silent check writes them (lib/fill-motion-account.mjs::silentRows), records as the
// re-derived animation inventory holds them, writes as Fill's report holds them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { silentRecordRows, isTransition, familyOf, statesFor, relationOf, holderOf, surfaceRows, groupRows, skeletonTargetKeys } from '../lib/state-transitions.mjs';

const silent = ( id, mech, trig, extra = {} ) => ( { node: 'cr-ref-x-3', block: 'sgs/demo', slot: '', property: 'motion', value: id, reason: `${ id } (${ mech }, ${ trig }) belongs to this surface, but no effect, setting or handover holds it: nothing recognised it, and a run that cannot place a record names it here`, ...extra } );

test( 'silentRecordRows takes only the motion rows nothing recognised', () => {
	const rows = silentRecordRows( [
		silent( 'TR-1', 'css-transition', 'hover' ),
		// Negative controls: a record that reached a target, a record with no home, a row of another property.
		{ ...silent( 'TR-2', 'css-transition', 'hover' ), reason: 'TR-2 (css-transition, hover) belongs to this surface and reaches sgs/demo root, but no effect, setting or handover holds it there' },
		{ ...silent( 'TR-3', 'css-transition', 'hover' ), reason: 'TR-3 (css-transition, hover) belongs to this surface (draft inventory), but no effect, setting or handover holds it: no skeleton node holds its element' },
		{ ...silent( 'TR-4', 'css-transition', 'hover' ), property: 'color' },
	] );
	assert.deepEqual( rows, [ { id: 'TR-1', mechanism: 'css-transition', trigger: 'hover', node: 'cr-ref-x-3', block: 'sgs/demo', slot: '' } ] );
} );

test( 'familyOf, statesFor and isTransition', () => {
	assert.equal( familyOf( 'background' ), 'background' );
	assert.equal( familyOf( 'background-color' ), 'background' );
	assert.equal( familyOf( 'border-top-color' ), 'border-color' );
	assert.equal( familyOf( 'scale' ), 'transform' );
	assert.equal( familyOf( 'padding-left' ), 'padding' );
	assert.equal( familyOf( 'box-shadow :active' ), 'box-shadow' );
	assert.equal( familyOf( 'border-top-width' ), 'border-top-width' );
	assert.deepEqual( statesFor( 'hover' ), [ 'hover' ] );
	assert.deepEqual( statesFor( 'press' ), [ 'active' ] );
	assert.equal( statesFor( 'state' ), null );
	assert.deepEqual( statesFor( 'mount' ), [] );
	assert.equal( isTransition( 'css-pseudo' ), true );
	assert.equal( isTransition( 'waapi' ), false );
} );

const template = {
	'Page/5': { parentChain: [ 'Page/4', 'Page/2', 'Page/1' ], tag: 'button', words: 'Next' },
	'Page/9': { parentChain: [ 'Page/8' ], tag: 'span', words: '' },
};
const targets = new Set( [ 'Page/2', 'Page/7' ] );

test( 'relationOf: own node, folded with its depth, no element', () => {
	assert.deepEqual( relationOf( { element: { dc: 'Page', template_tpl_id: '7' } }, targets, template ), { kind: 'own-node' } );
	assert.deepEqual( relationOf( { element: { dc: 'Page', template_tpl_id: '5' } }, targets, template ), { kind: 'folded', depth: 2, tag: 'button', words: 'Next' } );
	// A folded element under no target has no depth.
	assert.equal( relationOf( { element: { dc: 'Page', template_tpl_id: '9' } }, targets, template ).depth, null );
	assert.deepEqual( relationOf( { element: { dc: 'Page', template_tpl_id: null } }, targets, template ), { kind: 'no-element' } );
	// A record naming several elements is the node's own when any of them is a target.
	assert.equal( relationOf( { element: { dc: 'Page', template_tpl_id: [ '5', '7' ] } }, targets, template ).kind, 'own-node' );
} );

test( 'holderOf: a write at the home slot in the state, a calibrated setting, a motion channel, or nothing', () => {
	const writes = [
		{ node: 'n', slot: '.part', prop: 'background-color', state: 'hover', attr: 'partBgHover' },
		{ node: 'n', slot: '', prop: 'color', state: 'hover', attr: 'textColourHover' },
		{ node: 'n', slot: '', prop: 'border-top-color', state: null, attr: 'borderColour' },
	];
	const settings = { borderColourHover: { property: 'border-top-color', state: 'hover' }, itemBorderCurrent: { property: 'border-bottom-color', state: 'current' }, plain: { property: 'box-shadow', state: null } };
	assert.deepEqual( holderOf( { trigger: 'hover', property: 'background', writes, settings, slot: '.part' } ), { family: 'background', verdict: 'written-at-home', attrs: [ 'partBgHover' ] } );
	// Negative control: the same write is another element's look when the record's home is the root.
	assert.equal( holderOf( { trigger: 'hover', property: 'background', writes, settings, slot: '' } ).verdict, 'none' );
	assert.equal( holderOf( { trigger: 'hover', property: 'color', writes, settings } ).verdict, 'written-at-home' );
	// A resting write is no state look; calibration's hover setting is.
	assert.deepEqual( holderOf( { trigger: 'hover', property: 'border-color', writes, settings } ), { family: 'border-color', verdict: 'setting', attrs: [ 'borderColourHover' ] } );
	// A `state` trigger is any named state but hover and focus.
	assert.deepEqual( holderOf( { trigger: 'state', property: 'border-color', writes, settings } ).attrs, [ 'itemBorderCurrent' ] );
	assert.equal( holderOf( { trigger: 'focus', property: 'border-color', writes, settings } ).verdict, 'none' );
	// A resting setting is no holder of a hover shadow.
	assert.equal( holderOf( { trigger: 'hover', property: 'box-shadow', writes, settings } ).verdict, 'none' );
	assert.equal( holderOf( { trigger: 'hover', property: 'transform', writes, settings } ).verdict, 'motion' );
	assert.equal( holderOf( { trigger: 'hover', property: 'opacity', writes, settings: null } ).verdict, 'motion' );
} );

test( 'surfaceRows sets each silent row against its record, place and holders; groupRows counts them by cause', () => {
	const records = [
		{ id: 'TR-1', mechanism: 'css-transition', trigger: { type: 'hover' }, element: { dc: 'Page', template_tpl_id: '5' }, properties: [ { property: 'transform', from: null, to: 'translateY(-2px)' }, { property: 'background', from: null, to: null, formula: 'state-bound: {{ o.bg }}' } ] },
		{ id: 'TR-2', mechanism: 'css-pseudo', trigger: { type: 'hover' }, element: { dc: 'Page', template_tpl_id: '5' }, properties: [ { property: 'color', from: '#000', to: '#000' } ] },
		{ id: 'K-1', mechanism: 'css-animation', trigger: { type: 'load' }, element: { dc: 'Page', template_tpl_id: null }, properties: [] },
	];
	const rows = surfaceRows( {
		unmapped: [ silent( 'TR-1', 'css-transition', 'hover' ), silent( 'TR-2', 'css-pseudo', 'hover' ), silent( 'K-1', 'css-animation', 'load' ) ],
		records, targetKeys: targets, template, writes: [], settingsOf: () => ( { bgHover: { property: 'background-color', state: 'hover' } } ),
	} );
	assert.deepEqual( rows.map( ( r ) => [ r.id, r.transition, r.relation.kind ] ), [ [ 'TR-1', true, 'folded' ], [ 'TR-2', true, 'folded' ], [ 'K-1', false, 'no-element' ] ] );
	assert.deepEqual( rows[ 0 ].properties.map( ( p ) => [ p.family, p.verdict, p.changes ] ), [ [ 'transform', 'motion', true ], [ 'background', 'setting', true ] ] );
	// A value that does not change is marked so.
	assert.equal( rows[ 1 ].properties[ 0 ].changes, false );
	const groups = groupRows( rows.filter( ( r ) => r.transition ).map( ( r ) => ( { surface: 's', ...r } ) ) );
	assert.deepEqual( groups.map( ( g ) => [ g.key, g.rows ] ), [
		[ 'sgs/demo | root | background | hover | folded into the node; setting', 1 ],
		[ 'sgs/demo | root | color | hover | folded into the node; none (no change stated)', 1 ],
		[ 'sgs/demo | root | transform | hover | folded into the node; motion', 1 ],
	] );
	assert.deepEqual( groups[ 0 ].records, [ 's:TR-1' ] );
} );

test( 'skeletonTargetKeys names the served root host after the component and keeps an imported host', () => {
	const tree = [ { name: 'sgs/a', draftRef: { tpl: 'Root/3#0' }, draftSlots: { '.sgs-a__b': { tpl: 'Root/4#0' } }, innerBlocks: [ { name: 'sgs/c', draftRef: { tpl: 'Root>Card@12#0/6#1' }, innerBlocks: [] }, { name: 'sgs/d', draftRef: '#css-finder', innerBlocks: [] } ] } ];
	assert.deepEqual( [ ...skeletonTargetKeys( tree, 'Page' ) ].sort(), [ 'Card/6', 'Page/3', 'Page/4' ] );
} );
