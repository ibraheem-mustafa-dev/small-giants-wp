// Width variants (lib/fill-width-gate.mjs::shownOfNode, Spec 48 FR-48-50): the skeleton writes one instance per variation of
// content no single setting holds (`widthShown` on the variant, `widthVariants` on the default instance); each instance is
// hidden on the other's widths, through the visibility flags when the boundaries are tiers, else a scoped @media rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthGateWrites, maskHiddenVariants } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const gate = ( key, width, via ) => [ key, { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via } } ];
const leaf = ( key, scIf ) => [ key, { template: { tag: 'div', membership: { scIf: scIf.map( ( k ) => ( { key: k, value: '{{ x }}' } ) ) } }, logic: { holes: {} } } ];
const factsOf = ( ...pairs ) => ( { elements: Object.fromEntries( pairs ) } );

const run = ( specs, facts = null ) => {
	const flat = specs.map( ( s, i ) => ( { name: 'sgs/button', attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = specs.map( ( s, index ) => ( { index, name: 'sgs/button', parent: null, node: { draftRef: { tpl: `Page/${ s.n }#0` }, ...s.extra }, children: [], targets: [] } ) );
	return { flat, ...widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'header', entries: [], rootComponent: 'Page', date: '2026-10-23' } ) };
};
const flags = ( r ) => r.flat.map( ( n ) => Object.keys( n.attributes ).sort() );

test( 'MUST FAIL WITHOUT THE VARIANT GATE: a 375-only variant and its default are each hidden on the other tiers (no fact record needed)', () => {
	const r = run( [ { n: 14, extra: { widthVariants: [ { key: 'Page/18#0', shown: [ 375 ] } ] } }, { n: 18, extra: { widthShown: [ 375 ] } } ] );
	assert.deepEqual( flags( r ), [ [ 'sgsHideOnMobile' ], [ 'sgsHideOnDesktop', 'sgsHideOnTablet' ] ] );
	assert.deepEqual( r.ledger, [] );
	assert.ok( r.writes.every( ( w ) => 'width-gate' === w.how ) );
} );

test( 'MUST FAIL WITHOUT THREE VARIANTS: three instances are each hidden on the other two tiers', () => {
	const v = [ { key: 'Page/18#0', shown: [ 375 ] }, { key: 'Page/19#0', shown: [ 768 ] } ];
	const r = run( [ { n: 14, extra: { widthVariants: v } }, { n: 18, extra: { widthShown: [ 375 ] } }, { n: 19, extra: { widthShown: [ 768 ] } } ] );
	assert.deepEqual( flags( r ), [ [ 'sgsHideOnMobile', 'sgsHideOnTablet' ], [ 'sgsHideOnDesktop', 'sgsHideOnTablet' ], [ 'sgsHideOnDesktop', 'sgsHideOnMobile' ] ] );
} );

test( 'MUST FAIL WITHOUT THE OFF-TIER VARIANT: a variant the fact record gates at 1260 gets a scoped @media rule, its default the complement', () => {
	const facts = factsOf( gate( 'Page/53', { w: '>=', n: 1260 }, 'w >= 1260' ), leaf( 'Page/18', [ 'Page/53' ] ) );
	const r = run( [ { n: 14, extra: { widthVariants: [ { key: 'Page/18#0', shown: [ 1440 ] } ] } }, { n: 18, extra: { widthShown: [ 1440 ] } } ], facts );
	assert.equal( r.flat[ 1 ].attributes.sgsCustomCss, '@media (max-width: 1259px) { & { display: none; } }' );
	assert.equal( r.flat[ 0 ].attributes.sgsCustomCss, '@media (min-width: 1260px) { & { display: none; } }' );
	assert.match( r.flat[ 0 ].attributes.sgsCustomCssNote, /Width gate a width variant/ );
} );

test( 'MUST FAIL WITHOUT THE VARIANT KEY: a words-only variant measured on the element of its default is gated by its own words element', () => {
	const facts = factsOf( gate( 'Page/53', { w: '>=', n: 1260 }, 'w >= 1260' ), leaf( 'Page/18', [ 'Page/53' ] ), leaf( 'Page/14', [] ) );
	const r = run( [ { n: 14, extra: { widthVariants: [ { key: 'Page/18#0', shown: [ 1440 ] } ] } }, { n: 14, extra: { widthShown: [ 1440 ], variantKey: 'Page/18#0' } } ], facts );
	assert.equal( r.flat[ 1 ].attributes.sgsCustomCss, '@media (max-width: 1259px) { & { display: none; } }', 'the 1260 gate of the words element, not of the shared element' );
} );

test( 'a node with no variant fields and no fact record is untouched', () => {
	assert.equal( run( [ { n: 14, extra: {} } ] ).writes.length, 0 );
} );

test( 'MUST FAIL WITHOUT THE READ MASK: two instances measured on one element are each read only where they are shown', () => {
	const box = { rect: { x: 0, y: 0, w: 143, h: 34 }, inFlow: true, styles: {} };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { ...box }, '1:': { ...box }, '2:': { ...box } } ] ) ) };
	const nodes = [
		{ index: 0, node: { draftRef: { tpl: 'Page/14#0' }, widthVariants: [ { key: 'Page/18#0', shown: [ 375 ] } ] }, targets: [ { id: '0:' } ] },
		{ index: 1, node: { draftRef: { tpl: 'Page/14#0' }, widthShown: [ 375 ], variantKey: 'Page/18#0' }, targets: [ { id: '1:' } ] },
		{ index: 2, node: { draftRef: { tpl: 'Page/20#0' } }, targets: [ { id: '2:' } ] },
	];
	maskHiddenVariants( reads, nodes, null, 'Page' );
	assert.deepEqual( reads.widths[ 375 ][ '0:' ], { missing: true }, 'the number pill is not drawn on phones' );
	assert.equal( reads.widths[ 375 ][ '1:' ].rect.w, 143, 'the Call pill is' );
	assert.deepEqual( [ 768, 1440 ].map( ( w ) => reads.widths[ w ][ '1:' ] ), [ { missing: true }, { missing: true } ], 'the Call pill is not drawn from 768' );
	assert.equal( reads.widths[ 1440 ][ '0:' ].rect.w, 143 );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => reads.widths[ w ][ '2:' ].rect.w ), [ 143, 143, 143 ], 'a node with no variant is untouched' );
} );
