// The site build (Spec 48 FR-48-55): every row of the confirmed sites/<client>/build/page-map.json made on one site
// once, with its menus, front and posts page, permalinks and active header, drawer and footer.
//   node site-build.mjs <client> --site <secrets name, e.g. indus-test> [--apply] [--templates-only] [--only <row key,...>] [--repo <root>]
//   node site-build.mjs <client> --promote-options <Fill run folder or its site-options.json> [--repo <root>]
//   node site-build.mjs <client> --site <site> --flow-links [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --catalogue [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --store-visible [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --account-registration [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --menus [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --shop-options [--apply] [--repo <root>]
//   node site-build.mjs <client> --site <site> --checkout-content [--apply] [--repo <root>]
//   node site-build.mjs <client> --checkout-content --content <saved checkout page markup> [--repo <root>]
// Without --apply it prints the plan and the before-and-after table of every option it would change, and writes
// nothing. With --apply it runs the four phases in order (posts, menus, layout, site), reading the site again before
// each, and writes each new post id into its page-map row as it is made. The site the ids were written for is recorded
// beside the map (page-map.site); a run against another site that shares the client plans from the map without those ids
// (a post carrying a row key is adopted) and its write-back replaces them. The site phase also sets the site options the
// draft's behaviours need (the route fade) from sites/<client>/build/site-options.json, which --promote-options fills from a
// Fill run (lib/site-build-options.mjs). --flow-links runs only the product flow links (lib/site-build-flow-links.mjs):
// each published product covered by a page-map product row with `opensFlow` gets that flow's slug as `_sgs_choice_flow`
// (a dry run without --apply), reading the page map and writing nothing else, the map included; a whole build (neither
// --templates-only nor --only) runs the same step after its four phases. Both runs then set each linked flow's `openerLabel` from the
// words of the draft's control that opens it (lib/site-build-flow-opener-label.mjs), writing nothing where the rows disagree. --catalogue runs only the draft catalogue
// (lib/site-build-catalogue.mjs, FR-48-92): every product of sites/<client>/build/catalogue.json planned by SKU (create,
// complete, exists, or left when it is a fixture), made or completed with --apply, read back, and its product id and
// permalink recorded in catalogue.json's `sites.<site>`; the page map is neither read nor written. --store-visible runs
// only WooCommerce's coming-soon switch (lib/site-build-store-visible.mjs): for a shop client on a site reading
// `woocommerce_coming_soon` = `yes` it plans `no`, writes and reads it back with --apply, and touches nothing else (the
// page map is read to tell a shop client and never written); a whole build plans the same change in its site phase.
// --menus runs only the menus and their mega-menu bindings (lib/site-build-menus-step.mjs): the menu, item and theme-location steps, each
// mega panel's section page, and the removal of an item a mega item took over, on a site that is already built; it
// reads the page map and never writes it (it makes no post), and records the site's menu ids in menu-map.json.
// --shop-options runs only the theme's shop options (lib/site-build-shop-options.mjs, data/shop-options.json): each sgs_shop_*
// theme mod the shop draft decides (the count's words, the sort menu, the filter panel and drawer, the rail's drawer width from
// the filled tree's ownAlternativeBelow mark), planned against the site's values, written with --apply and read back; every option
// it cannot decide is printed with the reason. A whole build runs the same step after its phases.
// --checkout-content runs only the checkout page's own words, steps and extra blocks (lib/site-build-checkout-content.mjs): what the
// checkout draft draws (step titles and numbers, the place-order button's words, the summary's words, notes, the gift step, the
// pay-later line, no order note) written onto the checkout page's WooCommerce block tree, and WooCommerce's account-at-checkout and
// sign-in reminder options turned on where the draft draws them; written and read back with --apply. --content plans against a
// saved page's markup instead of the site and prints the planned tree (no site is read or written). A whole build runs it last.
// A `product` row's menu entry becomes a custom link item (the draft's link text, the product's recorded permalink and the
// draft href's own query) once --catalogue has built the products on the site (lib/site-build-menu-links.mjs); until then it
// is a note naming that step, so the order is --catalogue --apply, then the whole build or --menus (the foundation command runs them in that order).
// Exit 0 done, 1 failure or a stopped run, 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wpCommand, wpEvalRunner } from './lib/calibration-refs.mjs';
import { idsProvisional, readIdsSite, readPageMap, rowsForSite, writeIdsSite, writeMenuMap, writePageMap } from './lib/site-build-map.mjs';
import { readState } from './lib/site-build-state.mjs';
import { readLinkTextReport, readSurfaces } from './lib/site-build-labels.mjs';
import { PHASES, planBuild, tally } from './lib/site-build-plan.mjs';
import { promoteSiteOptions, withSiteOptions } from './lib/site-build-options.mjs';
import { applyPhase, wpBuildPage } from './lib/site-build-apply.mjs';
import { openDetachedSession, readEnv } from './lib/wp-run-session.mjs';
import { assertScratchRunPlace, assertUnprotected, readTargets, secretsOf, secretsPath } from './lib/site-targets.mjs';
import { runFlowLinks } from './lib/site-build-flow-links.mjs';
import { openerControlsOf, runOpenerLabels } from './lib/site-build-flow-opener-label.mjs';
import { flowProductIdsFor } from './lib/site-build-flow-product.mjs';
import { runCatalogue } from './lib/site-build-catalogue.mjs';
import { runStoreVisible } from './lib/site-build-store-visible.mjs';
import { runAccountRegistration } from './lib/site-build-account-registration.mjs';
import { runMenus, supersededItems } from './lib/site-build-menus-step.mjs';
import { menuLinksOf } from './lib/site-build-menu-links.mjs';
import { runShopOptions } from './lib/site-build-shop-options.mjs';
import { runCheckoutContent } from './lib/site-build-checkout-content.mjs';

const args = process.argv.slice( 2 );
const opt = ( name ) => ( args.includes( name ) ? args[ args.indexOf( name ) + 1 ] : null );
const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && ! args[ i - 1 ]?.startsWith( '--' ) );
const site = opt( '--site' );
const promote = opt( '--promote-options' );
const contentFile = opt( '--content' );
if ( ! client || ( ! site && ! promote && ! contentFile ) ) {
	console.error( 'usage: node site-build.mjs <client> --site <site> [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --flow-links [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --promote-options <Fill run folder or file> [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --catalogue [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --store-visible [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --account-registration [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --menus [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --shop-options [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --site <site> --checkout-content [--apply] [--repo <root>]' );
	console.error( '       node site-build.mjs <client> --checkout-content --content <saved checkout page markup> [--repo <root>]' );
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
if ( contentFile ) {
	try {
		process.exit( runCheckoutContent( { repo, client, content: fs.readFileSync( path.resolve( contentFile ), 'utf8' ) } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
const mapFile = path.join( repo, 'sites', client, 'build', 'page-map.json' );
const apply = args.includes( '--apply' );
// The site's calibration target: a local mirror's names its WSL docroot (`pluginDir`), so its wp-cli runs there instead
// of over SSH; a site with no target entry runs over SSH.
const targets = readTargets( { repo } );
const target = targets[ site ] || {};
// A run that writes refuses a protected site, and a scratch copy's run refuses the main checkout (it writes page-map.json ids,
// page-map.site, menu-map.json and catalogue.json under sites/<client>/build).
if ( apply ) {
	try {
		assertUnprotected( site, targets );
		assertScratchRunPlace( site, repo );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 2 );
	}
}
if ( args.includes( '--catalogue' ) ) {
	try {
		process.exit( runCatalogue( { repo, client, site, runPhp: wpEvalRunner( target, site, repo, { readOnly: ! apply } ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--store-visible' ) ) {
	try {
		process.exit( runStoreVisible( { rows: readPageMap( mapFile ), runPhp: wpEvalRunner( target, site, repo, { readOnly: ! apply } ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--account-registration' ) ) {
	try {
		process.exit( runAccountRegistration( { rows: readPageMap( mapFile ), repo, client, runPhp: wpEvalRunner( target, site, repo, { readOnly: ! apply } ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--shop-options' ) ) {
	try {
		process.exit( runShopOptions( { repo, client, runPhp: wpEvalRunner( target, site, repo, { readOnly: ! apply } ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--checkout-content' ) ) {
	try {
		process.exit( runCheckoutContent( { repo, client, runPhp: wpEvalRunner( target, site, repo, { readOnly: ! apply } ), apply } ) );
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--flow-links' ) ) {
	try {
		{
			const rows = readPageMap( mapFile );
			const runPhp = wpEvalRunner( target, site, repo, { readOnly: ! apply } );
			process.exit( runFlowLinks( { rows, runPhp, apply } ) || runOpenerLabels( { rows, controlsOf: openerControlsOf( { repo, client } ), runPhp, apply } ) );
		}
	} catch ( e ) {
		console.error( `FAILED: ${ e.message }` );
		process.exit( 1 );
	}
}
if ( args.includes( '--menus' ) ) {
	try {
		const rows = rowsForSite( readPageMap( mapFile ), readIdsSite( mapFile ), site, targets );
		const provisionalIds = idsProvisional( readIdsSite( mapFile ), site, targets );
		const runPhp = wpEvalRunner( target, site, repo, { readOnly: ! apply } );
		const planFor = () => {
			const link = readLinkTextReport( { repo, client } );
			const state = readState( runPhp, rows );
			const menuLinks = menuLinksOf( { repo, client, site, rows } );
			const plan = planBuild( { rows, state, repo, client, linkText: link.text, menuLinks, flowProducts: flowProductIdsFor( { repo, client, site, rows } ).ids, provisionalIds } );
			plan.notes.push( ...link.conflicts );
			return { plan, superseded: supersededItems( rows, state, link.text, readSurfaces( repo, client ), menuLinks ), state };
		};
		const code = runMenus( { planFor, apply, wp: wpCommand( target, site, repo, { readOnly: ! apply } ), applyPhase } );
		if ( 0 === code && apply ) {
			writeMenuMap( path.join( repo, 'sites', client, 'build', 'menu-map.json' ), site, readState( runPhp, rows ).menus );
		}
		process.exit( code );
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
	const original = rowsForSite( readPageMap( mapFile ), readIdsSite( mapFile ), site, targets );
	const provisionalIds = idsProvisional( readIdsSite( mapFile ), site, targets );
	const runPhp = wpEvalRunner( target, site, repo, { readOnly: ! apply } );
	const wp = wpCommand( target, site, repo, { readOnly: ! apply } );
	const ids = {};
	let rows = original;
	const plan = () => {
		const link = readLinkTextReport( { repo, client } );
		const p = planBuild( { rows, state: readState( runPhp, rows ), repo, client, linkText: link.text, menuLinks: menuLinksOf( { repo, client, site, rows } ), flowProducts: flowProductIdsFor( { repo, client, site, rows } ).ids, provisionalIds } );
		p.notes.push( ...link.conflicts );
		if ( p.problems.length ) {
			p.problems.forEach( ( m ) => console.error( `STOP ${ m }` ) );
			throw new Error( `${ p.problems.length } problem(s); nothing was written` );
		}
		const all = withSiteOptions( p, { repo, client, runPhp } );
		if ( templatesOnly ) {
			return { ...all, actions: all.actions.filter( ( a ) => [ 'template', 'template-remove' ].includes( a.type ) ), options: all.options.filter( ( o ) => o.name.startsWith( 'sgs_site_build_templates[' ) ) };
		}
		return onlyRows ? { ...all, actions: all.actions.filter( ( a ) => ! [ 'template', 'template-remove' ].includes( a.type ) && onlyRows.includes( a.key ) ), options: [] } : all;
	};
	const first = plan();
	print( first );
	const counts = tally( first.actions );
	if ( ! apply ) {
		console.log( `${ counts.creates } to create, ${ counts.changes } to change (${ first.actions.filter( ( a ) => 'template-remove' === a.type ).length } of them saved templates removed), ${ counts.adopts } to adopt (dry run: re-run with --apply)` );
		process.exit( templatesOnly || onlyRows ? 0 : runFlowLinks( { rows, runPhp, apply: false, pending: true } ) || runOpenerLabels( { rows, controlsOf: openerControlsOf( { repo, client } ), runPhp, apply: false, pending: true } ) || runAccountRegistration( { rows, repo, client, runPhp, apply: false } ) || runShopOptions( { repo, client, runPhp, apply: false } ) || runCheckoutContent( { repo, client, runPhp, apply: false } ) );
	}
	const build = wpBuildPage( repo, site, targets );
	// One logged-in browser for every page the run builds, as its own process because the builds below run synchronously
	// (lib/wp-run-session.mjs::openDetachedSession): each wp-build-page.js child attaches through SGS_CDP_URL instead of
	// launching and logging in on its own.
	const session = await openDetachedSession( site, readEnv( secretsPath( secretsOf( site, targets ).envFile, repo ), secretsOf( site, targets ).envKey ) );
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
	if ( ! templatesOnly && ! onlyRows && 0 !== ( runFlowLinks( { rows, runPhp, apply: true } ) || runOpenerLabels( { rows, controlsOf: openerControlsOf( { repo, client } ), runPhp, apply: true } ) ) ) {
		throw new Error( 'the product flow links or the opener labels did not complete' );
	}
	// The account page's registration switch, once the page map's account row is built (lib/site-build-account-registration.mjs).
	if ( ! templatesOnly && ! onlyRows && 0 !== runAccountRegistration( { rows, repo, client, runPhp, apply: true } ) ) {
		throw new Error( 'the account registration switch did not complete' );
	}
	// The theme's shop options, from the shop surface's artefacts (lib/site-build-shop-options.mjs).
	if ( ! templatesOnly && ! onlyRows && 0 !== runShopOptions( { repo, client, runPhp, apply: true } ) ) {
		throw new Error( 'the shop options did not complete' );
	}
	// The checkout page's own words, steps and extra blocks, once the posts phase has the checkout page (lib/site-build-checkout-content.mjs).
	if ( ! templatesOnly && ! onlyRows && 0 !== runCheckoutContent( { repo, client, runPhp, apply: true } ) ) {
		throw new Error( 'the checkout content did not complete' );
	}
} catch ( e ) {
	console.error( `FAILED: ${ e.message }` );
	process.exit( 1 );
}
