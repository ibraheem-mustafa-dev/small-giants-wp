#!/usr/bin/env node
// The generated state map for one surface (Spec 48 FR-48-13).
//   node scripts/computed-route/state-map.mjs --client <slug> --surface <name> [--records S-34,S-41] [--check]
//     [--surfaces <surfaces.json>] [--intake <intake.json>] [--json]
// Prints each walker state with its setting state, every sc-if with how the draft reaches it (or its gap row), and the
// diff against scripts/parity/flows/state-map-reasons.json. --check exits 1 when an sc-if is neither reached nor listed,
// or the diff holds a row.
//   node scripts/computed-route/state-map.mjs --check-walkers <client> [--surfaces <surfaces.json>]
// The walker check (lib/walker-check.mjs): every walker file a surface names exists and walks every state the surface
// maps; a state its generated config lists as unwalked is printed with its reason. Exits 1 on a fault.
import path from 'path';
import { stateRows } from './lib/state-vocab.mjs';
import { stateMap, diffReasons } from './lib/state-map.mjs';
import { loadClient, loadReasons, REPO } from './lib/state-map-io.mjs';
import { checkWalkers } from './lib/walker-check.mjs';

const argv = process.argv.slice( 2 );
const flag = ( n ) => {
	const i = argv.indexOf( n );
	return -1 === i ? null : argv[ i + 1 ];
};
const walkersOf = flag( '--check-walkers' );
if ( walkersOf ) {
	const { surfaces: all } = loadClient( walkersOf, { surfacesFile: flag( '--surfaces' ) } );
	const r = await checkWalkers( all, path.join( REPO, 'sites', walkersOf, 'build' ) );
	console.log( `# Walker check: ${ walkersOf } (${ r.checked } surfaces with a walker)\n` );
	r.faults.forEach( ( f ) => console.log( `- FAULT ${ f }` ) );
	r.unwalked.forEach( ( u ) => console.log( `- listed ${ u }` ) );
	r.listed.forEach( ( u ) => console.log( `- listed ${ u }` ) );
	console.log( r.faults.length ? `\nwalker check failed: ${ r.faults.length } fault(s)` : '\nwalker check passed' );
	process.exit( r.faults.length ? 1 : 0 );
}
const client = flag( '--client' );
const surface = flag( '--surface' );
if ( ! client || ! surface ) {
	console.error( 'usage: node state-map.mjs --client <slug> --surface <name> [--records S-34,S-41] [--check] [--json]' );
	process.exit( 2 );
}
const { surfaces, intake } = loadClient( client, { surfacesFile: flag( '--surfaces' ), intakeFile: flag( '--intake' ) } );
let vocab = [];
try {
	vocab = stateRows();
} catch ( e ) {
	console.error( `state vocabulary unavailable (${ e.message }): set-state rows carry no setting state` );
}
const map = stateMap( { surfaces, surface, intake, vocab, records: flag( '--records' )?.split( ',' ) || null } );
const diff = diffReasons( map, loadReasons(), client );


const census = ( intake?.census || [] ).filter( ( r ) => 'sc-if' === r.kind ).length;

if ( argv.includes( '--json' ) ) {
	console.log( JSON.stringify( { map, diff }, null, '\t' ) );
} else {
	console.log( `# State map: ${ client } / ${ surface }\n` );
	console.log( '## Walker states\n' );
	map.walkerStates.forEach( ( w ) => console.log( `- ${ w.walkerState } -> ${ w.settingState ?? 'rest' }${ w.names.length ? ` (names ${ w.names.join( ', ' ) })` : '' }` ) );
	console.log( `\n## sc-if conditions (${ map.scIf.length } of ${ census } in the census; ${ map.gaps.length } gap)\n` );
	map.scIf.forEach( ( r ) => console.log( `- ${ r.id } [${ r.record ?? 'no record' }] ${ r.reach }${ r.walkerState ? ` via ${ r.walkerState }` : '' }${ r.keys ? ` keys ${ JSON.stringify( r.keys ) }` : '' }${ r.settingState ? ` -> ${ r.settingState }` : '' }${ r.reason ? `: ${ r.reason }` : '' }` ) );
	console.log( `\n## Diff against state-map-reasons.json\n\n- gap rows the reasons do not state: ${ diff.missing.length }` );
	diff.missing.forEach( ( m ) => console.log( `  - ${ m.id }: ${ m.reason }` ) );
	console.log( `- conflict entries whose group the map no longer has: ${ diff.stale.length }` );
	diff.stale.forEach( ( s ) => console.log( `  - ${ s.key }: ${ s.why.join( '; ' ) }` ) );
}
if ( argv.includes( '--check' ) ) {
	const bad = diff.missing.length + diff.stale.length;
	if ( bad ) {
		console.error( `state map check failed: ${ diff.missing.length } unstated gap row(s), ${ diff.stale.length } stale conflict entr${ 1 === diff.stale.length ? 'y' : 'ies' }` );
		process.exit( 1 );
	}
	console.log( 'state map check passed' );
}
