// The state mapping behind FR-47-7: every walker state a committed unmapped-state verdict names is now mapped in
// surfaces.json, and every state conflict recorded in state-map-reasons.json is a real verdict. Reads committed files
// only: no browser, no host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../lib/browser.mjs';

const BUILD = path.join( REPO_ROOT, 'sites', 'eye-care-ward-end', 'build' );
const surfaces = JSON.parse( fs.readFileSync( path.join( BUILD, 'surfaces.json' ), 'utf8' ) );
const reasons = JSON.parse( fs.readFileSync( path.join( import.meta.dirname, '..', 'state-map-reasons.json' ), 'utf8' ) );
const triage = Object.fromEntries( fs.readdirSync( path.join( BUILD, 'qa', 'triage' ) ).filter( ( f ) => f.endsWith( '.json' ) )
	.map( ( f ) => [ f.replace( /\.json$/, '' ), JSON.parse( fs.readFileSync( path.join( BUILD, 'qa', 'triage', f ), 'utf8' ) ) ] ) );

// The walker states one verdict was classed unmapped for: its unmapped-state evidence, or its solve reason.
function unmappedStatesOf( v ) {
	const ev = ( v.evidence || [] ).find( ( e ) => e.check === 'unmapped-state' );
	const fromReason = /^unmapped-state (.+)$/.exec( v.solveReason || '' );
	return [ ...new Set( [ ...( ev ? ev.states : [] ), ...( fromReason ? [ fromReason[ 1 ] ] : [] ) ] ) ];
}

const unmapped = Object.entries( triage ).flatMap( ( [ surface, t ] ) => t.verdicts
	.map( ( v ) => ( { surface, key: v.key, states: unmappedStatesOf( v ) } ) ).filter( ( x ) => x.states.length ) );

test( 'the committed triage still holds unmapped-state verdicts to check (the test is not vacuous)', () => {
	assert.ok( unmapped.length > 300, `found ${ unmapped.length } unmapped-state verdicts` );
	assert.deepEqual( [ ...new Set( unmapped.map( ( u ) => u.surface ) ) ].sort(), [ 'home', 'lens', 'product', 'shop' ] );
} );

function missingStates( map ) {
	const missing = [];
	for ( const u of unmapped ) {
		const states = map[ u.surface ] && map[ u.surface ].states;
		for ( const s of u.states ) {
			if ( ! states || ! Object.hasOwn( states, s ) ) {
				missing.push( `${ u.surface }: ${ s }` );
			}
		}
	}
	return [ ...new Set( missing ) ];
}

test( 'every walker state an unmapped-state verdict names is now mapped in surfaces.json', () => {
	assert.deepEqual( missingStates( surfaces ), [], 'unmapped walker states remain' );
} );

test( 'negative control: with only the rest state mapped (the map before C0.7) the same check finds the gaps', () => {
	const old = Object.fromEntries( Object.entries( surfaces ).map( ( [ k, v ] ) => [ k, { ...v, states: { opening: null } } ] ) );
	assert.ok( missingStates( old ).length > 20, 'the check can fail' );
} );

test( 'every mapped state is a state the walker really has (no phantom states)', () => {
	const phantom = [];
	for ( const [ name, cfg ] of Object.entries( surfaces ) ) {
		if ( ! cfg.walker || ! cfg.states ) {
			continue;
		}
		const file = path.join( BUILD, cfg.walker );
		if ( ! fs.existsSync( file ) ) {
			continue;
		}
		const src = fs.readFileSync( file, 'utf8' );
		for ( const s of Object.keys( cfg.states ) ) {
			if ( ! src.includes( `'${ s }'` ) && ! src.includes( `"${ s }"` ) && ! src.includes( `name: ${ s }` ) ) {
				phantom.push( `${ name }: ${ s }` );
			}
		}
	}
	assert.deepEqual( phantom, [] );
} );

test( 'no unmapped-state verdict is left without a mapped state, so state-map-reasons.json owes no "no state" reason', () => {
	assert.deepEqual( reasons.stateless, [] );
} );

test( 'contact and contact-form walk the two form states that were defined but never walked', () => {
	for ( const s of [ 'contact', 'contact-form' ] ) {
		assert.deepEqual( surfaces[ s ].walkStates, [ 'opening', 'field-focused', 'form-submitted-empty' ] );
		for ( const st of [ 'field-focused', 'form-submitted-empty' ] ) {
			assert.ok( Object.hasOwn( surfaces[ s ].states, st ), `${ s } maps ${ st }` );
		}
	}
} );

test( 'the 7 state conflicts name real verdicts, precisely', () => {
	const entries = reasons.stateConflicts.entries;
	assert.equal( entries.length, 7 );
	for ( const e of entries ) {
		const v = triage[ e.surface ].verdicts.find( ( x ) => x.key === e.key );
		assert.ok( v, `no ${ e.surface } verdict with key ${ e.key }` );
		assert.equal( v.pair, e.pair, `${ e.key } pair` );
		assert.equal( v.property, e.property ?? v.property );
		assert.deepEqual( [ ...unmappedStatesOf( v ) ].sort(), [ ...e.walkerStates ].sort(), `${ e.key } walker states` );
		for ( const m of e.mappedTo ) {
			const [ state, to ] = m.split( '->' );
			const actual = surfaces[ e.surface ].states[ state ];
			assert.equal( to, actual === null ? 'rest' : actual, `${ e.surface } ${ state } maps to ${ to }` );
		}
	}
	assert.equal( new Set( entries.map( ( e ) => e.surface + e.key ) ).size, 7, 'no duplicate entry' );
} );
