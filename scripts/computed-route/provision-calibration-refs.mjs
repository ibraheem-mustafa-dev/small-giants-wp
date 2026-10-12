#!/usr/bin/env node
// Creates on a test site the objects the calibration fixtures name by token, and records their IDs as that target's
// `refs` in calibration-targets.json (Spec 48 §3.2, Appendix A step 13).
//   node scripts/computed-route/provision-calibration-refs.mjs --site <test site> [--image <file>] [--logo <file>] [--dry-run]
// Reads the site (one `wp eval-file -` over SSH, as user Claude), plans from what it already holds
// (lib/provision-refs.mjs::planProvision), then finds or creates: the "CR calibration" menu with its items, submenu and
// mega-panel item; the calibration mega panel and sgs_drawer posts; the image and logo attachments (imported from the
// given repo files, else an existing image role is kept and the logo reuses it); a product when WooCommerce is active.
// Idempotent: everything is found by name or slug before it is created. A mirror is never provisioned: provision its
// test site, refresh the mirror (scripts/local-wp/refresh-from-remote.sh), and the mirror inherits the refs (mirrorOf).
// --dry-run reads and prints the plan; it writes nothing on the site or in calibration-targets.json.
// Exit 0: done (or planned); 1: the site could not be read or written; 2: bad arguments.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES, refsFor, checkRefsExist, wpCommand } from './lib/calibration-refs.mjs';
import { statePhp, planProvision, applyPhp, refsFromResult } from './lib/provision-refs.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );
const TARGETS = path.join( HERE, 'calibration-targets.json' );
const USAGE = 'usage: node scripts/computed-route/provision-calibration-refs.mjs --site <test site> [--image <file>] [--logo <file>] [--dry-run]';
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

// The command line as { site, dryRun, files }, or { error }.
export function parseArgs( argv ) {
	const o = { site: null, dryRun: false, files: {} };
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( [ '--site', '--image', '--logo' ].includes( a ) ) {
			if ( undefined === argv[ i + 1 ] || argv[ i + 1 ].startsWith( '--' ) ) {
				return { error: `${ a } needs a value` };
			}
			'--site' === a ? ( o.site = argv[ ++i ] ) : ( o.files[ a.slice( 2 ) ] = argv[ ++i ] );
		} else if ( '--dry-run' === a ) {
			o.dryRun = true;
		} else {
			return { error: `unknown argument ${ a }` };
		}
	}
	for ( const [ role, f ] of Object.entries( o.files ) ) {
		if ( ! MIME[ path.extname( f ).toLowerCase() ] ) {
			return { error: `--${ role } ${ f }: an image file (${ Object.keys( MIME ).join( ', ' ) }) is needed` };
		}
	}
	return o.site ? o : { error: '--site is required' };
}

// JSON printed by a wp eval-file run (after any notices).
const jsonOut = ( text ) => JSON.parse( String( text ).slice( String( text ).indexOf( '{' ) ) );

// The printed plan.
export function describePlan( site, state, plan ) {
	const lines = [ `${ site }: menu ${ state.menu ? `"CR calibration" is term ${ state.menu } with ${ state.items.length } item(s)` : 'none yet' }; WooCommerce ${ state.woocommerce ? 'active' : 'not active' }` ];
	lines.push( plan.actions.length ? 'actions:' : 'actions: none (everything exists)' );
	plan.actions.forEach( ( a ) => lines.push( `  - ${ a }` ) );
	lines.push( `refs: ${ JSON.stringify( plan.refs ) }` );
	plan.unsupplied.forEach( ( u ) => lines.push( `not supplied: ${ u.role } (${ u.why }); blocks whose fixture names it are reported, not calibrated, on ${ site }` ) );
	return lines;
}

function run( argv ) {
	const o = parseArgs( argv );
	if ( o.error ) {
		console.error( o.error );
		console.error( USAGE );
		return 2;
	}
	const targets = JSON.parse( fs.readFileSync( TARGETS, 'utf8' ) );
	const target = targets[ o.site ];
	if ( ! target ) {
		console.error( `${ o.site } is not in calibration-targets.json (${ Object.keys( targets ).join( ', ' ) })` );
		return 2;
	}
	if ( target.mirrorOf || target.pluginDir ) {
		console.error( `${ o.site } is a local mirror: provision ${ target.mirrorOf || 'its test site' }, then refresh the mirror; it inherits the refs` );
		return 2;
	}
	const wp = wpCommand( target, o.site, REPO );
	let state;
	let kept;
	const refs = refsFor( targets, o.site );
	try {
		state = jsonOut( wp( [ 'eval-file', '-' ], `<?php\n${ statePhp() }\n` ) );
		kept = checkRefsExist( refs, Object.keys( refs ).filter( ( r ) => ROLES[ r ] ), ( php ) => wp( [ 'eval-file', '-' ], `<?php\n${ php }\n` ) );
	} catch ( e ) {
		console.error( `could not read ${ o.site }: ${ String( e.message || e ).split( /\r?\n/ )[ 0 ] }` );
		return 1;
	}
	Object.entries( kept ).filter( ( [ , v ] ) => true !== v ).forEach( ( [ r, why ] ) => console.log( `current ref ${ r } is not kept: ${ why }` ) );
	const files = Object.fromEntries( Object.entries( o.files ).map( ( [ r, f ] ) => [ r, path.relative( REPO, path.resolve( REPO, f ) ).split( path.sep ).join( '/' ) ] ) );
	const plan = planProvision( state, { refs, kept, files } );
	describePlan( o.site, state, plan ).forEach( ( l ) => console.log( l ) );
	if ( o.dryRun ) {
		console.log( 'dry run: nothing was written' );
		return 0;
	}
	const media = Object.fromEntries( Object.entries( plan.refs ).filter( ( [ r, v ] ) => 'new' === v && files[ r ] ).map( ( [ r ] ) => {
		const file = path.resolve( REPO, files[ r ] );
		return [ r, { name: path.basename( file ), mime: MIME[ path.extname( file ).toLowerCase() ], data: fs.readFileSync( file ).toString( 'base64' ) } ];
	} ) );
	let result;
	try {
		result = jsonOut( wp( [ 'eval-file', '-' ], `<?php\n${ applyPhp( { known: plan.known, media, product: 'new' === plan.refs.product } ) }\n` ) );
	} catch ( e ) {
		console.error( `provisioning ${ o.site } failed: ${ String( e.message || e ).split( /\r?\n/ )[ 0 ] }` );
		return 1;
	}
	if ( result.error ) {
		console.error( `provisioning ${ o.site } failed: ${ result.error }` );
		return 1;
	}
	const written = refsFromResult( plan, result );
	targets[ o.site ].refs = written;
	const tmp = `${ TARGETS }.tmp`;
	fs.writeFileSync( tmp, `${ JSON.stringify( targets, null, 2 ) }\n` );
	fs.renameSync( tmp, TARGETS );
	console.log( `${ o.site } refs written to calibration-targets.json: ${ JSON.stringify( written ) }` );
	return 0;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	process.exitCode = run( process.argv.slice( 2 ) );
}
