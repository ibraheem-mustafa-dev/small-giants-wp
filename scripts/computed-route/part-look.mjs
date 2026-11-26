#!/usr/bin/env node
// Reads a client's shop look from its draft and says which settings of the Cart, Checkout, `sgs/account` and `sgs/cart` blocks it
// would write (template-rework Task 4, Spec 48 FR-48-87).
//
//   node scripts/computed-route/part-look.mjs --client <slug> [--surface cart|checkout|my-account|header|product|shop|shop-chips|shop-sort|my-account-in|confirmation] [--site <scratch copy>]
//                                             [--compare] [--write [--only <attr,attr>] [--dry-run]] [--out <dir>] [--headed]
//
// It serves the client's draft itself, opens each surface at 1440, 768 and 375, locates each part of the block by the structure
// in data/part-locators.json, reads its computed look and pairs it with the settings the framework database holds for that part
// (lib/fill-part-look.mjs). It writes report.json and report.md under sites/<client>/build/qa/part-look/<timestamp>/.
//   --compare  reads the saved block settings of each surface's post on --site (read-only) and classes every setting as equal,
//              differs, hand-set only (with the reason) or route only, and counts the hand-written Custom CSS.
//   --write    patches the settings into those posts with scripts/local-wp/patch-block-attrs.py. It refuses any site that is not a
//              `local-mediatest-*` scratch copy, a protected target, or a run under SGS_NO_SITE. --only limits the write to the named settings.
//   --verify   after the writes, opens the scratch copy's own page with the basket filled (--seed <seed.php output>; the product surface is
//              read on a real product instead, linked to a choice flow where the draft draws the flow's opener), reads each paired part on the
//              live page at the three widths, writes the settings whose live value differs from the draft's (and takes back a write that changed
//              nothing) and reports what still differs. It needs a `local-mediatest-*` --site; set SGS_SECRETS_ROOT in a worktree.
//              Every part with settings it did not compare (no locator, no draft element, no live selector or element, no look read
//              on both sides) is listed as not verified, first, and the surface is a full match only when none is and nothing differs.
//              --strict exits 1 when any verified surface is not a full match (by default the verdict is printed and the run passes).
//              A surface whose draft located parts and whose live read compared none of them fails: the report is written, each reason is
//              printed as VERIFY FAILED and the exit code is 1. A header read whose basket panel stays shut throws (exit 2).
// A locator group's `mustLocate` part (the basket drawer's panel) the draft read does not locate refuses the surface (REFUSED, exit 1):
// every other part is read from it, so the read would pair nothing.
//   my-account-in  the account's signed-in views (orders, an order's page, addresses, details): the draft is signed in on its own
//              sign-in page and read view by view (lib/part-look-signed-in.mjs); --verify reads the copy signed in as --login <user:pass>
//              (the seeded customer) on every view its menu links to and the seed's order page.
// A client may name a surface's opening steps in sites/<client>/build/part-look.json: { surfaces: { <surface>: { file, route, init } } }.
// A one-file draft (its pages are its logic's own state) opens each page surface only by the route named there (my-account-in by
// my-account's, its sign-in route): a surface with none is refused (REFUSED, exit 1), never read from the draft's first page. A
// locator's linksTo also takes an element whose click handler goes to that role's page (the draft's routing links).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './lib/db.mjs';
import { buildLook, lookRowsOf, tableSelector } from './lib/fill-part-look.mjs';
import { compareSettings, faultsOf } from './lib/part-look-compare.mjs';
import { REPO, assertMayWrite, blockRows, customCssOf, liveProductPath, patchBlock, readParts, readSavedBlock, templateIdOf, unlocatedParts } from './lib/part-look-run.mjs';
import { draftProductSlugs } from './lib/template-live-address.mjs';
import { draftLinksFor } from './lib/draft-link.mjs';
import { signInFilesOf } from './lib/skeleton-commerce-region.mjs';
import { reportMarkdown, totalsOf } from './lib/part-look-report.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { applyBuiltinButtons, declaredButtons } from './lib/fill-builtin-button.mjs';
import { OPENER_PART, flowControls, openerShopParts, orderWrite } from './lib/part-look-controls.mjs';
import { blockElementsOf, liveSelectorsFor, readLiveSurface, seedOf, shootLiveSurface, verifySurface } from './lib/part-look-verify.mjs';
import { READ_PROPS } from './lib/fill-part-look.mjs';
import { evaluateModes } from './lib/part-look-modes.mjs';
import { accountViewModes } from './lib/part-look-account-views.mjs';
import { loadDraft } from './lib/intake-ast.mjs';
import { ACCOUNT_PARTS_FILE, phpListKeys } from './lib/template-piece-account.mjs';
import { readTargets, siteUrl, targetOf } from './lib/site-targets.mjs';
import { readLiveSignedIn, readSignedInParts, shootLiveSignedIn, signedInSeedOf } from './lib/part-look-signed-in.mjs';
import { chooseEmptied, chooseOpenings, documentedOpenings, handoffRecords, pinsOf, probeOpenings, visitorAtEveryWidth, visitorOpening } from './lib/part-look-opening.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SURFACES = [ 'cart', 'checkout', 'my-account', 'header', 'product', 'shop', 'shop-chips', 'shop-sort', 'my-account-in', 'confirmation' ];
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const SELECTOR_TABLE = path.join( REPO, 'plugins', 'sgs-blocks', 'includes', 'woocommerce', 'commerce-look', 'selectors.json' );

// The draft file each role lives in: the cart and checkout page rows of the page map, the account surface's own file and the
// sign-in page its WooCommerce parts name, or the sign-in page row of its own (lib/skeleton-commerce-region.mjs::signInFilesOf).
export function pagesOf( { rows, surfaces } ) {
	const route = ( template ) => rows.find( ( r ) => 'page' === r.postType && template === r.template )?.route ?? null;
	const account = surfaces[ 'my-account' ]?.draftIndex ?? null;
	const accountRow = rows.find( ( r ) => r.route === account );
	const signin = accountRow ? signInFilesOf( accountRow, rows )[ 0 ] ?? null : null;
	return Object.fromEntries( Object.entries( { cart: route( 'cart' ), checkout: route( 'checkout' ), account, signin } ).filter( ( [ , v ] ) => v ) );
}

// The draft route a surface opens by when the draft is one file whose pages are its logic's own state (`shop`, `checkout`), or
// null: a page file (`Shop.dc.html`), a route every page shares (`*`) or none.
export const logicRouteOf = ( route ) => ( route && '*' !== route && ! /\.html\b/i.test( String( route ) ) ? String( route ) : null );

// A surface's draft read, guarded: with derive (Fill's read of several surfaces at once) a read that throws refuses its own surface
// (a refusal line, and null) and the run goes on to the others; without it the error stops the run as before.
export function guardRead( { derive, surface, refusals } ) {
	return async ( fn ) => {
		try {
			return await fn();
		} catch ( e ) {
			if ( ! derive ) {
				throw e;
			}
			refusals.push( `${ surface }: the draft read failed, so none of its settings is decided: ${ String( e.message || e ).split( '\n' )[ 0 ] }` );
			return null;
		}
	};
}

// A surface's opening steps: the client's own (`given`, its part-look.json entry), and with `derive` a one-file draft's surface opens
// on the route intake read for it (`draftRoute`), as a client file would name it. A route the client names, and a surface with no
// draft page, keep what they have.
export function derivedConfig( { derive, given = {}, entry = {}, draftRoute = null } ) {
	const route = derive && ! entry.noDraft && ! given.route ? logicRouteOf( draftRoute ) : null;
	return route ? { ...given, route } : given;
}

// Why a surface cannot be read, or null. A one-file draft opens on its first page, so a surface whose draft route is a logic route is
// read only through a route the client's part-look.json names for it (`cfg.route`); without one, every part would be read from the
// wrong page.
export function refusalOf( { surface, draftRoute, cfg } ) {
	const route = logicRouteOf( draftRoute );
	if ( ! route || cfg?.route ) {
		return null;
	}
	return `${ surface }: the draft is one file whose pages are its logic's own state and part-look.json names no route for this surface, so the draft would open on its first page and not on "${ route }" (add "route": "${ route }" to its entry)`;
}

// The draft routes of each page role a locator's linksTo names (cart, checkout, account, signin), every route that reaches the same
// page-map row included (a signed-out and a signed-in account share one). `routeRow` maps a draft route to its row
// (lib/draft-link.mjs::linkContext); `files` are pagesOf's files; `accountRoute` the account surface's own route in a one-file draft.
export function roleRoutesOf( { rows, routeRow = new Map(), files = {}, accountRoute = null } ) {
	const route = ( template ) => rows.find( ( r ) => 'page' === r.postType && template === r.template )?.route ?? null;
	const base = { cart: route( 'cart' ), checkout: route( 'checkout' ), account: accountRoute ?? files.account ?? null, signin: accountRoute ?? files.signin ?? null };
	const out = {};
	for ( const [ role, at ] of Object.entries( base ) ) {
		if ( ! at ) {
			continue;
		}
		const row = routeRow.get( at );
		out[ role ] = row ? [ ...routeRow ].filter( ( [ , r ] ) => r === row ).map( ( [ k ] ) => k ) : [ at ];
	}
	return out;
}

// The click handlers that take a visitor to each role's page: { role: [ { dc, handler } ] }, from the draft's routing links
// (lib/draft-link.mjs::linkContext's goRoutes, `<file>\0<handler>` to the routes the handler reaches). A handler counts for a role when
// every route it reaches is one of the role's; `dc` is the component the handler's file holds.
export function routeHandlersOf( { roleRoutes, goRoutes = new Map() } ) {
	const out = {};
	for ( const [ role, routes ] of Object.entries( roleRoutes ) ) {
		const list = [];
		for ( const [ key, reached ] of goRoutes ) {
			const [ file, handler ] = key.split( '\u0000' );
			const named = [ ...reached ].filter( ( r ) => null !== r );
			if ( named.length && named.every( ( r ) => routes.includes( r ) ) ) {
				list.push( { dc: file.replace( /\.dc\.html$/i, '' ), handler } );
			}
		}
		list.length && ( out[ role ] = list );
	}
	return out;
}

// repo: the checkout whose `sites/<client>` is read (a sweep's work folder); entries: { <surfaces.json key>: entry } read in place of
// the client's own entries, so a run reads a part-look surface on another surface's draft page (Fill reads the shop card's rules
// on the product page's related cards, lib/fill-part-look-modes.mjs). derive: open a surface the client's part-look.json does not
// describe from the draft's own facts (lib/part-look-opening.mjs: the route intake read, the documented states of its overlays).
export async function runPartLook( { client, repo = REPO, entries = {}, derive = false, surfaces: wanted = SURFACES, site = null, compare = false, write = false, verify = false, seed = null, login = null, shots = true, only = null, dryRun = false, out = null, headed = false, log = ( m ) => console.log( m ) } ) {
	if ( ( compare || write || verify ) && ! site ) {
		throw new Error( `${ verify ? '--verify' : ( write ? '--write' : '--compare' ) } needs --site <scratch copy>` );
	}
	( write || verify ) && assertMayWrite( site );
	const buildDir = path.join( repo, 'sites', client, 'build' );
	const manifest = readJson( path.join( buildDir, 'surfaces.json' ) );
	const rows = fs.existsSync( path.join( buildDir, 'page-map.json' ) ) ? readJson( path.join( buildDir, 'page-map.json' ) ) : [];
	const config = fs.existsSync( path.join( buildDir, 'part-look.json' ) ) ? readJson( path.join( buildDir, 'part-look.json' ) ) : { surfaces: {} };
	const locators = readJson( path.join( HERE, 'data', 'part-locators.json' ) );
	const listed = readJson( path.join( HERE, 'data', 'part-look-known-faults.json' ) );
	const switches = readJson( path.join( HERE, 'data', 'part-look-switches.json' ) );
	const liveMap = readJson( path.join( HERE, 'data', 'part-live-selectors.json' ) );
	const modesData = readJson( path.join( HERE, 'data', 'part-look-modes.json' ) );
	const shopRecord = fs.existsSync( path.join( buildDir, 'shop-parts.json' ) ) ? readJson( path.join( buildDir, 'shop-parts.json' ) ) : null;
	const table = readJson( SELECTOR_TABLE );
	// A role names a file only where the draft has one (a draft whose pages are its logic's own state has none).
	const draftDirOf = ( entry ) => path.resolve( repo, entry.draftDir );
	const anyEntry = Object.values( manifest ).find( ( e ) => e.draftDir );
	const pages = Object.fromEntries( Object.entries( pagesOf( { rows, surfaces: manifest } ) ).filter( ( [ , f ] ) => anyEntry && fs.existsSync( path.join( draftDirOf( anyEntry ), f ) ) ) );
	// The draft route of a surface (`Product.dc.html?id=zookies` names the product the draft shows), from the intake.
	const intakeFile = path.join( buildDir, 'intake', 'intake.json' );
	let intake = null;
	const draftRouteOf = ( entry ) => ( intake ??= fs.existsSync( intakeFile ) ? readJson( intakeFile ) : {} ).skeletons?.[ entry?.intakeSurface ]?.route ?? null;
	// A control whose click handler routes to a role's page counts as a link to it (a one-file draft's Checkout is a button calling go).
	const links = rows.length ? draftLinksFor( { repo, client } ) : null;
	const roleRoutes = roleRoutesOf( { rows, routeRow: links?.routeRow, files: pagesOf( { rows, surfaces: manifest } ), accountRoute: logicRouteOf( draftRouteOf( manifest[ 'my-account' ] ) ) } );
	const routeHandlers = routeHandlersOf( { roleRoutes, goRoutes: links?.goRoutes } );
	let snapshot = null;
	let snapshotNote = null;
	let buttonPresets = {};
	try {
		snapshot = loadSnapshot( path.join( repo, 'sites', client, 'theme-snapshot.json' ) );
		buttonPresets = readJson( path.join( repo, 'sites', client, 'theme-snapshot.json' ) ).settings?.custom?.buttonPresets || {};
	} catch ( e ) {
		snapshotNote = `no theme snapshot read (${ e.message.split( '\n' )[ 0 ] }): colours and font families are written as literals`;
	}
	const db = openDb();
	const stamp = new Date().toISOString().replace( /[-:]/g, '' ).replace( /\.\d+Z$/, 'Z' );
	const outDir = out || path.join( buildDir, 'qa', 'part-look', stamp );
	fs.mkdirSync( outDir, { recursive: true } );
	const results = {};
	// Each surface's draft reads, for a rule that compares a part with one another surface of the same run read (from.sameLook).
	const readsOf = {};
	const failures = [];
	const refusals = [];
	const notes = snapshotNote ? [ snapshotNote ] : [];
	for ( const surface of wanted ) {
		const loc = locators.surfaces[ surface ];
		// A surface may read another's manifest entry (the signed-in account views live on the account's post and draft).
		const entry = entries[ loc?.entryOf || surface ] ?? manifest[ loc?.entryOf || surface ];
		if ( ! loc || ! entry ) {
			notes.push( `${ surface }: the client's surfaces.json has no such surface; skipped` );
			continue;
		}
		// A surface that reads another's entry (the signed-in views) opens the way that surface does.
		const given = config.surfaces?.[ surface ] || ( loc.entryOf ? config.surfaces?.[ loc.entryOf ] : null ) || {};
		let cfg = derivedConfig( { derive, given, entry, draftRoute: draftRouteOf( entry ) } );
		const refused = entry.noDraft ? null : refusalOf( { surface, draftRoute: draftRouteOf( entry ), cfg } );
		if ( refused ) {
			refusals.push( refused );
			continue;
		}
		const group = locators.groups[ loc.group ];
		const mainFile = cfg.file || pages[ loc.pageRole ] || entry.draftIndex;
		// The client's shop parts record locates each shop part by template key ("Product/108"): a locator may name a part id.
		const shopParts = {};
		for ( const sp of shopRecord?.surfaces || [] ) {
			for ( const part of sp.parts || [] ) {
				shopParts[ part.id ] = ( part.locators || [] ).map( ( k ) => ( { dc: k.slice( 0, k.lastIndexOf( '/' ) ), tpl: k.slice( k.lastIndexOf( '/' ) + 1 ) } ) );
			}
		}
		// The flow opener has no structure to locate it by: the draft's code names it (lib/part-look-controls.mjs).
		const opensFlow = Object.values( group.parts ).some( ( p ) => [].concat( p.match?.shopPart ?? [] ).includes( OPENER_PART ) );
		let controls = null;
		if ( opensFlow && ! entry.noDraft ) {
			controls = flowControls( { repo, client, entry, surface: loc.entryOf || surface, template: loc.template } );
			Object.assign( shopParts, openerShopParts( controls ) );
			controls.why && notes.push( `${ surface }: the flow opener is not located: ${ controls.why }` );
		}
		const builtin = declaredButtons( loc.block );
		const spec = { anchors: group.anchors, parts: group.parts, shopParts, routeHandlers, rootName: String( mainFile ).replace( /\.dc\.html$/, '' ), ...( group.emptyPins ? { emptyPins: group.emptyPins } : {} ), ...( group.probe ? { probe: group.probe } : {} ) };
		const also = ( loc.alsoRead || [] ).map( ( role ) => pages[ role ] ).filter( Boolean );
		const { rows: blockRowsOf, names } = blockRows( loc.block, db );
		const blockKey = [ 'woocommerce/cart', 'woocommerce/checkout' ].includes( loc.block ) ? loc.block.split( '/' )[ 1 ] : null;
		const tableParts = blockKey ? Object.entries( table.rows ).filter( ( [ , r ] ) => r[ blockKey ] && ( r.columns || [] ).length ).map( ( [ id ] ) => id.replace( /_/g, '-' ) ) : [];
		const noDraft = entry.noDraft ? String( entry.noDraft ) : null;
		log( `${ surface }: ${ noDraft ? `no draft page (${ noDraft })` : `reading ${ mainFile }${ also.length ? ` and ${ also.join( ', ' ) }` : '' }` }` );
		let reads = {};
		let signedTabs = null;
		const guarded = guardRead( { derive, surface, refusals } );
		if ( noDraft ) {
			reads = {};
		} else if ( loc.signedIn && ! pages.signin && ! logicRouteOf( cfg.route ) ) {
			notes.push( `${ surface }: the client's page map names no sign-in page, so the draft cannot be signed in and nothing is read` );
		} else if ( loc.signedIn ) {
			// A one-file draft signs in on its own sign-in route (the entry's route) and lands where its sign-in takes the visitor.
			const signinRoute = pages.signin ? null : logicRouteOf( cfg.route );
			const signed = await guarded( () => readSignedInParts( { draftDir: path.resolve( repo, entry.draftDir ), mainFile, signinFile: pages.signin ?? null, signinRoute, spec, parts: group.parts, pages, headed, log } ) );
			if ( ! signed ) {
				continue;
			}
			reads = signed.reads;
			signedTabs = signed.tabs;
			notes.push( ...signed.notes.map( ( n ) => `${ surface }: ${ n }` ) );
		} else {
			// With derive, a group read from one part (the basket drawer's panel) and no opening steps of the client's opens through the
			// draft's documented states (lib/part-look-opening.mjs).
			if ( derive && group.mustLocate?.length && ! cfg.init && ! cfg.empty ) {
				const openings = documentedOpenings( handoffRecords( repo, client ) );
				const tryOn = { draftDir: path.resolve( repo, entry.draftDir ), file: mainFile, spec, names: Object.keys( group.parts ), pages, route: cfg.route ?? null };
				const probes = await probeOpenings( { ...tryOn, openings } );
				// The visitor's way in: add on the product page, then the basket button the page shows at load.
				const productEntry = Object.values( manifest ).find( ( e ) => e.target?.template === locators.surfaces.product?.template && e.draftIndex );
				const visitor = visitorOpening( { adds: shopParts[ 'buybox-add-to-basket' ], load: probes[ 0 ], product: productEntry ? { file: productEntry.draftIndex, route: logicRouteOf( draftRouteOf( productEntry ) ) } : null } );
				// The clicks are replayed at every width the read takes, so the visitor's way in counts only when it opens at each of them.
				if ( visitor ) {
					const tries = [];
					for ( const width of [ 1440, 768, 375 ] ) {
						tries.push( ...await probeOpenings( { ...tryOn, openings: [ visitor ], withLoad: false, width } ) );
					}
					const atAll = visitorAtEveryWidth( tries );
					atAll.why ? notes.push( `${ surface }: ${ atAll.why }` ) : probes.push( atAll.probe );
				}
				const chosen = chooseOpenings( probes, group.mustLocate, group.filledShows || [] );
				if ( chosen.why ) {
					notes.push( `${ surface }: ${ chosen.why }` );
				} else {
					const pins = pinsOf( group.emptyPins, chosen.filled );
					const others = openings.filter( ( o ) => o.script !== chosen.init );
					const emptied = pins && others.length ? chooseEmptied( await probeOpenings( { ...tryOn, ...( chosen.filled.clicks ? { file: chosen.filled.file, route: chosen.filled.route ?? null } : {} ), spec: { ...spec, pins }, openings: others, withLoad: false } ), chosen.filled, group.filledShows || [] ) : null;
					notes.push( `${ surface }: opened through the draft's documented states: ${ chosen.evidence }${ emptied ? `; ${ emptied.evidence }` : '' }` );
					const way = chosen.filled.clicks ? { file: chosen.filled.file, route: chosen.filled.route ?? undefined, clicks: chosen.filled.clicks } : {};
					cfg = { ...cfg, ...way, ...( chosen.init ? { init: chosen.init } : {} ), ...( emptied ? { empty: emptied.empty } : {} ) };
				}
			}
			const got = await guarded( () => readParts( { draftDir: path.resolve( repo, entry.draftDir ), files: [ cfg.file ?? mainFile, ...also ], spec, names: Object.keys( group.parts ), pages, config: cfg.route || cfg.init || cfg.empty || cfg.clicks ? cfg : null, hover: builtin.map( ( b ) => b.part ), headed, log } ) );
			if ( ! got ) {
				continue;
			}
			( { reads } = got );
			// A part every other part of the group is read from (the basket drawer's panel) that the draft read did not locate makes the
			// surface's whole read empty: a refusal, never a quiet report of unpaired parts.
			refusals.push( ...unlocatedParts( group, reads ).map( ( part ) => `${ surface }: the draft's ${ part } was not located at any width, so no part read from it is paired and none of its settings is decided` ) );
		}
		const build = buildLook( {
			block: loc.block, rows: blockRowsOf, names, locators: spec, reads, snapshot,
			selectorOf: ( part ) => ( blockKey ? tableSelector( table, part, blockKey ) : null ),
			faultOf: faultsOf( { block: loc.block, blockKey, table, listed } ), tableParts, switches, policy: loc.instances || null,
		} );
		// A built-in button's preset and hover look (lib/fill-builtin-button.mjs): the declared buttons of the block.
		const builtinResult = applyBuiltinButtons( { block: loc.block, build, rows: blockRowsOf, names, db, reads, presets: buttonPresets, snapshot, buttons: builtin } );
		notes.push( ...builtinResult.notes.map( ( n ) => `${ surface }: ${ n }` ) );
		// Content and mode settings (what a card draws, what its button says): rules over the located parts.
		readsOf[ surface ] = reads;
		const modes = evaluateModes( { block: loc.block, rules: modesData.blocks?.[ loc.block ]?.rules, rows: blockRowsOf, reads, others: readsOf } );
		// The account menu: which view each of the draft's tabs opens (lib/part-look-account-views.mjs).
		const menuData = modesData.blocks?.[ loc.block ]?.menu;
		if ( signedTabs && menuData ) {
			// The menu from each tab's own view, and the order status words from the draft's own status table (Bean's D-7).
			const account = accountViewModes( { block: loc.block, tabs: signedTabs, menu: menuData, idx: loadDraft( path.resolve( repo, entry.draftDir ), mainFile ).idx, reads, rows: blockRowsOf, stringKeys: accountStringKeys() } );
			modes.writes.push( ...account.writes );
			modes.gaps.push( ...account.gaps );
			Object.assign( modes.settings, account.settings );
		}
		build.writes.push( ...modes.writes );
		build.gaps.push( ...modes.gaps );
		Object.entries( modes.settings ).forEach( ( [ attr, st ] ) => ( build.settings[ attr ] ??= { status: st.code === 'written' ? 'written' : 'not-written', code: st.code, part: null } ) );
		build.counts.modes = modes.writes.length;
		// The buy box's order of the flow's opener and Add to Cart, from the draft's order of the two controls.
		const order = orderWrite( controls );
		if ( order ) {
			build.writes.push( order );
			build.settings[ order.attr ] ??= { status: 'written', code: 'written', part: null };
		}
		const withPart = blockRowsOf.filter( ( r ) => r.css_element );
		const settingsStats = {
			total: blockRowsOf.length, withPart: withPart.length, withoutPart: blockRowsOf.length - withPart.length,
			withoutPartButProperty: blockRowsOf.filter( ( r ) => ! r.css_element && r.css_property ).map( ( r ) => r.attr_name ),
		};
		// The rows the reader pairs (a current-state row read from its current element included).
		const lookRows = lookRowsOf( blockRowsOf, spec );
		const partNames = [ ...new Set( lookRows.map( ( r ) => r.css_element ) ) ];
		const located = ( part ) => Object.values( reads[ part ] || {} ).some( ( l ) => l.length );
		const result = {
			surface, block: loc.block, settingsStats, template: loc.template ?? null, postId: loc.template && site ? templateIdOf( site, loc.template ) : ( entry.target?.postId ?? null ), draftFile: noDraft ? `none (${ noDraft })` : mainFile, alsoRead: also, pages,
			rowsPaired: { tableRows: { present: tableParts.length, paired: tableParts.filter( located ).length }, parts: { withSettings: partNames.length, paired: partNames.filter( located ).length } },
			build, ...( signedTabs ? { tabs: signedTabs } : {} ), located: Object.fromEntries( Object.entries( reads ).map( ( [ part, byWidth ] ) => [ part, Object.fromEntries( Object.entries( byWidth ).map( ( [ w, l ] ) => [ w, l.map( ( i ) => ( { text: i.text, tag: i.tag, box: i.box } ) ) ] ) ) ] ) ),
		};
		if ( compare || write ) {
			const saved = readSavedBlock( { site, postId: result.postId, block: loc.block } );
			if ( saved.count > 1 ) {
				notes.push( `${ surface }: post ${ result.postId } holds ${ saved.count } ${ loc.block } blocks; the first was read` );
			}
			result.customCss = customCssOf( saved.attrs );
			if ( compare ) {
				result.compare = compareSettings( { writes: build.writes, settings: build.settings, saved: saved.attrs, lookAttrs: lookRows.map( ( r ) => r.attr_name ), site: snapshot } );
			}
		}
		// A surface whose page needs what a run cannot open (the order confirmation shows only at a real order's address) is read,
		// compared and written, never verified (its locator's `verify: false`).
		const verifies = verify && false !== loc.verify;
		verify && ! verifies && notes.push( `${ surface }: not verified (its page shows only at a real order's address); read, compared and written only` );
		const base0 = verifies || shots ? ( site ? siteUrl( targetOf( site, readTargets() ), REPO ) : null ) : null;
		const openerDrawn = Object.entries( group.parts ).some( ( [ name, p ] ) => [].concat( p.match?.shopPart ?? [] ).includes( OPENER_PART ) && located( name ) );
		let productPath = null;
		const pagePathOf = () => {
			if ( loc.signedIn ) {
				return `/?page_id=${ result.postId }`;
			}
			if ( loc.basket === false && 'product' === loc.pageRole ) {
				// A real product the template shows, and one linked to a flow where the draft draws the flow's opener: never the
				// seed's fixture product or the shop page, which show no buy box parts the draft drew.
				productPath ??= liveProductPath( { site, productSlugs: draftProductSlugs( [ draftRouteOf( entry ) ] ), flowLinked: openerDrawn } );
				return productPath;
			}
			const row = rows.find( ( r ) => r.template === loc.template );
			// A shop archive is read at its own address: its page id redirects to a product on a WooCommerce site.
			if ( row?.slug && 'shop' === row.postType ) {
				return `/${ row.slug }/`;
			}
			return row?.id ? `/?page_id=${ row.id }` : ( 'header' === surface ? `/?page_id=${ manifest.cart?.target?.postId }` : `/?page_id=${ result.postId }` );
		};
		// The signed-in views: the seeded customer signs in (--login) and the seed names the order whose page is read.
		const signedIn = loc.signedIn && ( verify || shots ) && base0 ? { login, orderView: seed ? signedInSeedOf( fs.readFileSync( seed, 'utf8' ) ).orderView : null } : null;
		if ( loc.signedIn && verify && ! login ) {
			throw new Error( `--verify on ${ surface } needs --login <user:pass> (the seeded customer)` );
		}
		if ( verifies && shots && base0 && signedIn?.login ) {
			result.shots = { before: await shootLiveSignedIn( { base: base0, pagePath: pagePathOf(), login: signedIn.login, orderView: signedIn.orderView, dir: outDir, prefix: `${ surface }-before` } ) };
		} else if ( verifies && shots && base0 && ! loc.signedIn ) {
			result.shots = { before: path.join( outDir, `${ surface }-before-1440.png` ) };
			await shootLiveSurface( { base: base0, pagePath: pagePathOf(), product: false === loc.basket || ! seed ? null : seedOf( fs.readFileSync( seed, 'utf8' ) ), file: result.shots.before } );
		}
		if ( write ) {
			const picked = build.writes.filter( ( w ) => ! only || only.includes( w.attr ) || only.includes( w.companionOf ) );
			const set = mergeKeyWrites( picked, picked.some( ( w ) => w.attr.includes( '.' ) ) ? readSavedBlock( { site, postId: result.postId, block: loc.block } ).attrs : {} );
			result.written = { site, count: Object.keys( set ).length, output: Object.keys( set ).length ? patchBlock( { site, postId: result.postId, block: loc.block, set, file: path.join( outDir, `patch-${ surface }.json` ), dryRun } ) : 'nothing to write on this surface' };
		}
		if ( verifies ) {
			const short = loc.block.split( '/' )[ 1 ];
			const live = liveSelectorsFor( { parts: partNames, blockKey, table, map: liveMap, elements: blockKey ? null : blockElementsOf( REPO, short ), short, block: loc.block } );
			const base = siteUrl( targetOf( site, readTargets() ), REPO );
			const product = seed && false !== loc.basket && ! loc.signedIn ? seedOf( fs.readFileSync( seed, 'utf8' ) ) : null;
			let n = 0;
			result.verify = await verifySurface( {
				buildInputs: { block: loc.block, rows: blockRowsOf, names, locators: spec, reads, snapshot, selectorOf: ( part ) => ( blockKey ? tableSelector( table, part, blockKey ) : null ), faultOf: faultsOf( { block: loc.block, blockKey, table, listed } ), tableParts, switches, policy: loc.instances || null },
				built: build,
				readLive: () => ( loc.signedIn ? readLiveSignedIn( { base, pagePath: pagePathOf(), login: signedIn.login, orderView: signedIn.orderView, selectors: live.selectors, props: READ_PROPS, headed } ) : readLiveSurface( { base, pagePath: pagePathOf(), selectors: live.selectors, props: READ_PROPS, product, openDrawer: 'header' === surface, headed } ) ),
				patch: async ( { set, unset } ) => patchBlock( { site, postId: result.postId, block: loc.block, set, unset, file: path.join( outDir, `patch-verify-${ surface }-${ ++n }.json` ) } ),
				readSaved: async () => readSavedBlock( { site, postId: result.postId, block: loc.block } ).attrs,
				selectorsNone: live.none, selectors: live.selectors, log,
			} );
			failures.push( ...result.verify.failures.map( ( f ) => `${ surface }: ${ f }` ) );
			if ( shots && loc.signedIn ) {
				result.shots = { ...( result.shots || {} ), after: await shootLiveSignedIn( { base, pagePath: pagePathOf(), login: signedIn.login, orderView: signedIn.orderView, dir: outDir, prefix: `${ surface }-after` } ) };
			} else if ( shots ) {
				result.shots = { ...( result.shots || {} ), after: path.join( outDir, `${ surface }-after-1440.png` ) };
				await shootLiveSurface( { base, pagePath: pagePathOf(), product, file: result.shots.after } );
			}
		}
		results[ surface ] = result;
	}
	const totals = totalsOf( results );
	const report = { client, site, compare, generated: new Date().toISOString(), outDir, widths: [ 1440, 768, 375 ], notes, refusals, failures, totals, surfaces: results };
	fs.writeFileSync( path.join( outDir, 'report.json' ), `${ JSON.stringify( report, null, '\t' ) }\n` );
	fs.writeFileSync( path.join( outDir, 'report.md' ), reportMarkdown( { client, site, compare, generated: report.generated, surfaces: results, totals, notes, refusals, failures } ) );
	return { outDir, totals, report, failures, refusals };
}

// The keys the account block's wording class supports (data/account-parts.json stringsSource).
function accountStringKeys() {
	const parts = readJson( ACCOUNT_PARTS_FILE );
	const file = path.join( REPO, parts.stringsSource?.file || '' );
	return fs.existsSync( file ) ? phpListKeys( fs.readFileSync( file, 'utf8' ), parts.stringsSource.list ) : [];
}

// The settings a write sets: { attr: value }. A write to one key of an object setting (`strings.orders`) is merged into that setting's
// saved object (`saved`, the block's saved settings) with the other writes to it, because a write replaces a setting whole.
export function mergeKeyWrites( writes, saved = {} ) {
	const set = {};
	for ( const w of writes ) {
		const dot = w.attr.indexOf( '.' );
		if ( dot < 0 ) {
			set[ w.attr ] = w.value;
			continue;
		}
		const top = w.attr.slice( 0, dot );
		set[ top ] = { ...( set[ top ] ?? ( saved?.[ top ] && 'object' === typeof saved[ top ] && ! Array.isArray( saved[ top ] ) ? saved[ top ] : {} ) ), [ w.attr.slice( dot + 1 ) ]: w.value };
	}
	return set;
}

// The surfaces a --strict verify fails: every verified surface that is not a full match (a part with settings not verified, a pair
// that still differs, a switch whose part still shows, or nothing compared at all), each as one line with its counts.
export function strictFailuresOf( surfaces ) {
	return Object.values( surfaces || {} ).filter( ( s ) => s.verify && ! s.verify.allMatch ).map( ( s ) => `${ s.surface }: not a full match (${ s.verify.counts.notVerified } of ${ s.verify.counts.partsWithSettings } parts with settings not verified, ${ s.verify.counts.differs } pairs still differ, ${ s.verify.counts.compared } pairs compared)` );
}

// `--login user:pass`: the seeded customer the signed-in views are read as ({ user, pass }); the password may hold a colon.
export function loginOf( text ) {
	if ( ! text ) {
		return null;
	}
	const at = String( text ).indexOf( ':' );
	if ( at < 1 || at === String( text ).length - 1 ) {
		throw new Error( '--login takes <user:pass>' );
	}
	return { user: text.slice( 0, at ), pass: text.slice( at + 1 ) };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	try {
		const client = flag( '--client' );
		if ( ! client ) {
			throw new Error( 'usage: part-look.mjs --client <slug> [--surface cart|checkout|my-account|header|product|shop|shop-chips|shop-sort|my-account-in|confirmation] [--site <scratch copy>] [--compare] [--write [--only <attr,attr>] [--dry-run]] [--verify --seed <seed-out.json> [--login <user:pass>] [--strict]] [--out <dir>] [--headed]' );
		}
		const surface = flag( '--surface' );
		if ( surface && ! SURFACES.includes( surface ) ) {
			throw new Error( `--surface must be one of ${ SURFACES.join( ', ' ) }` );
		}
		const r = await runPartLook( { client, surfaces: surface ? [ surface ] : SURFACES, site: flag( '--site' ), compare: argv.includes( '--compare' ), write: argv.includes( '--write' ), verify: argv.includes( '--verify' ), shots: ! argv.includes( '--no-shots' ), seed: flag( '--seed' ), login: loginOf( flag( '--login' ) ), only: flag( '--only' ) ? flag( '--only' ).split( ',' ) : null, dryRun: argv.includes( '--dry-run' ), out: flag( '--out' ), headed: argv.includes( '--headed' ) } );
		for ( const [ block, t ] of Object.entries( r.totals ) ) {
			console.log( `${ block }: ${ t.written } values to write (${ t.knownFaultWrites } known not to paint), table rows paired ${ t.tableRowsPaired}/${ t.tableRowsPresent }, parts paired ${ t.partsPaired }/${ t.partsWithSettings }, ${ t.unpaired } unpaired, ${ t.noLocator } no locator, ${ t.noSetting } no setting${ t.compare ? `; compare: equal ${ t.compare.equal }, differs ${ t.compare.differs }, hand-set only ${ t.compare.handSetOnly }, route only ${ t.compare.routeOnly }` : '' }` );
		}
		for ( const s of Object.values( r.report.surfaces ) ) {
			const v = s.verify;
			v && console.log( `${ s.surface }: verify ${ v.allMatch ? 'compared every part with settings: all match' : `not a full match: ${ v.counts.notVerified } of ${ v.counts.partsWithSettings } parts with settings not verified, ${ v.counts.differs } pairs still differ` } (${ v.counts.matched } of ${ v.counts.compared } compared pairs match)` );
		}
		console.log( `Report: ${ path.join( r.outDir, 'report.md' ) }` );
		r.refusals.forEach( ( f ) => console.error( `REFUSED ${ f }` ) );
		if ( r.failures.length ) {
			r.failures.forEach( ( f ) => console.error( `VERIFY FAILED ${ f }` ) );
		}
		// --strict: a verify that is not a full match fails the run (by default it is reported and the run passes).
		const strict = argv.includes( '--strict' ) ? strictFailuresOf( r.report.surfaces ) : [];
		strict.forEach( ( f ) => console.error( `STRICT ${ f }` ) );
		if ( r.failures.length || r.refusals.length || strict.length ) {
			process.exitCode = 1;
		}
	} catch ( e ) {
		console.error( e.message );
		process.exit( 2 );
	}
}
