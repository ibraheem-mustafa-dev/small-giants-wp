// The walker-state map checks (Spec 48 §3.7 and FR-48-13). The checks run on a committed fixture client
// (fixtures/state-map/): every walker state an unmapped-state verdict names is mapped, no mapped state is one the walker
// lacks, a surface that narrows its walk walks exactly its mapped states, and every state conflict names a real verdict
// precisely; each check has a negative control. One test reads the live committed client data: its generated state maps
// agree with scripts/parity/flows/state-map-reasons.json. No browser, no host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from '../lib/browser.mjs';
import { stateMap, diffReasons } from '../../../computed-route/lib/state-map.mjs';
import { loadClient, loadReasons } from '../../../computed-route/lib/state-map-io.mjs';

const FIXTURE = path.join( import.meta.dirname, 'fixtures', 'state-map' );
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const surfaces = readJson( path.join( FIXTURE, 'surfaces.json' ) );
const reasons = readJson( path.join( FIXTURE, 'reasons.json' ) );
const triage = Object.fromEntries( fs.readdirSync( path.join( FIXTURE, 'triage' ) ).filter( ( f ) => f.endsWith( '.json' ) )
	.map( ( f ) => [ f.replace( /\.json$/, '' ), readJson( path.join( FIXTURE, 'triage', f ) ) ] ) );

// The walker states one verdict was classed unmapped for: its unmapped-state evidence, or its solve reason.
function unmappedStatesOf( v ) {
	const ev = ( v.evidence || [] ).find( ( e ) => e.check === 'unmapped-state' );
	const fromReason = /^unmapped-state (.+)$/.exec( v.solveReason || '' );
	return [ ...new Set( [ ...( ev ? ev.states : [] ), ...( fromReason ? [ fromReason[ 1 ] ] : [] ) ] ) ];
}

// Every verdict of a triage set classed unmapped for one or more walker states: [ { surface, key, states } ].
const unmappedOf = ( t ) => Object.entries( t ).flatMap( ( [ surface, file ] ) => file.verdicts
	.map( ( v ) => ( { surface, key: v.key, states: unmappedStatesOf( v ) } ) ).filter( ( x ) => x.states.length ) );

// The "<surface>: <state>" walker states the unmapped verdicts name that the surface map does not map.
function missingStates( unmapped, map ) {
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

// The "<surface>: <state>" mapped states the surface's walker config does not define. The config is imported and its
// `states[].name` read, so a name the config builds at load time counts.
async function phantomStates( map, root ) {
	const phantom = [];
	for ( const [ name, cfg ] of Object.entries( map ) ) {
		if ( ! cfg.walker || ! cfg.states ) {
			continue;
		}
		const walker = ( await import( pathToFileURL( path.join( root, cfg.walker ) ).href ) ).default;
		const defined = new Set( ( walker.states || [] ).map( ( s ) => s.name ) );
		for ( const s of Object.keys( cfg.states ) ) {
			defined.has( s ) || phantom.push( `${ name }: ${ s }` );
		}
	}
	return phantom;
}

// For each surface that narrows its walk (`walkStates`): the mapped states it never walks and the walked states it does
// not map ("<surface>: <state> mapped, not walked" / "... walked, not mapped").
function walkGaps( map ) {
	const gaps = [];
	for ( const [ name, cfg ] of Object.entries( map ) ) {
		if ( ! Array.isArray( cfg.walkStates ) ) {
			continue;
		}
		Object.keys( cfg.states || {} ).filter( ( s ) => ! cfg.walkStates.includes( s ) ).forEach( ( s ) => gaps.push( `${ name }: ${ s } mapped, not walked` ) );
		cfg.walkStates.filter( ( s ) => ! Object.hasOwn( cfg.states || {}, s ) ).forEach( ( s ) => gaps.push( `${ name }: ${ s } walked, not mapped` ) );
	}
	return gaps;
}

// What is wrong with each state-conflict entry against the triage and the surface map: a missing verdict, a different
// pair, property or set of walker states, a `mappedTo` the map does not hold, or a duplicate entry.
function conflictProblems( entries, t, map ) {
	const problems = [];
	const seen = new Set();
	for ( const e of entries ) {
		const id = `${ e.surface } ${ e.key }`;
		seen.has( id ) && problems.push( `${ id }: duplicate entry` );
		seen.add( id );
		const v = ( t[ e.surface ]?.verdicts || [] ).find( ( x ) => x.key === e.key );
		if ( ! v ) {
			problems.push( `${ id }: no verdict with this key` );
			continue;
		}
		v.pair !== e.pair && problems.push( `${ id }: pair ${ e.pair }, verdict ${ v.pair }` );
		undefined !== e.property && v.property !== e.property && problems.push( `${ id }: property ${ e.property }, verdict ${ v.property }` );
		const states = unmappedStatesOf( v ).sort();
		JSON.stringify( states ) !== JSON.stringify( [ ...e.walkerStates ].sort() ) && problems.push( `${ id }: walker states ${ e.walkerStates.join( ',' ) }, verdict ${ states.join( ',' ) }` );
		for ( const m of e.mappedTo ) {
			const [ state, to ] = m.split( '->' );
			const st = map[ e.surface ]?.states || {};
			const actual = ! Object.hasOwn( st, state ) ? undefined : null === st[ state ] ? 'rest' : st[ state ];
			to !== actual && problems.push( `${ id }: ${ state } maps to ${ actual }, not ${ to }` );
		}
	}
	return problems;
}

const unmapped = unmappedOf( triage );

test( 'the fixture triage holds the unmapped-state verdicts to check (the test is not vacuous)', () => {
	assert.deepEqual( unmapped.map( ( u ) => `${ u.surface } ${ u.key } ${ u.states.join( ',' ) }` ).sort(), [
		'home cr-ref-home-11||style|opacity filter-open',
		'home cr-ref-home-5||hover|transform reviews-next',
		'home cr-ref-home-9||style|color filter-open',
		'shop cr-ref-shop-28|div > input:nth-of-type(2)|style|outline-style price-moved',
		'shop cr-ref-shop-4||style|width brand-picked,panel-open',
	] );
	assert.deepEqual( [ ...new Set( unmapped.map( ( u ) => u.surface ) ) ].sort(), [ 'home', 'shop' ] );
} );

test( 'every walker state an unmapped-state verdict names is mapped in surfaces.json', () => {
	assert.deepEqual( missingStates( unmapped, surfaces ), [], 'unmapped walker states remain' );
} );

test( 'negative control: with only the rest state mapped the same check finds every gap', () => {
	const restOnly = Object.fromEntries( Object.entries( surfaces ).map( ( [ k, v ] ) => [ k, { ...v, states: { opening: null } } ] ) );
	assert.deepEqual( missingStates( unmapped, restOnly ).sort(), [
		'home: filter-open', 'home: reviews-next', 'shop: brand-picked', 'shop: panel-open', 'shop: price-moved',
	], 'the check can fail' );
} );

test( 'every mapped state is a state the walker really has (no phantom states), including names built at load time', async () => {
	assert.deepEqual( await phantomStates( surfaces, FIXTURE ), [] );
	const planted = { ...surfaces, home: { ...surfaces.home, states: { ...surfaces.home.states, 'reviews-prev': null } }, faq: { ...surfaces.faq, states: { ...surfaces.faq.states, 'item5-open': 'open' } } };
	assert.deepEqual( await phantomStates( planted, FIXTURE ), [ 'home: reviews-prev', 'faq: item5-open' ], 'a planted phantom state is found' );
} );

test( 'a surface that narrows its walk walks every state it maps, so the form states are walked', () => {
	assert.deepEqual( walkGaps( surfaces ), [] );
	const narrowed = { ...surfaces, contact: { ...surfaces.contact, walkStates: [ 'opening', 'form-sent' ] } };
	assert.deepEqual( walkGaps( narrowed ), [ 'contact: field-focused mapped, not walked', 'contact: form-submitted-empty mapped, not walked', 'contact: form-sent walked, not mapped' ] );
} );

test( 'the state conflicts name real verdicts, precisely', () => {
	assert.equal( reasons.stateConflicts.entries.length, 3 );
	assert.deepEqual( conflictProblems( reasons.stateConflicts.entries, triage, surfaces ), [] );
	const [ home, width, slider ] = reasons.stateConflicts.entries;
	const bad = [
		{ ...home, pair: 'hero-link' },
		{ ...width, property: 'height' },
		{ ...width, key: 'cr-ref-shop-99||style|width' },
		{ ...slider, walkerStates: [ 'price-moved', 'brand-picked' ] },
		{ ...width, mappedTo: [ 'brand-picked->rest', 'panel-open->rest' ] },
		slider,
	];
	assert.deepEqual( conflictProblems( bad, triage, surfaces ), [
		'home cr-ref-home-5||hover|transform: pair hero-link, verdict hero-button',
		'shop cr-ref-shop-4||style|width: property height, verdict width',
		'shop cr-ref-shop-99||style|width: no verdict with this key',
		'shop cr-ref-shop-28|div > input:nth-of-type(2)|style|outline-style: walker states price-moved,brand-picked, verdict price-moved',
		'shop cr-ref-shop-4||style|width: duplicate entry',
		'shop cr-ref-shop-4||style|width: panel-open maps to open, not rest',
		'shop cr-ref-shop-28|div > input:nth-of-type(2)|style|outline-style: duplicate entry',
	] );
} );

test( 'the committed client data agrees with state-map-reasons.json: no stale conflict entry, no unstated or stale gap row', () => {
	const CLIENT = fs.readdirSync( path.join( REPO_ROOT, 'sites' ) ).find( ( c ) => /^eye-care-/.test( c ) );
	assert.ok( CLIENT, 'the client folder is committed' );
	const live = loadClient( CLIENT );
	const liveReasons = loadReasons();
	const names = Object.keys( live.surfaces ).filter( ( s ) => live.surfaces[ s ].states );
	assert.ok( names.length > 0 && live.intake, 'surfaces with states and an intake record to check' );
	const problems = [];
	const gapIds = new Set();
	for ( const surface of names ) {
		const map = stateMap( { surfaces: live.surfaces, surface, intake: live.intake } );
		map.gaps.forEach( ( g ) => gapIds.add( `${ surface } ${ g.id }` ) );
		const diff = diffReasons( map, liveReasons );
		diff.missing.forEach( ( m ) => problems.push( `${ surface }: gap row ${ m.id } not stated (${ m.reason })` ) );
		diff.stale.forEach( ( s ) => problems.push( `${ surface }: conflict ${ s.key } is stale: ${ s.why.join( '; ' ) }` ) );
	}
	for ( const e of liveReasons.stateConflicts?.entries || [] ) {
		names.includes( e.surface ) || problems.push( `conflict ${ e.key } names surface ${ e.surface }, which has no state map` );
	}
	for ( const x of liveReasons.stateless || [] ) {
		const has = 'string' === typeof x ? [ ...gapIds ].some( ( g ) => g.endsWith( ` ${ x }` ) ) : gapIds.has( `${ x.surface } ${ x.id }` );
		has || problems.push( `stateless ${ JSON.stringify( x ) } is a gap row no current map has` );
	}
	assert.deepEqual( problems, [] );
} );
