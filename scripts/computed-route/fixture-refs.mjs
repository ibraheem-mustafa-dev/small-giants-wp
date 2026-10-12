#!/usr/bin/env node
// The detector for site references in calibration-fixtures.json (Spec 48 §3.2, lib/fixture-refs.mjs).
//   node scripts/computed-route/fixture-refs.mjs --survey [--json]   every reference-shaped value and its category
//   node scripts/computed-route/fixture-refs.mjs --fix [--apply]     the bare references as tokens (a diff; --apply writes)
//   node scripts/computed-route/fixture-refs.mjs --check             exit 1 while a bare reference or unexplained hit remains
//   node scripts/computed-route/fixture-refs.mjs --self-test         the detector's own cases, on fixtures in memory
// --fix maps a literal id to the role holding that id in the home target's refs (--home, default eye-care-test: the
// site the literal ids were written for). lint.mjs runs the same check.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { survey, tally, transform, checkFixtureRefs, unexplainedWide, NOT_REFS, WIDE_OK } from './lib/fixture-refs.mjs';
import { refsFor, resolveFixture } from './lib/calibration-refs.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURES = path.join( HERE, 'calibration-fixtures.json' );
const TARGETS = path.join( HERE, 'calibration-targets.json' );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );

// The cases the detector must get right, each on its own fixtures. Returns the failures (empty when all pass).
export function selfTest() {
	const home = { menu: 96, menuItem: 195, drawer: 203, image: { id: 202, url: 'https://home.test/a.jpg' }, logo: 198, product: 71 };
	const fx = {
		'sgs/nav': { attributes: { ref: 96, drawerRef: 203, splitAfterItemId: 'id:195', icons: { 'id:195': { name: 'x' } } }, variants: [ { featuredItemIds: [ 'id:195' ] } ] },
		'sgs/img': { attributes: { imageId: 202, imageUrl: 'https://home.test/a.jpg' } },
		'sgs/shop': { parents: [ { attributes: { queryId: 91, query: { woocommerceHandPickedProducts: [ '71' ] } } } ], attributes: { productId: 71 } },
		'sgs/gallery': { attributes: { items: [ { id: 3459, url: 'https://elsewhere.test/b.jpg' } ], audioId: 4089, audioUrl: 'https://elsewhere.test/c.wav' } },
		'sgs/plain': { attributes: { content: 'text', fontSize: 34 } },
	};
	const fail = [];
	const want = ( ok, what ) => ok || fail.push( what );
	const before = tally( survey( fx ) );
	want( 7 === before.bare, `positive: 7 bare references found (got ${ before.bare })` );
	want( 3 === before[ 'url-backed' ] && 1 === before[ 'not-a-reference' ], 'url-backed and not-a-reference classified' );
	want( 1 === checkFixtureRefs( { x: { attributes: { logoId: 5 } } } ).length, 'check fails on one bare reference' );
	const { fixtures: after, unrecognised } = transform( fx, home );
	want( ! unrecognised.length, 'no unrecognised references' );
	want( 0 === checkFixtureRefs( after ).length, `check passes after the fix (${ checkFixtureRefs( after ).join( '; ' ) })` );
	want( '{{menu}}' === after[ 'sgs/nav' ].attributes.ref && 'id:{{menuItem}}' === after[ 'sgs/nav' ].attributes.splitAfterItemId, 'definition: numbers and id strings become tokens' );
	want( after[ 'sgs/nav' ].attributes.icons[ 'id:{{menuItem}}' ] && ! after[ 'sgs/nav' ].attributes.icons[ 'id:195' ], 'edge: an object key is renamed' );
	want( '{{product:text}}' === after[ 'sgs/shop' ].parents[ 0 ].attributes.query.woocommerceHandPickedProducts[ 0 ], 'edge: a string id keeps its string shape' );
	want( '{{image}}' === after[ 'sgs/img' ].attributes.imageId && '{{image.url}}' === after[ 'sgs/img' ].attributes.imageUrl, 'a url-backed home image becomes the image role with its URL' );
	want( JSON.stringify( after[ 'sgs/gallery' ] ) === JSON.stringify( fx[ 'sgs/gallery' ] ) && JSON.stringify( after[ 'sgs/plain' ] ) === JSON.stringify( fx[ 'sgs/plain' ] ) && 91 === after[ 'sgs/shop' ].parents[ 0 ].attributes.queryId, 'negative control: url-backed foreign ids, queryId and plain values untouched' );
	want( JSON.stringify( transform( after, home ).fixtures ) === JSON.stringify( after ) && ! transform( after, home ).changes.length, 'idempotence: a second fix changes nothing' );
	const back = Object.fromEntries( Object.entries( after ).map( ( [ b, f ] ) => [ b, resolveFixture( f, home ).fixture ] ) );
	want( JSON.stringify( back ) === JSON.stringify( fx ), 'round trip: resolving with the home refs gives the original bytes' );
	want( 1 === unexplainedWide( { x: { attributes: { gridRefCount: 3 } } } ).length, 'corpus control: an unclassified number under a reference-like key is reported' );
	want( transform( { x: { attributes: { logoId: 5 } } }, home ).unrecognised.length === 1, 'a bare id that is no home role is unrecognised, not guessed' );
	return fail;
}

function diff( changes ) {
	return changes.map( ( c ) => `${ c.block } ${ c.path.join( '.' ) }${ c.key ? ' (key)' : '' }\n- ${ JSON.stringify( c.from ) }\n+ ${ JSON.stringify( c.to ) }` ).join( '\n' );
}

export function main( argv ) {
	const flag = ( n ) => argv.includes( n );
	const value = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	if ( flag( '--self-test' ) ) {
		const fail = selfTest();
		console.log( fail.length ? `self-test failed:\n- ${ fail.join( '\n- ' ) }` : 'self-test passed.' );
		return fail.length ? 1 : 0;
	}
	const fixtures = readJson( FIXTURES );
	if ( flag( '--survey' ) ) {
		const found = survey( fixtures );
		const wide = unexplainedWide( fixtures, found );
		if ( flag( '--json' ) ) {
			console.log( JSON.stringify( { tally: tally( found ), unexplainedWide: wide, found }, null, 2 ) );
			return 0;
		}
		found.filter( ( f ) => 'url-backed' !== f.category ).forEach( ( f ) => console.log( `${ f.category.padEnd( 15 ) } ${ f.block } ${ f.path.join( '.' ) } = ${ JSON.stringify( f.value ) }${ f.reason ? ` (${ f.reason })` : '' }` ) );
		const ub = found.filter( ( f ) => 'url-backed' === f.category );
		console.log( `url-backed      ${ ub.length } attachment ids beside the URL their render falls back to, in ${ [ ...new Set( ub.map( ( f ) => f.block ) ) ].join( ', ' ) }` );
		const unused = [ ...Object.keys( NOT_REFS ), ...Object.keys( WIDE_OK ) ].filter( ( k ) => ! JSON.stringify( fixtures ).includes( `"${ k }"` ) );
		unused.length && console.log( `exemptions no fixture uses any more (remove them): ${ unused.join( ', ' ) }` );
		console.log( `tally ${ JSON.stringify( tally( found ) ) }; unexplained wide hits ${ wide.length }` );
		return 0;
	}
	if ( flag( '--fix' ) ) {
		const home = value( '--home' ) || 'eye-care-test';
		const { fixtures: next, changes, unrecognised } = transform( fixtures, refsFor( readJson( TARGETS ), home ) );
		console.log( changes.length ? diff( changes ) : 'nothing to fix' );
		unrecognised.forEach( ( f ) => console.log( `unrecognised ${ f.block } ${ f.path.join( '.' ) } = ${ JSON.stringify( f.value ) } (no role of ${ home } holds that id)` ) );
		if ( flag( '--apply' ) && changes.length ) {
			const tmp = `${ FIXTURES }.tmp`;
			fs.writeFileSync( tmp, `${ JSON.stringify( next, null, 2 ) }\n` );
			fs.renameSync( tmp, FIXTURES );
			console.log( `wrote ${ changes.length } change(s) to calibration-fixtures.json` );
		}
		return unrecognised.length ? 1 : 0;
	}
	if ( flag( '--check' ) ) {
		const problems = checkFixtureRefs( fixtures );
		console.log( problems.length ? `fixture references check failed:\n- ${ problems.join( '\n- ' ) }` : 'fixture references check passed.' );
		return problems.length ? 1 : 0;
	}
	console.error( 'usage: fixture-refs.mjs --survey [--json] | --fix [--apply] [--home <target>] | --check | --self-test' );
	return 2;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}
