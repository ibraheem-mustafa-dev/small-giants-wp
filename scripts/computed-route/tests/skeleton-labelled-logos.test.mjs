// A looping strip of logo tiles that each name themselves by an aria-label is the brand strip showing each name where its picture is
// not set yet (data/skeleton-decisions.json `rules.marquee.labelledLogos`: brandDisplay logo-else-text). The Indus homepage's "Our
// Brands" strip is ten white tiles, each an empty picture placeholder with its brand's name; the clone drew the strip in its default
// logos-only display, which skips every item with no picture, so the visitor saw an empty blue band under the heading (2026-11-19).
// Pure functions and a temporary folder only: no command, no site. Mutation list: tests/skeleton-labelled-logos.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { facts, N, run, row, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return { brands: [] }; } }';
const strip = ( label ) => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'a', { loop: { list: 'brands', as: 'l', copies: 4 }, attrs: { href: '#/brands', ...( label ? { 'aria-label': label } : {} ) }, box: [ 150, 150 ] }, [ N( 'img', { attrs: { src: 'brand.png' } } ) ] ) ] ) ] );
const tile = ( label ) => N( 'a', { attrs: { href: '#/brands', ...( label ? { 'aria-label': label } : {} ) }, box: [ 150, 150 ] }, [ N( 'img', { attrs: { src: 'brand.png' } } ) ] );
const mixed = ( ...labels ) => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, labels.map( tile ) ) ] );
const MOTION = new Set( [ 'Root/2' ] );
const stripNode = ( r ) => find( r.skeleton, ( x ) => 'sgs/brand-strip' === x.name )[ 0 ];

test( 'MUST FAIL: a looping strip of logo tiles that each carry an aria-label shows each name where no picture is set', () => {
	const r = run( strip( 'Sanam' ), LOGIC, { motion: MOTION } );
	assert.deepEqual( [ row( r, 'Root/2#0' ).block, row( r, 'Root/2#0' ).rule ], [ 'sgs/brand-strip', 'marquee' ] );
	assert.deepEqual( stripNode( r ).attributes, { brandDisplay: 'logo-else-text' } );
	assert.ok( stripNode( r ).handover.some( ( h ) => /add each logo image/.test( h.detail ) ), 'the pictures are still the client\'s to add' );
} );

test( 'negative control: tiles with no label, the rule removed, and a strip that is not a marquee keep the default display', () => {
	assert.deepEqual( stripNode( run( strip( '' ), LOGIC, { motion: MOTION } ) ).attributes, {}, 'no aria-label: no name to show' );
	assert.deepEqual( stripNode( run( strip( 'Sanam' ), LOGIC, { motion: MOTION, off: [ 'marquee.labelledLogos' ] } ) ).attributes, {}, 'MUST FAIL without the entry' );
	assert.deepEqual( stripNode( run( mixed( 'Sanam', 'Shan', '' ), LOGIC, { motion: MOTION } ) ).attributes, {}, 'one tile with no name: the strip is not shown by name' );
	assert.deepEqual( stripNode( run( mixed( 'Sanam', 'Shan', 'Green Leaf' ), LOGIC, { motion: MOTION } ) ).attributes, { brandDisplay: 'logo-else-text' } );
	assert.deepEqual( stripNode( run( mixed( 'Sanam' ), LOGIC, { motion: MOTION } ) )?.attributes ?? {}, {}, 'a single tile is no strip of names' );
	assert.equal( find( run( strip( 'Sanam' ), LOGIC ).skeleton, ( x ) => 'sgs/brand-strip' === x.name ).length, 0, 'no motion record, no strip' );
} );

test( 'MUST FAIL: the rule names settings of the logo block at values they have', () => {
	const bad = ( attributes ) => {
		const f = facts( REPO );
		f.decisions.rules.marquee.labelledLogos = { attributes };
		return decisionsProblems( f ).filter( ( p ) => /labelledLogos/.test( p ) );
	};
	assert.deepEqual( bad( { brandDisplay: 'logo-else-text' } ), [] );
	assert.equal( bad( { brandDisplay: 'both' } ).length, 1 );
	assert.equal( bad( { noSuchSetting: 'x' } ).length, 1 );
} );
