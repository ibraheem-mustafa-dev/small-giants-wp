// FR-48-12 item 1: the walker config's lint as a route gate. Each surface's generated walker config (walkerFull, else
// the hand walker) is linted with the walker's own lint (scripts/parity/lib/lint.mjs::lintRun, the call
// draft-live-walk.mjs makes, so the gate and the walk cannot disagree) before Solve builds or walks it; a lint problem
// stops the run before any browser opens, naming the surface and the problem. Nothing fails open: a missing config, or
// one that will not load, is itself a problem.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { lintRun } from '../../parity/lib/lint.mjs';

// The problems the walker's lint finds in one config. states: the states the run walks (--states), or null for every
// state. An empty list means the config passes.
export async function lintWalker( walker, states = null ) {
	if ( ! fs.existsSync( walker ) ) {
		return [ `the walker config ${ walker } does not exist` ];
	}
	let cfg;
	try {
		cfg = ( await import( pathToFileURL( path.resolve( walker ) ).href ) ).default;
	} catch ( e ) {
		return [ `the walker config ${ walker } does not load: ${ e.message }` ];
	}
	if ( ! cfg || 'object' !== typeof cfg ) {
		return [ `the walker config ${ walker } exports no config object` ];
	}
	return lintRun( walker, cfg, states?.length ? states : null );
}

// The gate's refusal for one surface: null when its config passes, else the message that stops the run.
export async function walkerLintFault( surface, walker, states = null ) {
	const problems = await lintWalker( walker, states );
	return problems.length ? `surface "${ surface }": walker config ${ path.basename( walker ) } failed its lint, so nothing is built or walked:\n- ${ problems.join( '\n- ' ) }` : null;
}

// Every surface of one client's surfaces.json that names a walker config: [{ surface, walker, problems }].
export async function lintClient( buildDir ) {
	const surfaces = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) );
	const out = [];
	for ( const [ surface, s ] of Object.entries( surfaces ) ) {
		if ( s && 'object' === typeof s && ( s.walkerFull || s.walker ) ) {
			const walker = path.join( buildDir, s.walkerFull || s.walker );
			out.push( { surface, walker, problems: await lintWalker( walker, s.walkStates || null ) } );
		}
	}
	return out;
}
