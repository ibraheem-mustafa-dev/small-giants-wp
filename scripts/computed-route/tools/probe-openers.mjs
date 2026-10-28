#!/usr/bin/env node
// Read-only proof of the state opener: for each surface state of an export, in intake's sandbox, applies the keys with
// lib/intake-state.mjs::setDraftState (the call intake and lib/intake-skeletons.mjs::openers use) on the entry page and on
// the state's own route, and prints what the draft did. Changes nothing: the sandbox is the replay one, every state is
// put back after its reading, and neither intake nor Fill is called.
//   node scripts/computed-route/tools/probe-openers.mjs <client> [--repo <repo>] [--surfaces S-09,S-52] [--width 1440] [--json]
// Without --surfaces: every drawer and menu surface, and every surface named by a `state-values` row of
// sites/<client>/build/intake/facts.json `gaps` (the ids before each colon of its draftId).
// Per state: surface, state, component, keys, the opener's own verdict (`opener`: concrete keys or the reason intake's
// openers() drops it), the page (`entry` or the route), `reached` (instances setDraftState reached), `mounted` (hosts of
// the component on that page), `liveKeys` / `notLiveKeys` (requested keys the instance did / did not hold before the
// call), `sc-if` (rendered of the listed `sc_if_tpl_ids`, before -> after) and `outcome` (what the row proves).
// Exit 0; 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { openSandbox, recheckManifest } from '../lib/intake-sandbox.mjs';
import { runCensus } from '../lib/intake-census.mjs';
import { surfaceRoots, openers } from '../lib/intake-skeletons.mjs';
import { judgeKeys, describeWay, CLOSED } from '../lib/state-openers.mjs';
import { widthStateKeys } from '../lib/state-reach.mjs';
import { readBreakpoints } from '../lib/intake-breakpoints.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState } from '../lib/intake-state.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const SETTLE_MS = 600;

// In-page: the live instances of `component` (the hosts whose data-sc-name is it) and how many of `tpls` render in one of
// them, judged as markRoot in lib/intake-skeletons.mjs does: an element renders when a live copy carries its id; an
// sc-if, sc-for or sc-else renders when an element it stamps (an id inside it in the annotated template) is live.
// `keys` is the first instance's own state, to show which requested keys it holds.
function readPage( { component, tpls, keys } ) {
	const hosts = [ ...document.querySelectorAll( '.sc-host' ) ].filter( ( h ) => h.dataset.scName === component );
	const hostName = ( e ) => e.parentElement?.closest( '.sc-host' )?.dataset.scName;
	const template = document.createElement( 'template' );
	template.innerHTML = window.__dcAnnotatedTemplate ? window.__dcAnnotatedTemplate( component ) || '' : '';
	const liveIds = new Set( [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].filter( ( e ) => hostName( e ) === component ).map( ( e ) => e.dataset.dcTpl ) );
	const rendered = tpls.filter( ( n ) => {
		const src = template.content.querySelector( `[data-dc-tpl="${ n }"]` );
		if ( ! src || ! /^sc-(if|for|else)$/.test( src.localName ) ) {
			return liveIds.has( n );
		}
		return [ ...src.querySelectorAll( '[data-dc-tpl]' ) ].some( ( x ) => liveIds.has( x.dataset.dcTpl ) );
	} );
	let live = null;
	for ( const host of hosts ) {
		const k = Object.keys( host ).find( ( x ) => x.startsWith( '__reactFiber$' ) );
		let f = k ? host[ k ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === component ) ) {
			f = f.return;
		}
		if ( f ) {
			live = f.stateNode.logic.state;
			break;
		}
	}
	// A key a call stored on the instance and restore put back reads undefined: it was never one of the instance's own.
	const own = live ? Object.keys( live ).filter( ( n ) => undefined !== live[ n ] ) : [];
	return {
		mounted: hosts.length,
		rendered: rendered.length,
		ownKeys: own.length,
		held: keys.filter( ( n ) => own.includes( n ) ),
		missing: keys.filter( ( n ) => ! own.includes( n ) ),
		values: live ? Object.fromEntries( keys.filter( ( n ) => own.includes( n ) ).map( ( n ) => [ n, JSON.stringify( live[ n ] ) ] ) ) : {},
	};
}

const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

// Why intake's openers() would not set this state's keys, from the rules it builds its ways by (lib/state-openers.mjs::
// judgeKeys): a key that is no state key name, a key holding a description, a closed or default state. widthKeys:
// lib/state-reach.mjs::widthStateKeys (a width key's bound is never set either).
export function openerVerdict( s, st, census, widthKeys = null ) {
	if ( ! Object.keys( st.state_keys || {} ).length ) {
		return 'no state keys';
	}
	const { dropped } = judgeKeys( st, { own: widthKeys?.get( s.component ) ?? new Set() } );
	const named = ( why ) => dropped.filter( ( d ) => why.test( d.why ) ).map( ( d ) => d.key );
	const bad = named( /state key name/ );
	const holes = named( /placeholder|description/ );
	if ( bad.length ) {
		return `not a state key name: ${ bad.join( ', ' ) }`;
	}
	if ( holes.length ) {
		return `placeholder or description value for ${ holes.join( ', ' ) }`;
	}
	if ( CLOSED.test( st.name || '' ) ) {
		return 'closed/default state is not an opener';
	}
	const offered = openers( s, census, widthKeys ).some( ( o ) => 'state' === o.via && o.state === st.name );
	return offered ? 'concrete (offered)' : 'dropped by openers()';
}

// What the row proves, from its own fields: no instance of the component on that page; keys the instance did not hold
// before the call (setState stores any name, so a render value such as `R.pin` reads back as set but drives nothing); a
// placeholder inside the value; otherwise the keys were its own and the sc-if count says what rendered.
export function outcomeOf( row ) {
	if ( ! row.mounted ) {
		return 'no live instance on this page';
	}
	if ( row.notLiveKeys.length ) {
		return `not a state key of the live instance: ${ row.notLiveKeys.join( ', ' ) }`;
	}
	if ( /placeholder|description/.test( row.opener ) ) {
		return `placeholder value applied: ${ row.scIf.listed ? `${ row.scIf.after } of ${ row.scIf.listed } sc-if render` : 'nothing to render' }`;
	}
	return row.scIf.listed ? `own keys applied: ${ row.scIf.before } -> ${ row.scIf.after } of ${ row.scIf.listed } sc-if render` : 'own keys applied: no sc-if listed';
}

function parseArgs( argv ) {
	const a = { client: null, repo: REPO, surfaces: null, width: 1440, json: false };
	for ( let i = 0; i < argv.length; i++ ) {
		const x = argv[ i ];
		if ( '--json' === x ) {
			a.json = true;
		} else if ( '--repo' === x ) {
			a.repo = path.resolve( argv[ ++i ] ?? '' );
		} else if ( '--surfaces' === x ) {
			a.surfaces = ( argv[ ++i ] ?? '' ).split( ',' ).filter( Boolean );
		} else if ( '--width' === x ) {
			a.width = Number( argv[ ++i ] );
		} else if ( ! x.startsWith( '--' ) && ! a.client ) {
			a.client = x;
		} else {
			return null;
		}
	}
	return a.client && a.width > 0 ? a : null;
}

// The surface ids a state-values gap row names: every "S-nn" before a colon in its draftId.
export const gapSurfaceIds = ( gaps ) => [ ...new Set( gaps.filter( ( g ) => 'state-values' === g.construct ).flatMap( ( g ) => [ ...String( g.draftId ).matchAll( /\b(S-\d+):/g ) ].map( ( m ) => m[ 1 ] ) ) ) ];

export async function probe( { client, repo, surfaces: wanted, width } ) {
	const folder = path.join( repo, 'sites', client, 'handoff' );
	const manifest = JSON.parse( fs.readFileSync( path.join( folder, 'MANIFEST.json' ), 'utf8' ) );
	const entry = manifest.entry_drafts[ 0 ];
	const { manifestHash } = recheckManifest( folder );
	const harPath = path.join( repo, 'sites', client, 'build', 'intake', 'replay', `${ manifestHash }.har` );
	const factsFile = path.join( repo, 'sites', client, 'build', 'intake', 'facts.json' );
	const gapIds = fs.existsSync( factsFile ) ? gapSurfaceIds( JSON.parse( fs.readFileSync( factsFile, 'utf8' ) ).gaps || [] ) : [];
	const census = await runCensus( { folder, entry, harPath } );
	const { surfaces } = surfaceRoots( { folder, census } );
	const widthKeys = widthStateKeys( readBreakpoints( { folder } ) );
	const records = JSON.parse( fs.readFileSync( path.join( folder, 'surfaces.json' ), 'utf8' ) ).records;
	const byId = new Map( records.map( ( r ) => [ r.id, r ] ) );
	const ids = wanted ?? [ ...new Set( [ ...records.filter( ( r ) => [ 'drawer', 'menu' ].includes( r.kind ) ).map( ( r ) => r.id ), ...gapIds ] ) ];
	const sb = await openSandbox( { folder, index: entry, harPath, mode: 'replay', widths: [ width ] } );
	const rows = [];
	try {
		const pages = new Map();
		const pageFor = async ( route ) => {
			const key = route ?? 'entry';
			if ( ! pages.has( key ) ) {
				pages.set( key, await sb.visit( route ? `${ entry }?#${ route }` : entry, { width } ) );
			}
			return pages.get( key );
		};
		for ( const id of ids ) {
			const r = byId.get( id );
			if ( ! r ) {
				rows.push( { surface: id, error: 'no such record in surfaces.json' } );
				continue;
			}
			const s = surfaces.find( ( x ) => x.id === id ) ?? { id, component: r.dc, states: r.states || [], openedBy: r.opened_by ?? null, slug: id };
			const routes = [ null, ...( r.route && '*' !== r.route ? [ r.route ] : [] ) ];
			for ( const st of r.states || [] ) {
				const keys = st.state_keys || {};
				if ( ! Object.keys( keys ).length ) {
					continue;
				}
				const tpls = ( st.sc_if_tpl_ids || [] ).map( String );
				for ( const route of routes ) {
					const page = await pageFor( route );
					const arg = { component: r.dc, tpls, keys: Object.keys( keys ) };
					const row = { surface: id, kind: r.kind, state: st.name, component: r.dc, keys, opener: openerVerdict( s, st, census, widthKeys ), page: route ?? 'entry' };
					await snapshotDraftState( page );
					const before = await page.evaluate( readPage, arg );
					row.reached = await setDraftState( page, { component: r.dc, keys } );
					await sleep( SETTLE_MS );
					const after = await page.evaluate( readPage, arg );
					await restoreDraftState( page );
					await sleep( SETTLE_MS );
					Object.assign( row, { mounted: after.mounted, liveKeys: before.held, notLiveKeys: before.missing, values: after.values, scIf: { listed: tpls.length, before: before.rendered, after: after.rendered } } );
					row.applied = after.mounted > 0 && before.missing.length === 0 && Object.keys( keys ).every( ( n ) => after.values[ n ] === JSON.stringify( keys[ n ] ) );
					row.outcome = outcomeOf( row );
					rows.push( row );
				}
			}
		}
	} finally {
		await sb.close();
	}
	return { entry, ids, rows, openersFor: Object.fromEntries( surfaces.filter( ( s ) => ids.includes( s.id ) ).map( ( s ) => [ s.id, openers( s, census, widthKeys ).map( describeWay ) ] ) ) };
}

function print( out ) {
	const pad = ( v, n ) => String( v ).padEnd( n );
	console.log( [ 'surface', 'state', 'page', 'reached', 'mounted', 'sc-if before->after/listed', 'opener', 'outcome' ].join( ' | ' ) );
	for ( const r of out.rows ) {
		if ( r.error ) {
			console.log( `${ r.surface } | ${ r.error }` );
			continue;
		}
		console.log( [ r.surface, r.state, r.page, r.reached, r.mounted, `${ r.scIf.before }->${ r.scIf.after }/${ r.scIf.listed }`, r.opener, r.outcome ].join( ' | ' ) );
	}
	const tally = {};
	for ( const r of out.rows.filter( ( x ) => x.outcome ) ) {
		const k = `${ 'entry' === r.page ? 'entry page' : 'own route' }: ${ r.outcome.split( ':' )[ 0 ] }`;
		tally[ k ] = ( tally[ k ] ?? 0 ) + 1;
	}
	console.log( '\noutcomes:' );
	Object.entries( tally ).sort().forEach( ( [ k, v ] ) => console.log( `  ${ String( v ).padStart( 3 ) }  ${ k }` ) );
	console.log( '\nopeners() per surface:' );
	for ( const [ id, list ] of Object.entries( out.openersFor ) ) {
		console.log( `  ${ pad( id, 6 ) } ${ list.length ? list.join( ' ; ' ) : '(none)' }` );
	}
}

if ( import.meta.url === pathToFileURL( process.argv[ 1 ] ?? '' ).href ) {
	const args = parseArgs( process.argv.slice( 2 ) );
	if ( ! args ) {
		console.error( 'usage: probe-openers.mjs <client> [--repo <repo>] [--surfaces S-09,S-52] [--width 1440] [--json]' );
		process.exit( 2 );
	}
	const out = await probe( args );
	args.json ? console.log( JSON.stringify( out, null, 1 ) ) : print( out );
	process.exit( 0 );
}
