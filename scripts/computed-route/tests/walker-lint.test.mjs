// lib/walker-lint.mjs: the walker config lint as a route gate. lintWalker (one config: every fault the walker's lint finds,
// a missing, unloadable or object-less config), walkerLintFault (the refusal naming the surface) and lintClient (every
// surface of a client's surfaces.json that names a walker config).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lintClient, lintWalker, walkerLintFault } from '../lib/walker-lint.mjs';

const TMP = fs.mkdtempSync( path.join( os.tmpdir(), 'walker-lint-' ) );
process.on( 'exit', () => fs.rmSync( TMP, { recursive: true, force: true } ) );
let n = 0;
// A config file holding `source` as its default export; returns its path. `dir` places it beside a sibling pairs folder.
const write = ( source, dir = TMP ) => {
	fs.mkdirSync( dir, { recursive: true } );
	const f = path.join( dir, `cfg-${ ++n }.mjs` );
	fs.writeFileSync( f, `export default ${ source };\n` );
	return f;
};
const cfgFile = ( cfg, dir ) => write( JSON.stringify( cfg ), dir );
const BASE = { name: 'planted', refPrefix: 'p', states: [ { name: 'rest' }, { name: 'open' } ], pairs: [ { name: 'a', draft: '.x', live: '.x' }, { name: 'b', draft: '.y', live: '.y', states: [ 'open' ] } ] };
const only = async ( cfg, states = null ) => lintWalker( cfgFile( cfg ), states );

test( 'MUST FAIL: a clean config has no problems', async () => {
	assert.deepEqual( await only( BASE ), [] );
	assert.deepEqual( await only( { ...BASE, accept: [ { pair: 'a', reason: 'the draft rounds this by design' } ], review: { 'rest@375': 'Header logo, menu button and the hero heading all line up with the draft.' }, links: { Home: '/', Call: 'tel:0123' } } ), [] );
} );

test( 'MUST FAIL: each lint fault is found and named', async () => {
	assert.deepEqual( await only( { ...BASE, pairs: [ ...BASE.pairs, { name: 'a', draft: '.z', live: '.z' } ] } ), [ 'pair "a" is named twice' ] );
	assert.deepEqual( await only( { ...BASE, pairs: [ BASE.pairs[ 0 ], { ...BASE.pairs[ 1 ], states: [ 'open', 'ghost' ] } ] } ), [ 'pair "b" names unknown state "ghost"' ] );
	assert.deepEqual( await only( { ...BASE, pairs: [ BASE.pairs[ 0 ] ] } ), [ 'state "open" has no pair scoped to it (add one for the thing the state changes)' ] );
	assert.deepEqual( await only( BASE, [ 'nope' ] ), [ '--states names unknown state "nope"' ] );
	assert.deepEqual( await only( { ...BASE, accept: [ { pair: 'a', reason: 'short' } ] } ), [ 'accept #0 has no real reason' ] );
	assert.deepEqual( await only( { ...BASE, accept: [ { pair: 'zz', reason: 'a long enough reason' } ] } ), [ 'accept #0 names unknown pair "zz"' ] );
	assert.deepEqual( await only( { ...BASE, accept: [ { pair: '(state)', reason: 'a long enough reason' } ] } ), [], 'the built-in pair names are known' );
	assert.deepEqual( await only( { ...BASE, review: { rest: 'x'.repeat( 50 ) } } ), [ 'review key "rest" is not state@width' ] );
	assert.deepEqual( await only( { ...BASE, review: { 'rest@375': 'looks fine' } } ), [ 'review note for rest@375 is too short to say what was checked' ] );
	assert.deepEqual( await only( { ...BASE, links: { Home: 'home', Call: [ '/ok', 'nope' ] } } ), [ 'links "Home" needs a path, URL, tel: or mailto: destination', 'links "Call" needs a path, URL, tel: or mailto: destination' ] );
} );

test( 'MUST FAIL: a normalise rule needs a from regex, a to string and a real reason', async () => {
	const withRule = async ( rule ) => lintWalker( write( `{ ...${ JSON.stringify( BASE ) }, auto: { normalise: [ ${ rule } ] } }` ) );
	assert.deepEqual( await withRule( "{ from: /a/g, to: 'b', reason: 'a long enough reason' }" ), [] );
	for ( const bad of [ "{ from: 'a', to: 'b', reason: 'a long enough reason' }", "{ from: /a/, to: 1, reason: 'a long enough reason' }", "{ from: /a/, to: 'b', reason: 'short' }", "{ from: /a/, to: 'b' }" ] ) {
		assert.deepEqual( await withRule( bad ), [ 'auto.normalise #0 needs a from regex, a to string and a real reason' ], bad );
	}
} );

test( 'MUST FAIL: states narrow what the lint asks, and auto-scrolled is allowed unless the config opts out', async () => {
	const unscoped = { ...BASE, pairs: [ BASE.pairs[ 0 ] ] };
	assert.equal( ( await only( unscoped ) ).length, 1 );
	assert.deepEqual( await only( unscoped, [ 'rest' ] ), [] );
	assert.equal( ( await only( unscoped, [] ) ).length, 1, 'an empty --states walks every state' );
	assert.deepEqual( await only( BASE, [ 'rest', 'auto-scrolled' ] ), [], 'auto-scrolled is added after the lint' );
	assert.deepEqual( await only( { ...BASE, autoScroll: false }, [ 'auto-scrolled' ] ), [ '--states names unknown state "auto-scrolled"' ] );
} );

test( 'MUST FAIL: a hand pair that pairs two different parts of the page is a problem', async () => {
	const root = fs.mkdtempSync( path.join( TMP, 'scope-' ) );
	fs.mkdirSync( path.join( root, 'pairs' ) );
	const cfg = cfgFile( { ...BASE, pairing: '../pairs/p.json' }, path.join( root, 'walkers' ) );
	fs.writeFileSync( path.join( root, 'pairs', 'p.json' ), JSON.stringify( { handScope: [ { name: 'a', ok: false, why: 'the draft holds "Menu" and the live element holds "Shop"' }, { name: 'b', ok: true }, { name: 'gone', ok: false, why: 'not a pair of this config' } ] } ) );
	assert.deepEqual( await lintWalker( cfg ), [ 'pair "a" pairs two different parts of the page: the draft holds "Menu" and the live element holds "Shop" (point both finders at the same element)' ] );
} );

test( 'MUST FAIL: nothing fails open: a missing, unloadable or object-less config is a problem', async () => {
	const absent = path.join( TMP, 'absent.mjs' );
	assert.deepEqual( await lintWalker( absent ), [ `the walker config ${ absent } does not exist` ] );
	const broken = write( '{;' );
	assert.match( ( await lintWalker( broken ) )[ 0 ], /^the walker config .*cfg-\d+\.mjs does not load: /s );
	for ( const src of [ 'null', '7', "'text'" ] ) {
		const f = write( src );
		assert.deepEqual( await lintWalker( f ), [ `the walker config ${ f } exports no config object` ], src );
	}
	const noDefault = path.join( TMP, `nodefault-${ ++n }.mjs` );
	fs.writeFileSync( noDefault, 'export const x = 1;\n' );
	assert.deepEqual( await lintWalker( noDefault ), [ `the walker config ${ noDefault } exports no config object` ] );
} );

test( 'MUST FAIL: walkerLintFault is null for a clean config, else names the surface, the file and every problem', async () => {
	assert.equal( await walkerLintFault( 'home', cfgFile( BASE ) ), null );
	const f = cfgFile( { ...BASE, pairs: [ ...BASE.pairs, { name: 'a', draft: '.z', live: '.z' } ], accept: [ { reason: 'no' } ] } );
	assert.equal( await walkerLintFault( 'mega-x', f ), `surface "mega-x": walker config ${ path.basename( f ) } failed its lint, so nothing is built or walked:\n- pair "a" is named twice\n- accept #0 has no real reason` );
	assert.match( await walkerLintFault( 's', path.join( TMP, 'absent.mjs' ) ), /does not exist/, 'a missing config stops the run' );
	assert.notEqual( await walkerLintFault( 's', cfgFile( { ...BASE, pairs: [ BASE.pairs[ 0 ] ] } ) ), null );
	assert.equal( await walkerLintFault( 's', cfgFile( { ...BASE, pairs: [ BASE.pairs[ 0 ] ] } ), [ 'rest' ] ), null, 'states are passed through' );
} );

test( 'MUST FAIL: lintClient lints every surface that names a walker config, preferring walkerFull and passing walkStates', async () => {
	const build = fs.mkdtempSync( path.join( TMP, 'build-' ) );
	const unscoped = { ...BASE, pairs: [ BASE.pairs[ 0 ] ] };
	const rel = ( cfg ) => path.basename( cfgFile( cfg, build ) );
	const [ clean, bad, full ] = [ rel( BASE ), rel( unscoped ), rel( BASE ) ];
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( {
		header: { walker: clean },
		footer: { walker: clean, walkerFull: bad },
		narrow: { walker: bad, walkStates: [ 'rest' ] },
		generated: { walkerFull: full },
		bare: { tree: 't.json' },
		list: [ 1 ],
		nothing: null,
	} ) );
	const out = await lintClient( build );
	assert.deepEqual( out.map( ( o ) => o.surface ), [ 'header', 'footer', 'narrow', 'generated' ] );
	assert.deepEqual( out.map( ( o ) => o.problems.length ), [ 0, 1, 0, 0 ] );
	assert.equal( out[ 1 ].walker, path.join( build, bad ), 'walkerFull wins over walker' );
	assert.equal( out[ 2 ].walker, path.join( build, bad ) );
	assert.deepEqual( out[ 1 ].problems, [ 'state "open" has no pair scoped to it (add one for the thing the state changes)' ] );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { gone: { walker: 'nope.mjs' } } ) );
	assert.match( ( await lintClient( build ) )[ 0 ].problems[ 0 ], /does not exist/ );
	fs.rmSync( path.join( build, 'surfaces.json' ) );
	await assert.rejects( lintClient( build ), /surfaces\.json/, 'a client with no surfaces.json is an error, not an empty pass' );
} );
