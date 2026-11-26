// The applier writes a draft element to a saved block only when it is the element the run that saved the post recorded for it
// (lib/apply-targets.mjs::pairsReport, lib/apply-origin-gate.mjs). The fixture is a real origin file; the stale pairs file is what a
// reclone leaves behind: the same refs, each naming the element the origin gives the ref two places later (the proof's careers surface:
// the pairs file mapped `-11` to the element the origin gives `-13`, so a 720px wrapper's width was written onto a 1240px band).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pairsReport } from '../lib/apply-targets.mjs';
import { staleRecordProblems, targetsOffOrigin } from '../lib/apply-origin-gate.mjs';
import { matchByPosition, positionTargets } from '../lib/apply-position.mjs';
import { refreshPairs } from '../lib/refresh-pairs.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const origin = readJson( path.join( REPO, 'sites', 'indus-foods', 'build', 'careers.origin.json' ) );
const refs = Object.keys( origin );
const shiftedBy = ( n ) => Object.fromEntries( refs.slice( 0, refs.length - n ).map( ( ref, i ) => [ ref, { tpl: origin[ refs[ i + n ] ].tpl, how: 'kept from the previous pairs' } ] ) );
const stale = { generated: 'refresh-pairs.mjs', pairs: shiftedBy( 2 ), unpaired: {} };
const careers11 = 'cr-ref-careers-11';

test( 'the real origin gives the shifted pair a different element (the fixture can fail)', () => {
	assert.notEqual( stale.pairs[ careers11 ].tpl, origin[ careers11 ].tpl );
} );

test( "a stale pairs file never replaces the origin's element for a ref the origin holds, and is listed", () => {
	const report = pairsReport( {}, origin, stale );
	assert.equal( report.pairs.find( ( p ) => p.ref === careers11 ).tpl, origin[ careers11 ].tpl );
	assert.ok( report.pairs.every( ( p ) => origin[ p.ref ]?.tpl === p.tpl ), "every pair is the origin's element" );
	const bad = report.disagree.filter( ( d ) => 'refresh' === d.source );
	assert.ok( bad.length > refs.length / 2, `${ bad.length } shifted refs are listed` );
	assert.deepEqual( bad.find( ( d ) => careers11 === d.ref ), { ref: careers11, source: 'refresh', was: stale.pairs[ careers11 ].tpl, origin: origin[ careers11 ].tpl } );
} );

test( 'a pairs file that agrees with the origin is not stale, and keeps its part and reveal pairs', () => {
	const agreeing = { pairs: { [ careers11 ]: { tpl: origin[ careers11 ].tpl }, 'cr-ref-careers-12': { tpl: origin[ 'cr-ref-careers-12' ].tpl, part: 'text' }, 'cr-ref-careers-13': { tpl: origin[ 'cr-ref-careers-13' ].tpl, reveal: { component: 'Root', keys: [ 'k' ] } } }, unpaired: {} };
	const report = pairsReport( {}, origin, agreeing );
	assert.deepEqual( report.disagree, [] );
	assert.equal( report.pairs.find( ( p ) => 'cr-ref-careers-12' === p.ref ).part, 'text' );
	assert.deepEqual( report.pairs.find( ( p ) => 'cr-ref-careers-13' === p.ref ).reveal, { component: 'Root', keys: [ 'k' ] } );
} );

// RF10 second review: a refreshed part or reveal pair on another element than the origin's used to replace the origin's pair, so the
// block lost its own element, and targetsOffOrigin never compared part or reveal targets.
test( "MUST FAIL: a refreshed part or reveal pair on another element than the origin's never replaces the origin's pair, and is listed", () => {
	const off = { pairs: { 'cr-ref-careers-12': { tpl: 'Root/9#0', part: 'text' }, 'cr-ref-careers-13': { tpl: 'Root/8#0', reveal: { component: 'Root', keys: [ 'k' ] } } }, unpaired: {} };
	const report = pairsReport( {}, origin, off );
	for ( const ref of [ 'cr-ref-careers-12', 'cr-ref-careers-13' ] ) {
		const pair = report.pairs.find( ( p ) => ref === p.ref );
		assert.equal( pair.tpl, origin[ ref ].tpl, ref );
		assert.equal( pair.part, undefined, `${ ref } keeps no part from the other element` );
		assert.equal( pair.reveal, undefined, `${ ref } keeps no reveal from the other element` );
		assert.ok( report.disagree.some( ( d ) => ref === d.ref && 'refresh' === d.source && origin[ ref ].tpl === d.origin ), ref );
	}
} );

test( 'a config pair that names another element than the origin is overridden and listed', () => {
	const cfg = { pairs: [ { live: `.${ careers11 }`, draft: { tpl: origin[ 'cr-ref-careers-13' ].tpl } } ] };
	const report = pairsReport( cfg, origin, null );
	assert.equal( report.pairs.find( ( p ) => p.ref === careers11 ).tpl, origin[ careers11 ].tpl );
	assert.deepEqual( report.disagree.map( ( d ) => d.source ), [ 'pair' ] );
} );

test( "with no pairs file every pair is the origin's and nothing is stale", () => {
	const report = pairsReport( {}, origin, null );
	assert.equal( report.pairs.length, refs.length );
	assert.deepEqual( report.disagree, [] );
} );

test( 'the applier refuses a surface whose records disagree with its origin, naming the file', () => {
	const surface = { name: 'careers', ...pairsReport( {}, origin, stale ) };
	const problems = staleRecordProblems( [ surface, { name: 'home', disagree: [] } ], 'indus-foods' );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^careers: \d+ pairs in careers\.pairs\.json name another draft element than careers\.origin\.json/ );
	assert.match( problems[ 0 ], /git rm sites\/indus-foods\/build\/careers\.pairs\.json/ );
} );

test( 'a planned target off the origin is named, a part or reveal target too; a skeleton target is not compared', () => {
	const planned = [
		{ ref: careers11, tpl: stale.pairs[ careers11 ].tpl, via: 'refresh' },
		{ ref: 'cr-ref-careers-12', tpl: origin[ 'cr-ref-careers-12' ].tpl, via: 'origin' },
		{ ref: 'cr-ref-careers-13', tpl: 'Root/1#0', part: 'icon' },
		{ ref: 'cr-ref-careers-14', tpl: 'Root/2#0', reveal: 'open' },
		{ ref: 'cr-ref-careers-15', tpl: 'Root/3#0', via: 'skeleton' },
	];
	const line = ( ref, tpl ) => `${ ref }: planned for ${ tpl }, the origin records ${ origin[ ref ].tpl }`;
	assert.deepEqual( targetsOffOrigin( { pairs: planned, origin } ), [ line( careers11, stale.pairs[ careers11 ].tpl ), line( 'cr-ref-careers-13', 'Root/1#0' ), line( 'cr-ref-careers-14', 'Root/2#0' ) ] );
	assert.deepEqual( targetsOffOrigin( { pairs: [ { ref: 'cr-ref-careers-13', tpl: origin[ 'cr-ref-careers-13' ].tpl, part: 'icon' } ], origin } ), [], "a part on the origin's element is the origin's" );
} );

test( 'the refusal names the real repo path of each file: the walker config sits in qa/parity and is corrected, never deleted', () => {
	const both = { name: 'careers', disagree: [ { ref: careers11, source: 'refresh', was: 'Root/1#0', origin: 'Root/2#0' }, { ref: 'cr-ref-careers-12', source: 'pair', was: 'Root/3#0', origin: 'Root/4#0' } ] };
	const [ line ] = staleRecordProblems( [ both ], 'indus-foods' );
	assert.match( line, /git rm sites\/indus-foods\/build\/careers\.pairs\.json/ );
	assert.match( line, /correct the pair of cr-ref-careers-12 in sites\/indus-foods\/build\/qa\/parity\/careers\.fill\.mjs/ );
	assert.doesNotMatch( line, /git rm [^ ]*fill\.mjs/ );
	assert.doesNotMatch( line, /build\/careers\.fill\.mjs/, 'the config is not beside the pairs file' );
	const [ configOnly ] = staleRecordProblems( [ { ...both, disagree: [ both.disagree[ 1 ] ] } ], 'indus-foods' );
	assert.doesNotMatch( configOnly, /git rm|refresh-pairs/, 'no advice to delete or regenerate a config' );
} );

test( 'a ref the origin holds is never dropped by the refreshed file: not named, structural or unpaired', () => {
	const held = { 'cr-ref-s-1': { tpl: 'Root/1#0' }, 'cr-ref-s-2': { tpl: 'Root/2#0' }, 'cr-ref-s-3': { tpl: 'Root/3#0' } };
	const cfg = { pairs: [ { live: '.cr-ref-s-9', draft: { tpl: 'Root/9#0' } } ] };
	const refreshed = { pairs: {}, unpaired: { 'cr-ref-s-1': 'no text' }, structural: { 'cr-ref-s-2': 'no element' } };
	const report = pairsReport( cfg, held, refreshed );
	assert.deepEqual( report.pairs.map( ( p ) => [ p.ref, p.tpl ] ).sort(), [ [ 'cr-ref-s-1', 'Root/1#0' ], [ 'cr-ref-s-2', 'Root/2#0' ], [ 'cr-ref-s-3', 'Root/3#0' ] ] );
	assert.deepEqual( report.refused, [] );
	// Negative control: a ref no origin row holds is still dropped by the same file (the config's pair for -9 is on no saved block).
	assert.deepEqual( report.stale, [ 'cr-ref-s-9' ] );
	const unheld = pairsReport( cfg, {}, { pairs: {}, unpaired: { 'cr-ref-s-9': 'no text' } } );
	assert.deepEqual( unheld.pairs, [] );
	assert.equal( unheld.refused.length, 1 );
} );

test( 'a disagreement for a ref no pair is left for does not block the run', () => {
	// Two refs on one origin element with different text are both refused; the config's wrong pair for the first has nothing left to correct.
	const o = { 'cr-ref-s-1': { tpl: 'Root/1#0', fingerprint: { textHash: 'a' } }, 'cr-ref-s-2': { tpl: 'Root/1#0', fingerprint: { textHash: 'b' } } };
	const report = pairsReport( { pairs: [ { live: '.cr-ref-s-1', draft: { tpl: 'Root/9#0' } } ] }, o, null );
	assert.equal( report.pairs.length, 0 );
	assert.equal( report.refused.length, 2 );
	assert.deepEqual( report.disagree, [] );
} );

test( 'position matching never attaches another draft element to a block the origin holds', () => {
	const input = {
		ids: [ 5 ],
		draftFacts: { 'pos~5': { box: { x: 10, y: 10, w: 100, h: 20 }, text: 'Hello' }, anc: { box: { x: 0, y: 0, w: 300, h: 300 } } },
		liveFacts: { a: { box: { x: 0, y: 0, w: 300, h: 300 } }, b: { box: { x: 10, y: 10, w: 100, h: 20 }, text: 'Hello' } },
		pairs: [ { ref: 'a', key: 'anc', tpl: 'Root/1#0' } ],
		saved: { a: { block: 'sgs/container' }, b: { block: 'sgs/text' } },
	};
	assert.deepEqual( matchByPosition( input ).map( ( m ) => [ m.ref, m.tpl ] ), [ [ 'b', 'Root/5#0' ] ], 'the fixture matches without an origin hold' );
	assert.deepEqual( matchByPosition( { ...input, held: new Set( [ 'b' ] ) } ), [] );
} );

test( 'the applier\'s position pass reads the surface\'s origin: a block it holds gets no position target', async () => {
	const box = ( x, y, w, h ) => ( { box: { x, y, w, h } } );
	const readFacts = async ( side ) => ( 'draft' === side
		? { a: box( 0, 0, 300, 300 ), 'pos~5': { ...box( 10, 10, 100, 20 ), text: 'Hello' } }
		: { a: box( 0, 0, 300, 300 ), b: { ...box( 10, 10, 100, 20 ), text: 'Hello' } } );
	const saved = { a: { block: 'sgs/container' }, b: { block: 'sgs/text' } };
	const surface = { pairs: [ { ref: 'a', key: 'a', tpl: 'Root/1#0' } ], origin: {} };
	const recordsIndex = new Map( [ [ 'Root/5', {} ] ] );
	assert.deepEqual( ( await positionTargets( { surface, saved, recordsIndex, readFacts } ) ).map( ( t ) => t.ref ), [ 'b' ], 'the fixture matches with no origin' );
	assert.deepEqual( await positionTargets( { surface: { ...surface, origin: { b: { tpl: 'Root/7#0' } } }, saved, recordsIndex, readFacts } ), [] );
} );

test( 'a refreshed pairs file keeps the origin\'s element for every ref the origin holds, so it never disagrees with it', () => {
	const el = ( n, tag, words ) => ( { key: `Root/${ n }#0`, parentKey: 'Root/0#0', depth: 1, tag, words } );
	const elements = [ el( 1, 'h2', 'Same words' ), el( 2, 'h2', 'Same words' ), el( 3, 'p', 'Other' ) ];
	const blocks = [ { ref: 'cr-ref-s-1', block: 'sgs/heading', attrs: { content: 'Same words' } }, { ref: 'cr-ref-s-2', block: 'sgs/heading', attrs: { content: 'Same words' } } ];
	// By text and order alone the first block takes Root/1; the run that saved the post drew the first block from Root/2.
	const origin = { 'cr-ref-s-1': { tpl: 'Root/2#0' }, 'cr-ref-s-2': { tpl: 'Root/1#0' } };
	assert.equal( refreshPairs( { blocks, elements } ).pairs[ 'cr-ref-s-1' ].tpl, 'Root/1#0', 'the fixture can disagree' );
	const { pairs, unpaired, structural } = refreshPairs( { blocks, elements, origin } );
	assert.deepEqual( Object.fromEntries( Object.entries( pairs ).map( ( [ r, p ] ) => [ r, p.tpl ] ) ), { 'cr-ref-s-1': 'Root/2#0', 'cr-ref-s-2': 'Root/1#0' } );
	const report = pairsReport( {}, origin, { pairs, unpaired, structural } );
	assert.deepEqual( report.disagree, [] );
} );

test( 'no committed pairs file disagrees with its origin file (delete it, or regenerate with refresh-pairs.mjs --write)', () => {
	const bad = [];
	for ( const client of fs.readdirSync( path.join( REPO, 'sites' ) ) ) {
		const build = path.join( REPO, 'sites', client, 'build' );
		if ( ! fs.existsSync( build ) ) {
			continue;
		}
		for ( const f of fs.readdirSync( build ).filter( ( x ) => x.endsWith( '.pairs.json' ) ) ) {
			const name = f.replace( /\.pairs\.json$/, '' );
			const originFile = path.join( build, `${ name }.origin.json` );
			const report = pairsReport( {}, fs.existsSync( originFile ) ? readJson( originFile ) : {}, readJson( path.join( build, f ) ) );
			report.disagree.length && bad.push( `${ client }/${ f }: ${ report.disagree.length } pairs differ from the origin` );
		}
	}
	assert.deepEqual( bad, [] );
} );
