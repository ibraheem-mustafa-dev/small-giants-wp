// A draft style no setting of its block holds goes into that block's Custom CSS (lib/fill-custom-css.mjs::customCssWrites,
// Spec 48 FR-48-60 step 2, Spec 32 FR-32-20), never only a gap row: any property and value, a pseudo-class state and a
// pseudo-element part, and a per-width value as scoped @media rules; a property a write already paints is never also CSS;
// a rule the plugin's scoper refuses stays a row naming the scoper's reason. Every Custom CSS writer goes through
// lib/custom-css-writer.mjs, so each rule is labelled as route-written and the report lists every one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { customCssWrites, selectorOf, valueRanges } from '../lib/fill-custom-css.mjs';
import { customCssPuts, routeWrittenRules, ROUTE_LABEL } from '../lib/custom-css-writer.mjs';
import { scopedCssPuts } from '../lib/fill-width-gate.mjs';
import { fillReport, unmappedList } from '../lib/fill-report.mjs';

const tree = () => [ { name: 'sgs/container', ref: 'n0', attributes: {} }, { name: 'sgs/text', ref: 'n1', attributes: { content: 'x' } } ];
const NODES = [ { index: 0, name: 'sgs/container', targets: [] }, { index: 1, name: 'sgs/text', targets: [] } ];
const row = ( over ) => ( { node: 'n0', block: 'sgs/container', slot: '', state: null, widths: [ 375, 768, 1440 ], reason: 'no-setting: sgs/container has no setting for clip-path', ...over } );
const run = ( unmapped, writes = [] ) => {
	const flat = tree();
	return { flat, out: customCssWrites( { unmapped, writes, nodes: NODES, flat, refOf: ( n ) => n.ref } ) };
};

test( 'MUST FAIL: a declaration no setting holds is written to the block\'s Custom CSS, labelled as route-written, and leaves UNMAPPED', () => {
	const { flat, out } = run( [ row( { property: 'clip-path', value: 'polygon(0 0, 100% 0, 50% 100%)' } ) ] );
	const a = flat[ 0 ].attributes;
	assert.equal( a.sgsCustomCss, '& { clip-path: polygon(0 0, 100% 0, 50% 100%); }' );
	assert.equal( a.sgsCustomCssId, 'css0' );
	assert.ok( a.sgsCustomCssNote.startsWith( `${ ROUTE_LABEL }: ` ), a.sgsCustomCssNote );
	assert.deepEqual( out.writes.map( ( w ) => [ w.attr, w.how ] ), [ [ 'sgsCustomCss', 'custom-css' ], [ 'sgsCustomCssId', 'custom-css' ], [ 'sgsCustomCssNote', 'custom-css' ] ] );
	// The row stays a gap (Bean 2026-10-31), its code kept and its reason saying the CSS applies it until a setting exists.
	assert.equal( out.unmapped.length, 1 );
	assert.equal( out.unmapped[ 0 ].appliedCss, '& { clip-path: polygon(0 0, 100% 0, 50% 100%); }' );
	assert.match( out.unmapped[ 0 ].reason, /^no-setting: .*; applied through sgs\/container's Custom CSS until a setting holds it: & \{ clip-path/ );
	assert.deepEqual( [ out.gaps[ 0 ].properties, out.gaps[ 0 ].css ], [ [ 'clip-path' ], '& { clip-path: polygon(0 0, 100% 0, 50% 100%); }' ] );
	assert.match( out.gaps[ 0 ].reason, /applied through sgs\/container's Custom CSS until a setting exists/ );
	// The report's UNMAPPED list carries the applied CSS.
	assert.equal( unmappedList( out.unmapped )[ 0 ].appliedCss, out.unmapped[ 0 ].appliedCss );
} );

test( 'MUST FAIL: a value that differs between the read widths is one scoped @media rule per run of tiers', () => {
	const { flat } = run( [ row( { property: 'transform', value: JSON.stringify( { 375: 'rotate(2deg)', 768: 'rotate(2deg)', 1440: 'none' } ) } ) ] );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, '@media (max-width: 1023px) { & { transform: rotate(2deg); } } @media (min-width: 1024px) { & { transform: none; } }' );
	assert.deepEqual( valueRanges( row( { value: JSON.stringify( { 375: 'a', 768: 'b', 1440: 'a' } ) } ) ).map( ( r ) => r.range ), [ [ 0, 768 ], [ 768, 1024 ], [ 1024, Infinity ] ] );
	// A value read at the desktop width only is a rule over the desktop tier only.
	assert.equal( run( [ row( { property: 'cursor', value: 'pointer', widths: [ 1440 ] } ) ] ).flat[ 0 ].attributes.sgsCustomCss, '@media (min-width: 1024px) { & { cursor: pointer; } }' );
} );

test( 'MUST FAIL: a state is its pseudo-class on the element and a pseudo-element part keeps its place after it', () => {
	const { flat } = run( [ row( { node: 'n1', block: 'sgs/text', slot: '.sgs-text__link::after', state: 'hover', property: 'filter', value: 'brightness(1.1) saturate(0.7)', reason: 'unmapped-element: the draft paints ::after under hover' } ) ] );
	assert.equal( flat[ 1 ].attributes.sgsCustomCss, '& .sgs-text__link:hover::after { filter: brightness(1.1) saturate(0.7); }' );
	assert.equal( selectorOf( '', 'focus' ), '&:focus' );
	assert.equal( selectorOf( '::selection', null ), '&::selection' );
	assert.equal( selectorOf( '.a > .b', null ), '& .a > .b' );
} );

test( 'MUST FAIL: a declaration a setting already paints is never also written as CSS, while its unheld neighbour is', () => {
	const held = row( { property: 'padding-top', value: '3px' } );
	const free = row( { property: 'scroll-snap-align', value: 'start' } );
	const { flat, out } = run( [ held, free ], [ { node: 'n0', slot: '', prop: 'padding', attr: 'padding', how: 'tiers' } ] );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, '& { scroll-snap-align: start; }' );
	assert.doesNotMatch( flat[ 0 ].attributes.sgsCustomCss, /padding/ );
	assert.deepEqual( out.unmapped.map( ( u ) => [ u.property, u.reason, u.appliedCss ] ), [ [ 'padding-top', held.reason, undefined ], [ 'scroll-snap-align', `${ free.reason }; applied through sgs/container's Custom CSS until a setting holds it: & { scroll-snap-align: start; }`, '& { scroll-snap-align: start; }' ] ] );
} );

test( 'MUST FAIL: a rule the scoper refuses stays a row naming the scoper\'s reason, and its safe neighbour is written', () => {
	const bad = row( { property: 'background-image', value: 'url(javascript:alert(1))' } );
	const good = row( { property: 'overflow-y', value: 'auto' } );
	const { flat, out } = run( [ bad, good ] );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, '& { overflow-y: auto; }' );
	assert.deepEqual( out.unmapped.map( ( u ) => u.property ), [ 'background-image', 'overflow-y' ] );
	assert.equal( out.unmapped[ 0 ].appliedCss, undefined );
	assert.match( out.unmapped[ 0 ].reason, /^custom-css-refused: the Custom CSS scoper refuses & \{ background-image: url\(javascript:alert\(1\)\); \}: unsafe value: &/ );
	// A value carrying a declaration break is refused before it reaches the scoper.
	assert.match( run( [ row( { property: 'cursor', value: 'pointer; color: red' } ) ] ).out.unmapped[ 0 ].reason, /^custom-css-refused: the value holds a brace, semicolon/ );
} );

test( 'rows that are not the block\'s to hold stay as they were (negative control)', () => {
	const kept = [
		row( { property: 'display', value: 'block', code: 'held:default' } ),
		row( { property: 'row-gap', value: '10px', reason: 'conflict: gap already holds column-gap 20px' } ),
		row( { property: 'color', value: 'red', state: 'current' } ),
		row( { property: 'motion', value: 'TR-1' } ),
		row( { node: 'nX', property: 'cursor', value: 'pointer' } ),
	];
	const { flat, out } = run( kept );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, undefined );
	assert.deepEqual( out.unmapped, kept );
	assert.deepEqual( out.writes, [] );
} );

test( 'MUST FAIL: every Custom CSS writer shares one writer, so each rule is labelled route-written and the report lists it', () => {
	const node = { attributes: {} };
	const gate = scopedCssPuts( node, { css: '@media (min-width: 1260px) { & { display: none; } }', label: 'Width gate w < 1260', index: 3, why: 'width gate' } );
	assert.equal( gate.find( ( p ) => 'sgsCustomCssNote' === p.attr ).value, `${ ROUTE_LABEL }: Width gate w < 1260` );
	assert.equal( gate.find( ( p ) => 'sgsCustomCssId' === p.attr ).value, 'wgate3' );
	assert.deepEqual( customCssPuts( node, { css: '& { color: expression(1); }', label: 'x', key: 'k', why: 'w' } ).refused, [ 'unsafe value: &' ] );
	const { out } = run( [ row( { property: 'clip-path', value: 'circle(50%)' } ) ] );
	const rules = routeWrittenRules( out.writes );
	assert.deepEqual( rules.map( ( r ) => [ r.node, r.how, r.css ] ), [ [ 'n0', 'custom-css', '& { clip-path: circle(50%); }' ] ] );
	const report = fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: out.writes, unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [], customCssGaps: out.gaps } );
	assert.equal( report.json.counts.customCssRules, 1 );
	assert.match( report.markdown, /## Route-written Custom CSS[\s\S]*\| n0 \| sgs\/container \| custom-css \| & \{ clip-path: circle\(50%\); \} \|/ );
} );

test( 'MUST FAIL: a declaration the box already holds is not written twice, and the author\'s text is kept beside a new rule', () => {
	const authored = '& { clip-path: circle(50%); }';
	const flat = tree();
	flat[ 0 ].attributes.sgsCustomCss = authored;
	const again = customCssWrites( { unmapped: [ row( { property: 'clip-path', value: 'circle(50%)' } ) ], writes: [], nodes: NODES, flat, refOf: ( n ) => n.ref } );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, authored );
	assert.deepEqual( [ again.writes, again.unmapped.length, again.unmapped[ 0 ].appliedCss ], [ [], 1, undefined ] );
	// Look-alike: the same declaration on a different selector is a new rule, appended after the author's text.
	const other = customCssWrites( { unmapped: [ row( { slot: '.sgs-x', property: 'clip-path', value: 'circle(50%)' } ) ], writes: [], nodes: NODES, flat, refOf: ( n ) => n.ref } );
	assert.equal( flat[ 0 ].attributes.sgsCustomCss, `${ authored } & .sgs-x { clip-path: circle(50%); }` );
	assert.equal( other.writes.length, 3 );
} );
