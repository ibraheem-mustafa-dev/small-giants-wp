// The site build (Spec 48 FR-48-55): every row of the confirmed sites/<client>/build/page-map.json made on one site
// once, with its menus, front and posts page, permalinks and active header, drawer and footer.
//   node site-build.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--repo <root>]
// Without --apply it prints the plan and the before-and-after table of every option it would change, and writes
// nothing. With --apply it runs the four phases in order (posts, menus, layout, site), reading the site again before
// each, and writes each new post id into its page-map row as it is made. Exit 0 done, 1 failure or a stopped run, 2 usage.
import path from 'path';
import { fileURLToPath } from 'url';
import { wpCommand, wpEvalRunner } from './lib/calibration-refs.mjs';
import { readPageMap, writePageMap } from './lib/site-build-map.mjs';
import { readState } from './lib/site-build-state.mjs';
import { PHASES, planBuild, tally } from './lib/site-build-plan.mjs';
import { applyPhase, wpBuildPage } from './lib/site-build-apply.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
if ( ! client || ! site ) {
	console.error( 'usage: node site-build.mjs <client> --site <site> [--apply] [--repo <root>]' );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
const mapFile = path.join( repo, 'sites', client, 'build', 'page-map.json' );
const apply = args.includes( '--apply' );

const print = ( plan ) => {
	plan.notes.forEach( ( n ) => console.log( `note: ${ n }` ) );
	for ( const phase of PHASES ) {
		const mine = plan.actions.filter( ( a ) => a.phase === phase );
		if ( mine.length ) {
			console.log( `${ phase }:` );
			mine.forEach( ( a ) => console.log( `  ${ a.say }` ) );
		}
	}
	if ( plan.options.length ) {
		console.log( 'option | before | after' );
		plan.options.forEach( ( o ) => console.log( `${ o.name } | ${ o.before } | ${ o.after }` ) );
	}
};

try {
	const original = readPageMap( mapFile );
	const runPhp = wpEvalRunner( {}, site, repo );
	const wp = wpCommand( {}, site, repo );
	const ids = {};
	let rows = original;
	const plan = () => {
		const p = planBuild( { rows, state: readState( runPhp, rows ), repo, client } );
		if ( p.problems.length ) {
			p.problems.forEach( ( m ) => console.error( `STOP ${ m }` ) );
			throw new Error( `${ p.problems.length } problem(s); nothing was written` );
		}
		return p;
	};
	const first = plan();
	print( first );
	const counts = tally( first.actions );
	if ( ! apply ) {
		console.log( `${ counts.creates } to create, ${ counts.changes } to change, ${ counts.adopts } to adopt (dry run: re-run with --apply)` );
		process.exit( 0 );
	}
	const build = wpBuildPage( repo, site );
	const onId = ( key, id ) => {
		ids[ key ] = id;
		rows = writePageMap( mapFile, original, ids );
	};
	const refs = {};
	let ran = 0;
	for ( const phase of PHASES ) {
		const p = 'posts' === phase ? first : plan();
		console.log( `${ phase }: running ${ p.actions.filter( ( a ) => a.phase === phase ).length } step(s)` );
		ran += applyPhase( p.actions, phase, { wp, build, onId, log: console.log, refs } );
	}
	const left = tally( plan().actions );
	console.log( `${ ran } step(s) run (${ counts.creates } to create, ${ counts.changes } to change, ${ counts.adopts } to adopt when the run began); page map ${ path.relative( repo, mapFile ) }` );
	if ( left.creates || left.changes || left.adopts ) {
		throw new Error( `a fresh read still plans ${ left.creates } create(s) and ${ left.changes } change(s)` );
	}
	console.log( 'a fresh read plans 0 creates and 0 changes' );
} catch ( e ) {
	console.error( `FAILED: ${ e.message }` );
	process.exit( 1 );
}
