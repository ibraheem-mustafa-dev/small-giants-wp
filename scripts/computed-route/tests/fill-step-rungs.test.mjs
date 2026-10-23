// A step between the read widths that a written per-device setting cannot hold becomes a scoped @media rule
// (lib/fill-step-rungs.mjs). Real case: the Indus header's nav item padding is `navPad = w < 1200 ? 10px : 15px`; Fill wrote
// `itemPadding {desktop: 15px}` from the 1440 read, so 1024 to 1199 painted 15px against the draft's 10px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRungWrites, stepStretches } from '../lib/fill-step-rungs.mjs';

const LINK = '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link';
const sweep = ( value ) => Array.from( { length: 101 }, ( _, i ) => 320 + i * 16 ).map( ( width ) => ( { width, value: value( width ) } ) );
const navPad = sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1200 ? '10px' : '15px' ) ) );

const run = ( series, { how = 'tiers', styles = { 1440: '15px' }, prop = 'padding-left', attributes = {} } = {} ) => {
	const flat = [ { name: 'sgs/nav-bar-menu', ref: 'n0', attributes } ];
	const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', children: [], targets: [ { id: '0:', slot: '' }, { id: '0:link', slot: LINK } ] } ];
	const reads = { sweep: { '0:link': { [ prop ]: series } }, widths: { 375: { '0:link': { missing: true } }, 768: { '0:link': { missing: true } }, 1440: { '0:link': { styles: { [ prop ]: styles[ 1440 ] }, rect: { w: 1, h: 1 } } } } };
	return { flat, ...stepRungWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, writes: [ { node: 'n0', slot: LINK, prop, how } ], scope: 'header', entries: [], date: '2026-10-23' } ) };
};

test( 'MUST FAIL: a draft step the desktop tier read cannot hold is a scoped @media rule over the stretch the tier read does not represent', () => {
	const { flat, writes } = run( navPad );
	const css = flat[ 0 ].attributes.sgsCustomCss;
	assert.equal( css, `@media (min-width: 1024px) and (max-width: 1199px) { & ${ LINK } { padding-left: 10px; } }` );
	assert.ok( writes.some( ( w ) => 'sgsCustomCssNote' === w.attr && /Step ladder/.test( w.after ) ) );
} );

test( 'MUST FAIL: a threshold within 5% of a tier snaps to it with a breakpoint-snap ledger entry, and a stretch the snap absorbs writes no rule', () => {
	const near = run( sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1040 ? '10px' : '15px' ) ) ) );
	assert.equal( near.flat[ 0 ].attributes.sgsCustomCss, undefined, 'the 1024 to 1039 stretch is absorbed by the 1024 tier' );
	assert.equal( near.ledger.length, 1 );
	assert.deepEqual( [ near.ledger[ 0 ].property, near.ledger[ 0 ].snap.tier, near.ledger[ 0 ].snap.draft ], [ 'breakpoint', 1024, 1040 ] );
	const wide = run( sweep( ( w ) => ( w < 1024 ? undefined : ( w < 1120 ? '10px' : '15px' ) ) ) );
	assert.equal( wide.flat[ 0 ].attributes.sgsCustomCss, `@media (min-width: 1024px) and (max-width: 1119px) { & ${ LINK } { padding-left: 10px; } }` );
} );

test( 'a step the tier read already holds, a fluid ramp, and a value that never differs write nothing', () => {
	assert.equal( run( sweep( ( w ) => ( w < 1024 ? undefined : '15px' ) ) ).writes.length, 0, 'no step' );
	assert.equal( run( sweep( ( w ) => ( w < 1024 ? undefined : `${ 10 + ( w - 1024 ) / 16 }px` ) ), { styles: { 1440: '36px' } } ).writes.length, 0, 'a ramp is not a step' );
	assert.equal( run( navPad, { styles: { 1440: '10px' } } ).flat[ 0 ].attributes.sgsCustomCss, `@media (min-width: 1200px) { & ${ LINK } { padding-left: 15px; } }`, 'the stretch is where the tier read differs, either way round' );
} );

test( 'a write that is not a tier value (a clamp, a motion layer, a state) is not judged against the tier reads', () => {
	assert.equal( run( navPad, { how: 'clamp' } ).writes.length, 0 );
	assert.equal( run( navPad, { how: 'motion' } ).writes.length, 0 );
} );

test( 'stepStretches is one stretch per run of one value that no tier read stands for, across tier edges', () => {
	const series = sweep( ( w ) => ( w < 700 ? '8px' : ( w < 1200 ? '10px' : '15px' ) ) );
	const stretches = stepStretches( 'padding-left', series, ( t ) => ( { mobile: '8px', tablet: '8px', desktop: '15px' } )[ t ] );
	assert.deepEqual( stretches.map( ( s ) => [ s.range, s.value ] ), [ [ [ 704, 1200 ], '10px' ] ] );
} );
