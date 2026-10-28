// The walker check (Spec 48 §3.6, FR-48-13): every surface whose `surfaces.json` entry names a walker config has that
// file, and the config walks every state the entry maps, so Solve measures each one. A state the generated config lists
// under `unwalked` (lib/fill-config.mjs: a state Fill could not open, with its reason) is reported apart, never as a
// fault: its gap row is in Fill's report. Run by `state-map.mjs --check-walkers <client>`.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// { faults: [string], unwalked: [string], checked } for one client's surfaces. surfaces: the parsed surfaces.json;
// buildDir: sites/<client>/build (a walker path in an entry is relative to it).
export async function checkWalkers( surfaces, buildDir ) {
	const faults = [];
	const unwalked = [];
	let checked = 0;
	for ( const [ name, entry ] of Object.entries( surfaces || {} ) ) {
		if ( ! entry || 'object' !== typeof entry || ! ( entry.walker || entry.walkerFull ) ) {
			continue;
		}
		checked++;
		const files = [ entry.walker, entry.walkerFull ].filter( Boolean );
		const missing = files.filter( ( f ) => ! fs.existsSync( path.join( buildDir, f ) ) );
		missing.forEach( ( f ) => faults.push( `${ name }: walker file ${ f } does not exist` ) );
		const file = [ entry.walkerFull, entry.walker ].find( ( f ) => f && ! missing.includes( f ) );
		if ( ! file ) {
			continue;
		}
		let cfg;
		try {
			cfg = ( await import( pathToFileURL( path.join( buildDir, file ) ).href ) ).default;
		} catch ( e ) {
			faults.push( `${ name }: ${ file } does not load (${ e.message.split( '\n' )[ 0 ] })` );
			continue;
		}
		const walked = new Set( ( cfg?.states || [] ).map( ( s ) => s.name ) );
		const listed = new Map( ( cfg?.unwalked || [] ).map( ( u ) => [ u.state, u.reason ] ) );
		for ( const state of Object.keys( entry.states || {} ) ) {
			if ( walked.has( state ) ) {
				continue;
			}
			listed.has( state ) ? unwalked.push( `${ name }: ${ state } is not walked: ${ listed.get( state ) }` ) : faults.push( `${ name }: ${ state } is mapped but ${ file } does not walk it` );
		}
	}
	return { faults, unwalked, checked };
}
