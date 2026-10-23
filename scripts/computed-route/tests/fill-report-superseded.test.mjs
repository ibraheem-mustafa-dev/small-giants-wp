// fill-report.json never counts a write a later write replaced on the same node, setting and tier as written
// (lib/fill-report.mjs::supersededWrites): it stays in `writes` marked `supersededBy`. Planted on the shape of a real run, a
// nav item's minimum height written `auto` from min-height and then 42px from height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillReport, supersededWrites } from '../lib/fill-report.mjs';

const w = ( prop, attr, before, after, node = 'n1' ) => ( { node, block: 'sgs/nav-bar-menu', slot: '', prop, attr, before, after, widths: [ 1440 ], how: 'tiers' } );
const report = ( writes ) => fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes, unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [] } );

test( 'MUST FAIL: a tier a later write replaces is marked superseded and left out of the written count', () => {
	const writes = [
		w( 'min-height', 'itemMinHeight', null, { desktop: 'auto' } ),
		w( 'height', 'itemMinHeight', { desktop: 'auto' }, { desktop: '42px' } ),
		w( 'display', 'iconSource', 'brand', 'emoji' ),
		w( '(content)', 'iconSource', 'emoji', 'custom' ),
	];
	const r = report( writes );
	assert.equal( r.json.counts.writes, 2 );
	assert.equal( r.json.counts.superseded, 2 );
	assert.deepEqual( r.json.writes.map( ( x ) => x.supersededBy ), [ 1, undefined, 3, undefined ] );
	assert.match( r.markdown, /\| Settings written \| 2 \(and 2 a later write/ );
	assert.match( r.markdown, /tiers \(superseded by write 1\) \|/ );
} );

test( 'a later write to another tier, side or node, or one that extends the text, replaces nothing (negative control)', () => {
	const writes = [
		w( 'padding-right', 'padding', null, { mobile: { right: '20px' }, desktop: { right: '40px' } } ),
		w( 'padding-left', 'padding', { mobile: { right: '20px' }, desktop: { right: '40px' } }, { mobile: { right: '20px', left: '20px' }, desktop: { right: '40px', left: '40px' } } ),
		w( 'min-height', 'itemMinHeight', null, { desktop: 'auto' } ),
		w( 'height', 'itemMinHeight', { desktop: 'auto' }, { desktop: 'auto', mobile: '42px' } ),
		w( 'height', 'itemMinHeight', null, { desktop: '42px' }, 'n2' ),
		w( 'grid-template-columns', 'columns', null, { mobile: 1 } ),
		w( 'grid-template-columns', 'columns', { mobile: 1 }, { mobile: 1, desktop: 3 } ),
		w( 'gate', 'sgsCustomCss', null, '@media (max-width: 767px) { & { display: none; } }' ),
		w( 'ladder', 'sgsCustomCss', '@media (max-width: 767px) { & { display: none; } }', '@media (max-width: 767px) { & { display: none; } } @media (min-width: 768px) { & { gap: 4px; } }' ),
	];
	assert.deepEqual( [ ...supersededWrites( writes ).keys() ], [] );
	assert.equal( report( writes ).json.counts.writes, writes.length );
} );

test( 'a write whose every changed tier is replaced, across two later writes, is superseded', () => {
	const writes = [
		w( 'padding-top', 'padding', null, { mobile: { top: '6px' }, desktop: { top: '8px' } } ),
		w( 'padding-top', 'padding', { mobile: { top: '6px' }, desktop: { top: '8px' } }, { mobile: { top: '4px' }, desktop: { top: '8px' } } ),
		w( 'padding-top', 'padding', { mobile: { top: '4px' }, desktop: { top: '8px' } }, { mobile: { top: '4px' }, desktop: { top: '2px' } } ),
	];
	assert.deepEqual( [ ...supersededWrites( writes ) ], [ [ 0, 2 ] ] );
} );
