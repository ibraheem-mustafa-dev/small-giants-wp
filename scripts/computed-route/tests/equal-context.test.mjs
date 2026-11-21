// A calibrated default is measured in one context; a node in another may not show it (lib/equal-context.mjs, mechanism A of
// the 2026-11-20 fault census). The detector (tools/equal-context.mjs) lists every settled equal row against such a default.
// Rows here are shaped as Fill's report writes them (lib/fill-resolve-element.mjs::fillElement).
import test from 'node:test';
import assert from 'node:assert/strict';
import { contextDiffs, heldPainters, measuredContext, reportContexts } from '../lib/equal-context.mjs';
import { baselineCounts, groupFlagged } from '../tools/equal-context.mjs';

const W = [ 375, 768, 1440 ];
const at = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, { ...v } ] ) );

test( 'contextDiffs names only the differences that change the property', () => {
	const measured = { parentDisplay: 'flex', position: 'static', display: 'block', band: true };
	// A display measured as a flex item is blockified; a node in a block's flow shows the declared one.
	assert.deepEqual( contextDiffs( 'display', '', measured, { parentDisplay: 'block' } ).map( ( d ) => d.kind ), [ 'parent-display' ] );
	// Negative control: the other way round the measured value is not blockified, and a non-display property is not changed.
	assert.deepEqual( contextDiffs( 'display', '', { ...measured, parentDisplay: 'block' }, { parentDisplay: 'grid' } ), [] );
	assert.deepEqual( contextDiffs( 'justify-content', '', measured, { parentDisplay: 'block', display: 'flex' } ), [] );
	// An inset measured in flow says nothing of an out-of-flow node; the reverse is the static position (inOwnContext).
	assert.deepEqual( contextDiffs( 'top', '', measured, { position: 'absolute' } ).map( ( d ) => d.kind ), [ 'position' ] );
	assert.deepEqual( contextDiffs( 'top', '', { ...measured, position: 'absolute' }, { position: 'static' } ), [] );
	// A flex-only property measured on a block box, on a node the clone lays out as flex.
	assert.deepEqual( contextDiffs( 'flex-wrap', '', measured, { display: 'flex' } ).map( ( d ) => d.kind ), [ 'layout' ] );
	assert.deepEqual( contextDiffs( 'flex-wrap', '', measured, { display: 'none' } ), [] );
	assert.deepEqual( contextDiffs( 'flex-wrap', '', measured, { display: '""' } ), [] );
	assert.deepEqual( contextDiffs( 'flex-wrap', '', measured, { display: '"flex"' } ).map( ( d ) => d.kind ), [ 'layout' ] );
	// A display measured on a hidden element says nothing of the layout its rules give it.
	assert.deepEqual( contextDiffs( 'flex-wrap', '', { ...measured, display: 'none' }, { display: 'flex' } ), [] );
	// A banded node paying the page gutter, measured nested in the fixture's band: its root side padding only.
	assert.deepEqual( contextDiffs( 'padding-left', '', measured, { band: false } ).map( ( d ) => d.kind ), [ 'band' ] );
	assert.deepEqual( contextDiffs( 'padding-left', '.sgs-container__inner', measured, { band: false } ), [] );
	assert.deepEqual( contextDiffs( 'padding-top', '', measured, { band: false } ), [] );
	// A held setting is a difference as the caller found it.
	assert.deepEqual( contextDiffs( 'display', '', measured, { held: [ { attr: 'displayType', value: 'email', read: { 375: 'inline' } } ] } ).map( ( d ) => d.kind ), [ 'held-setting' ] );
} );

test( 'heldPainters lists a held value calibration read painting the slot otherwise, and nothing it never read', () => {
	const cal = { discovered: { displayType: { display: { slots: [ '' ], values: { email: { 375: 'inline', 768: 'inline', 1440: 'inline' }, phone: { 375: 'block', 768: 'block', 1440: 'block' } } } } } };
	const schema = { displayType: { default: 'address' } };
	assert.deepEqual( heldPainters( cal, schema, { displayType: 'email' }, '', 'display', 1440, 'block' ).map( ( h ) => h.attr ), [ 'displayType' ] );
	// Negative controls: a read equal to the default, a value never read, the block default, another slot, another property.
	assert.deepEqual( heldPainters( cal, schema, { displayType: 'phone' }, '', 'display', 1440, 'block' ), [] );
	assert.deepEqual( heldPainters( cal, schema, { displayType: 'none' }, '', 'display', 1440, 'block' ), [] );
	assert.deepEqual( heldPainters( cal, { displayType: { default: 'email' } }, { displayType: 'email' }, '', 'display', 1440, 'block' ), [] );
	assert.deepEqual( heldPainters( cal, schema, { displayType: 'email' }, '.x', 'display', 1440, 'block' ), [] );
	assert.deepEqual( heldPainters( cal, schema, { displayType: 'email' }, '', 'color', 1440, 'block' ), [] );
	// A paint state calibration laid over the default for this value already describes the node.
	assert.deepEqual( heldPainters( { ...cal, paintState: 'mail', paintStates: { mail: { when: { equals: { displayType: 'email' } } } } }, schema, { displayType: 'email' }, '', 'display', 1440, 'block' ), [] );
} );

test( 'measuredContext reads the paint\'s context, its display and the fixture\'s band', () => {
	assert.deepEqual( measuredContext( { _parentDisplay: 'block', _position: 'static', display: 'flex' } ), { parentDisplay: 'block', position: 'static', display: 'flex', band: true } );
	assert.equal( measuredContext( { display: 'block' } ), null );
} );

// One surface as Fill saved it: a footer whose business-info holds displayType email (calibration read it inline) and whose
// row holds a flex layout; the node's display at the root comes from its own settled display row.
function surface() {
	const report = {
		surface: 'footer',
		settled: [
			{ node: 'r-0', block: 'sgs/container', slot: '', property: 'display', value: 'flex', widths: W, reason: 'equal', baseline: 'calibrated-default' },
			{ node: 'r-0', block: 'sgs/container', slot: '', property: 'flex-wrap', value: 'nowrap', widths: W, reason: 'equal', baseline: 'calibrated-default' },
			{ node: 'r-1', block: 'sgs/business-info', slot: '', property: 'display', value: 'block', widths: W, reason: 'equal', baseline: 'calibrated-default' },
			{ node: 'r-1', block: 'sgs/business-info', slot: '', property: 'color', value: 'rgb(1, 2, 3)', widths: W, reason: 'equal', baseline: 'parent' },
			{ node: 'r-1', block: 'sgs/business-info', slot: '', property: 'opacity', value: '1', widths: W, reason: 'equal', baseline: 'calibrated-default' },
		],
		unmapped: [],
		writes: [],
	};
	const nodes = [ { ref: 'r-0', parent: null, name: 'sgs/container', attributes: {} }, { ref: 'r-1', parent: 'r-0', name: 'sgs/business-info', attributes: { displayType: 'email' } } ];
	const cals = {
		'sgs/container': { elements: { '': at( { _parentDisplay: 'block', _position: 'static', display: 'flex', 'flex-wrap': 'nowrap' } ) } },
		'sgs/business-info': { elements: { '': at( { _parentDisplay: 'block', _position: 'static', display: 'block', opacity: '1' } ) }, discovered: { displayType: { display: { slots: [ '' ], values: { email: { 375: 'inline', 768: 'inline', 1440: 'inline' } } } } } },
	};
	return { report, nodes, calFor: ( name ) => cals[ name ], schemaOf: () => ( { displayType: { default: 'address' } } ) };
}

test( 'reportContexts flags the calibrated-default rows whose node is in another context, from the saved files', () => {
	const s = surface();
	const out = reportContexts( s.report, s.nodes, s.calFor, s.schemaOf );
	// Every calibrated-default equal row is looked at, and the parent row is not.
	assert.equal( out.length, 4 );
	const flagged = out.filter( ( x ) => x.kinds.length ).map( ( x ) => `${ x.row.node } ${ x.row.property } ${ x.kinds.map( ( k ) => k.kind ).join( ',' ) }` );
	assert.deepEqual( flagged, [ 'r-1 display held-setting' ] );
	// The flex row's flex-wrap was measured on a flex box: no difference (negative control); measured on a block box, there is.
	// The row's display is written by the residual writer, so the clone shows the draft's flex.
	const written = s.report.settled.map( ( r ) => ( 'r-0' === r.node && 'display' === r.property ? { ...r, reason: 'residual-css', baseline: undefined } : r ) );
	const block = { ...s, report: { ...s.report, settled: written }, calFor: ( name ) => ( 'sgs/container' === name ? { elements: { '': at( { _parentDisplay: 'block', display: 'block', 'flex-wrap': 'nowrap' } ) } } : s.calFor( name ) ) };
	assert.deepEqual( reportContexts( block.report, block.nodes, block.calFor, block.schemaOf ).filter( ( x ) => x.kinds.length ).map( ( x ) => `${ x.row.property } ${ x.kinds[ 0 ].kind }` ), [ 'flex-wrap layout', 'display held-setting' ] );
	// An equal display shows the default it was judged equal to, not the draft's spelling.
	const judged = { ...block, report: { ...block.report, settled: block.report.settled.map( ( r ) => ( 'r-0' === r.node && 'display' === r.property ? { ...r, reason: 'equal', baseline: 'calibrated-default' } : r ) ) } };
	assert.deepEqual( reportContexts( judged.report, judged.nodes, judged.calFor, judged.schemaOf ).filter( ( x ) => x.kinds.length ).map( ( x ) => x.row.property ), [ 'display' ] );
	// A display the clone does not show (an unmapped row) is not the node's context.
	const unshown = { ...block, report: { ...block.report, settled: [ ...block.report.settled.filter( ( r ) => ! ( 'r-0' === r.node && 'display' === r.property ) ), { node: 'r-0', block: 'sgs/container', slot: '', property: 'display', value: 'flex', widths: W, reason: 'dimension' } ], unmapped: [ { node: 'r-0', slot: '', property: 'display', value: 'flex', reason: 'no-setting' } ] } };
	assert.deepEqual( reportContexts( unshown.report, unshown.nodes, unshown.calFor, unshown.schemaOf ).filter( ( x ) => x.kinds.length ).map( ( x ) => x.row.property ), [ 'display' ] );
} );

test( 'the tool counts equal rows per baseline kind and groups flagged rows by kind, block, part and property', () => {
	const s = surface();
	assert.deepEqual( baselineCounts( { settled: [ ...s.report.settled, { reason: 'equal', baseline: { 375: 'parent', 768: 'calibrated-default' } }, { reason: 'equal' }, { reason: 'not-painted' } ] } ), { 'calibrated-default': 4, parent: 1, 'per-width': 1, none: 1 } );
	assert.deepEqual( groupFlagged( [ { block: 'sgs/business-info', slot: '', property: 'display', kinds: [ { kind: 'held-setting' }, { kind: 'held-setting' } ] } ] ), { 'held-setting': { 'sgs/business-info | (root) | display': 1 } } );
} );
