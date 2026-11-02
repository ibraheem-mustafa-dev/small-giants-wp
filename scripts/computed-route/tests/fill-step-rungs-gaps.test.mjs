// A step ladder's scoped @media rule is a custom-CSS write, so it carries a gaps row naming the native control it could
// become (Spec 48 FR-48-86; lib/fill-step-rungs.mjs::stepRungWrites `gaps`), one per rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRungWrites } from '../lib/fill-step-rungs.mjs';
import { fillReport } from '../lib/fill-report.mjs';

const LINK = '.bar > .item > .link';
const sweep = ( value ) => Array.from( { length: 101 }, ( _, i ) => 320 + i * 16 ).map( ( width ) => ( { width, value: value( width ) } ) );

const run = ( series, props = [ 'padding-left' ] ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', ref: 'n0', attributes: {} } ];
	const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', children: [], targets: [ { id: '0:', slot: '' }, { id: '0:link', slot: LINK } ] } ];
	const one = { styles: Object.fromEntries( props.map( ( p ) => [ p, '15px' ] ) ), rect: { w: 1, h: 1 } };
	const reads = { sweep: { '0:link': Object.fromEntries( props.map( ( p ) => [ p, series ] ) ) }, widths: { 375: { '0:link': { missing: true } }, 768: { '0:link': { missing: true } }, 1440: { '0:link': one } } };
	const writes = props.map( ( prop ) => ( { node: 'n0', slot: LINK, prop, attr: 'itemPadding', how: 'tiers' } ) );
	return stepRungWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, writes, scope: 'header', entries: [], date: '2026-10-23' } );
};

test( 'MUST FAIL: each scoped @media rule a step ladder writes returns one gaps row naming the setting and the step it needs', () => {
	const out = run( sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1200 ? '10px' : '15px' ) ) ), [ 'padding-left', 'padding-right' ] );
	assert.equal( out.gaps.length, 1, 'one rule (two declarations in one range) is one row' );
	const [ g ] = out.gaps;
	assert.deepEqual( [ g.node, g.block, g.slot, g.properties, g.range ], [ 'n0', 'sgs/nav-bar-menu', LINK, [ 'padding-left', 'padding-right' ], [ 1024, 1200 ] ] );
	assert.equal( g.control, 'itemPadding with a step at 1200px' );
	assert.match( g.reason, /^custom-css: padding-left, padding-right 1024-1199px is a scoped @media rule in Additional CSS because itemPadding holds one value per device tier; native once that setting takes a step at 1200px$/ );
	assert.equal( g.css, '@media (min-width: 1024px) and (max-width: 1199px) { & .bar > .item > .link { padding-left: 10px; padding-right: 10px; } }' );
} );

test( 'two rules are two rows; no rule is no row (negative control)', () => {
	const two = run( sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1200 ? '10px' : ( w < 1600 ? '15px' : '20px' ) ) ) ) );
	assert.equal( two.gaps.length, two.writes.length ? 2 : 0 );
	assert.equal( two.gaps.length, 2 );
	assert.deepEqual( run( sweep( ( w ) => ( w < 1024 ? undefined : '15px' ) ) ).gaps, [] );
} );

test( 'MUST FAIL: the run report carries the custom-CSS gaps rows', () => {
	const gaps = run( sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1200 ? '10px' : '15px' ) ) ) ).gaps;
	const r = fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [], customCssGaps: gaps } );
	assert.deepEqual( r.json.customCssGaps, gaps );
	assert.equal( r.json.counts.customCssGaps, 1 );
} );
