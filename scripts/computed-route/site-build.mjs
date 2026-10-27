// The site build (Spec 48 FR-48-55): every row of the confirmed sites/<client>/build/page-map.json made on one site
// once, with its menus, front and posts page, permalinks and active header, drawer and footer.
//   node site-build.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--templates-only] [--only <row key,...>] [--repo <root>]
//   node site-build.mjs <client> --promote-options <Fill run folder or its site-options.json> [--repo <root>]
//   node site-build.mjs <client> --site <site> --flow-links [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --catalogue [--apply] [--repo <root>]
// Without --apply it prints the plan and the before-and-after table of every option it would change, and writes
// nothing. With --apply it runs the four phases in order (posts, menus, layout, site), reading the site again before
// each, and writes each new post id into its page-map row as it is made. The site the ids were written for is recorded
// beside the map (page-map.site); a run against another site that shares the client plans from the map without those ids
// (a post carrying a row key is adopted) and its write-back replaces them. The site phase also sets the site options the
// draft's behaviours need (the route fade) from sites/<client>/build/site-options.json, which --promote-options fills from a
// Fill run (lib/site-build-options.mjs). --flow-links runs only the product flow links (lib/site-build-flow-links.mjs):
// each published product covered by a page-map product row with `opensFlow` gets that flow's slug as `_sgs_choice_flow`
// (a dry run without --apply), reading the page map and writing nothing else, the map included; a whole build (neither
// --templates-only nor --only) runs the same step after its four phases. --catalogue runs only the draft catalogue
// (lib/site-build-catalogue.mjs, FR-48-92): every product of sites/<client>/build/catalogue.json planned by SKU (create,
// complete, exists, or left when it is a fixture), made or completed with --apply, read back, and its product id and
// permalink recorded in catalogue.json's `sites.<site>`; the page map is neither read nor written.
// Exit 0 done, 1 failure or a stopped run, 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wpCommand, wpEvalRunner } from './lib/calibration-refs.mjs';
import { readIdsSite, readPageMap, rowsForSite, writeIdsSite, writeMenuMap, writePageMap } from './lib/site-build-map.mjs';
import { readState } from './lib/site-build-state.mjs';
import { readLinkTextReport } from './lib/site-build-labels.mjs';
import { PHASES, planBuild, tally } from './lib/site-build-plan.mjs';
import { promoteSiteOptions, withSiteOptions } from './lib/site-build-options.mjs';
import { applyPhase, wpBuildPage } from './lib/site-build-apply.mjs';
import { openDetachedSession, readEnv } from './lib/wp-run-session.mjs';
import { runFlowLinks } from './lib/site-build-flow-links.mjs';
import { runCatalogue } from './lib/site-build-catalogue.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
const promote = opt( '--promote-options' );
if ( ! client || ( ! site && ! promote ) ) {
	console.error( 'usage: node site-build.mjs <client> --site <site> [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --flow-links [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --promote-options <Fill run folder or file> [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --catalogue [--apply] [--repo <root>]' );
	process.exit( 2 );
}
const repo = opt( '--repo' ) || path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../..' );
if ( promote ) {
	try {
		const r = promoteSiteOptions( { repo, client, from: promote } );
		console.log( `${ r.changed ? 'wrote' : 'unchanged' } ${ path.relative( repo, r.file ) }: ${ Object.entries( r.options ).map( ( [ n, o ] ) => `${ n } ${ JSON.stringify( o.value ) }` ).join( '; ' ) }` );
		process.exit( 0 );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
const mapFile = path.join( repo, 'sites', client, 'build', 'page-map.json' );
const apply = args.includes( '--apply' );
// The site's calibration target: a local mirror's names its WSL docroot (`pluginDir`), so its wp-cli runs there instead
// of over SSH; a site with no target entry runs over SSH.
const targetsFile = path.join( repo, 'scripts', 'computed-route', 'calibration-targets.json' );
const target = ( fs.existsSync( targetsFile ) ? JSON.parse( fs.readFileSync( targetsFile, 'utf8' ) )[ site ] : null ) || {};
if ( args.includes( '--catalogue' ) ) {
	try {
		process.exit( runCatalogue( { repo, client, site, runPhp: wpEvalRunner( target, site, repo ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--flow-links' ) ) {
	try {
		process.exit( runFlowLinks( { rows: readPageMap( mapFile ), runPhp: wpEvalRunner( target, site, repo ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
// --templates-only plans and runs the template copies alone (FR-48-56), leaving every post, menu and option as it is.
const templatesOnly = args.includes( '--templates-only' );
// --only <row keys> plans and runs those rows' own steps alone (post:<slug>, page:<slug>), leaving every other post, menu,
// option and template copy as it is.
const onlyRows = opt( '--only' ) ? opt( '--only' ).split( ',' ).filter( Boolean ) : null;

const print = ( plan ) => {
	plan.notes.forEach( ( n ) => console.log( `note: ${ n }` ) );
	for ( const phase of PHASES ) {
		const mine = plan.actions.filter( ( a ) => a.phase === phase );
		if ( mine.length ) {
			console.log( `${ phase }:` );
			mine.forEach( ( a ) => console.log( `  ${ a.say }` ) );
		}
	}
	if ( plan.uncopied?.length ) {
		console.log( 'templates the site serves with no copy of its own (FR-48-56):' );
		plan.uncopied.forEach( ( u ) => console.log( `  ${ u.slug }: ${ u.why }` ) );
	}
	if ( plan.options.length ) {
		console.log( 'option | before | after' );
		plan.options.forEach( ( o ) => console.log( `${ o.name } | ${ o.before } | ${ o.after }` ) );
	}
};

try {
	// The rows as this site sees them: ids written for another site name nothing here.
	const original = rowsForSite( readPageMap( mapFile ), readIdsSite( mapFile ), site );
	const runPhp = wpEvalRunner( target, site, repo );
	const wp = wpCommand( target, site, repo );
	const ids = {};
	let rows = original;
	const plan = () => {
		const link = readLinkTextReport( { repo, client } );
		const p = planBuild( { rows, state: readState( runPhp, rows ), repo, client, linkText: link.text } );
		p.notes.push( ...link.conflicts );
		if ( p.problems.length ) {
			p.problems.forEach( ( m ) => console.error( `STOP ${ m }` ) );
			throw new Error( `${ p.problems.length } problem(s); nothing was written` );
		}
		const all = withSiteOptions( p, { repo, client, runPhp } );
		if ( templatesOnly ) {
			return { ...all, actions: all.actions.filter( ( a ) => 'template' === a.type ), options: all.options.filter( ( o ) => o.name.startsWith( 'sgs_site_build_templates[' ) ) };
		}
		return onlyRows ? { ...all, actions: all.actions.filter( ( a ) => 'template' !== a.type && onlyRows.includes( a.key ) ), options: [] } : all;
	};
	const first = plan();
	print( first );
	const counts = tally( first.actions );
	if ( ! apply ) {
		console.log( `${ counts.creates } to create, ${ counts.changes } to change, ${ counts.adopts } to adopt (dry run: re-run with --apply)` );
		process.exit( templatesOnly || onlyRows ? 0 : runFlowLinks( { rows, runPhp, apply: false, pending: true } ) );
	}
	const build = wpBuildPage( repo, site );
	// One logged-in browser for every page the run builds, as its own process because the builds below run synchronously
	// (lib/wp-run-session.mjs::openDetachedSession): each wp-build-page.js child attaches through SGS_CDP_URL instead of
	// launching and logging in on its own.
	const session = await openDetachedSession( site, readEnv( path.join( '.claude', 'secrets', `${ site }.env` ), site.toUpperCase().replace( /[^A-Z0-9]/g, '' ), repo ) );
	writeIdsSite( mapFile, site );
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
	await session.close();
	const left = tally( plan().actions );
	console.log( `${ ran } step(s) run (${ counts.creates } to create, ${ counts.changes } to change, ${ counts.adopts } to adopt when the run began); page map ${ path.relative( repo, mapFile ) }` );
	if ( left.creates || left.changes || left.adopts ) {
		throw new Error( `a fresh read still plans ${ left.creates } create(s) and ${ left.changes } change(s)` );
	}
	console.log( 'a fresh read plans 0 creates and 0 changes' );
	writeMenuMap( path.join( repo, 'sites', client, 'build', 'menu-map.json' ), site, readState( runPhp, rows ).menus );
	// The product flow links last, once the posts phase has made the flow posts they name.
	if ( ! templatesOnly && ! onlyRows && 0 !== runFlowLinks( { rows, runPhp, apply: true } ) ) {
		throw new Error( 'the product flow links did not complete' );
	}
} catch ( e ) {
	console.error( `FAILED: ${ e.message }` );
	process.exit( 1 );
}
