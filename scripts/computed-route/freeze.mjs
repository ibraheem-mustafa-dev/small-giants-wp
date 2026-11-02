// The cross-client guard for the skeleton rules (handoff readers plan, "The cross-client guard"):
//   node scripts/computed-route/freeze.mjs snapshot <client> [--no-built]
//   node scripts/computed-route/freeze.mjs diff <client> <freeze dir> [--no-built]
//   node scripts/computed-route/freeze.mjs diff-all <freeze stamp>
// snapshot proposes every surface of the client again offline (lib/skeleton-rerun.mjs::rerunSkeletons, from the inventories
// the last intake saved, with the motion inventory's loop records and no finaliser picks, as check-approved.mjs does) and
// writes sites/<client>/build/qa/freeze/<YYYY-MM-DD-HHMM>[-no-built]/proposals.json: a header (client, commit, date, the
// --no-built flag, counts) and, per surface slug, each row's key, draft element tag, proposed block or action (removed,
// absorbed, unwrap), the rule that settled it and its confidence. diff proposes the same rows with the current code and
// prints every changed row (before, after, the rule on each side), every added row and every removed row, with counts.
// The freeze header's --no-built flag decides how diff proposes; a --no-built flag that disagrees with it is a usage error.
// diff-all runs diff for every client under sites/ whose freeze directory name starts with the stamp. Exit 0 when nothing
// changed, 1 when anything did, 2 on usage or a missing file.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const USAGE = 'usage: node scripts/computed-route/freeze.mjs snapshot <client> [--no-built] | diff <client> <freeze dir> [--no-built] | diff-all <freeze stamp>\n';
const CLIENT = /^[a-z0-9-]+$/;

// The outcome of a row: its block, or its action (with the element it was absorbed into).
const outcomeOf = ( r ) => ( r.action ? `${ r.action }${ r.into ? `->${ r.into }` : '' }` : r.block || 'none' );

// One surface's rows in the frozen shape. A key that repeats within a surface takes its occurrence number.
export function rowsOf( rows ) {
	const seen = {};
	return rows.map( ( r ) => {
		const n = seen[ r.key ] = ( seen[ r.key ] ?? -1 ) + 1;
		return { key: n ? `${ r.key }~${ n }` : r.key, tag: r.tag ?? null, outcome: outcomeOf( r ), rule: r.rule || r.source || 'score', confidence: Math.round( ( r.confidence ?? 0 ) * 1000 ) / 1000 };
	} );
}

// { <slug>: [ frozen row ] } from a rerunSkeletons result's `surfaces`.
const proposalsOf = ( surfaces ) => Object.fromEntries( Object.entries( surfaces ).map( ( [ slug, s ] ) => [ slug, rowsOf( s.rows ) ] ) );

// Every difference between two { <slug>: [ frozen row ] } maps: { changed, added, removed } (surface slugs, whole surfaces
// included: a surface only in `after` adds all its rows, one only in `before` removes all of them).
export function diffProposals( before, after ) {
	const out = { changed: [], added: [], removed: [] };
	for ( const slug of new Set( [ ...Object.keys( before ), ...Object.keys( after ) ] ) ) {
		const b = new Map( ( before[ slug ] || [] ).map( ( r ) => [ r.key, r ] ) );
		const a = new Map( ( after[ slug ] || [] ).map( ( r ) => [ r.key, r ] ) );
		for ( const [ key, was ] of b ) {
			const now = a.get( key );
			if ( ! now ) {
				out.removed.push( { surface: slug, key, before: was } );
			} else if ( was.outcome !== now.outcome || was.rule !== now.rule || was.confidence !== now.confidence || was.tag !== now.tag ) {
				out.changed.push( { surface: slug, key, before: was, after: now } );
			}
		}
		for ( const [ key, now ] of a ) {
			if ( ! b.has( key ) ) {
				out.added.push( { surface: slug, key, after: now } );
			}
		}
	}
	return out;
}

const fmt = ( r ) => `${ r.outcome } [${ r.rule } ${ r.confidence }] <${ r.tag }>`;
function report( client, d, rowCount ) {
	const lines = d.changed.map( ( c ) => `  CHANGED ${ c.surface } ${ c.key }: ${ fmt( c.before ) } -> ${ fmt( c.after ) }` );
	d.added.forEach( ( c ) => lines.push( `  ADDED ${ c.surface } ${ c.key }: ${ fmt( c.after ) }` ) );
	d.removed.forEach( ( c ) => lines.push( `  REMOVED ${ c.surface } ${ c.key }: was ${ fmt( c.before ) }` ) );
	return [ `${ client }: ${ d.changed.length } changed, ${ d.added.length } added, ${ d.removed.length } removed of ${ rowCount } frozen rows`, ...lines ];
}

const countRows = ( p ) => Object.values( p ).reduce( ( n, rows ) => n + rows.length, 0 );
const stampOf = ( d ) => `${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getDate() ).padStart( 2, '0' ) }-${ String( d.getHours() ).padStart( 2, '0' ) }${ String( d.getMinutes() ).padStart( 2, '0' ) }`;
const commitOf = ( repo ) => {
	const r = spawnSync( 'git', [ 'rev-parse', 'HEAD' ], { cwd: repo, encoding: 'utf8' } );
	return 0 === r.status ? r.stdout.trim() : null;
};

// The default proposer: the client's surfaces proposed offline from its saved intake and inventories.
async function proposeClient( client, useBuilt, repo = REPO ) {
	const { rerunSkeletons, loopingKeys } = await import( './lib/skeleton-rerun.mjs' );
	const { openDb } = await import( './lib/db.mjs' );
	const file = path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `no ${ path.relative( repo, file ) }` );
	}
	const intake = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	const db = openDb();
	try {
		return proposalsOf( rerunSkeletons( { client, db, repo, skeletons: intake.skeletons, motion: loopingKeys( intake.inventory?.animations ), useBuilt } ).surfaces );
	} finally {
		db.close();
	}
}

async function diffOne( client, dir, flags, o ) {
	const file = path.join( dir, 'proposals.json' );
	if ( ! fs.existsSync( file ) ) {
		o.err( `no ${ file }\n` );
		return 2;
	}
	const frozen = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( frozen.header.client !== client ) {
		o.err( `${ file } is the freeze of ${ frozen.header.client }, not ${ client }\n` );
		return 2;
	}
	if ( flags.includes( '--no-built' ) !== frozen.header.noBuilt && flags.length ) {
		o.err( `the freeze was taken ${ frozen.header.noBuilt ? 'with' : 'without' } --no-built; diff proposes as the freeze did\n` );
		return 2;
	}
	const after = await o.propose( client, ! frozen.header.noBuilt, o.repo );
	const d = diffProposals( frozen.surfaces, after );
	report( client, d, frozen.header.counts.rows ).forEach( ( l ) => o.out( `${ l }\n` ) );
	return d.changed.length + d.added.length + d.removed.length ? 1 : 0;
}

// argv: the arguments after the script. o: { repo, propose, now, out, err } (all defaulted). Returns the exit code.
export async function main( argv, o = {} ) {
	const opts = { repo: REPO, propose: proposeClient, now: () => new Date(), out: ( s ) => process.stdout.write( s ), err: ( s ) => process.stderr.write( s ), ...o };
	const [ cmd, ...rest ] = argv;
	const flags = rest.filter( ( x ) => x.startsWith( '--' ) );
	const args = rest.filter( ( x ) => ! x.startsWith( '--' ) );
	if ( flags.some( ( f ) => '--no-built' !== f ) ) {
		opts.err( USAGE );
		return 2;
	}
	try {
		if ( 'snapshot' === cmd && 1 === args.length && CLIENT.test( args[ 0 ] ) ) {
			const noBuilt = flags.includes( '--no-built' );
			const surfaces = await opts.propose( args[ 0 ], ! noBuilt, opts.repo );
			const now = opts.now();
			const header = { client: args[ 0 ], commit: commitOf( opts.repo ), date: now.toISOString(), noBuilt, counts: { surfaces: Object.keys( surfaces ).length, rows: countRows( surfaces ) } };
			const dir = path.join( opts.repo, 'sites', args[ 0 ], 'build', 'qa', 'freeze', `${ stampOf( now ) }${ noBuilt ? '-no-built' : '' }` );
			fs.mkdirSync( dir, { recursive: true } );
			fs.writeFileSync( path.join( dir, 'proposals.json' ), `${ JSON.stringify( { header, surfaces }, null, '\t' ) }\n` );
			opts.out( `${ args[ 0 ] }: froze ${ header.counts.surfaces } surfaces, ${ header.counts.rows } rows${ noBuilt ? ' (--no-built)' : '' } in ${ path.relative( opts.repo, dir ) }\n` );
			return 0;
		}
		if ( 'diff' === cmd && 2 === args.length && CLIENT.test( args[ 0 ] ) ) {
			return await diffOne( args[ 0 ], path.resolve( opts.repo, args[ 1 ] ), flags, opts );
		}
		if ( 'diff-all' === cmd && 1 === args.length && ! flags.length && /^\d{4}-\d{2}-\d{2}/.test( args[ 0 ] ) ) {
			const sites = path.join( opts.repo, 'sites' );
			let worst = 0;
			let found = 0;
			for ( const client of fs.existsSync( sites ) ? fs.readdirSync( sites ).sort() : [] ) {
				const root = path.join( sites, client, 'build', 'qa', 'freeze' );
				for ( const name of fs.existsSync( root ) ? fs.readdirSync( root ).sort().filter( ( n ) => n.startsWith( args[ 0 ] ) ) : [] ) {
					found++;
					worst = Math.max( worst, await diffOne( client, path.join( root, name ), [], opts ) );
				}
			}
			if ( ! found ) {
				opts.err( `no client has a freeze starting ${ args[ 0 ] }\n` );
				return 2;
			}
			return worst;
		}
	} catch ( e ) {
		opts.err( `${ e.message }\n` );
		return 2;
	}
	opts.err( USAGE );
	return 2;
}

if ( import.meta.url === pathToFileURL( process.argv[ 1 ] || '' ).href ) {
	process.exitCode = await main( process.argv.slice( 2 ) );
}
