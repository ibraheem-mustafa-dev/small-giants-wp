#!/usr/bin/env node
// Reads a client's shop look from its draft and says which settings of the Cart, Checkout, `sgs/account` and `sgs/cart` blocks it
// would write (template-rework Task 4, Spec 48 FR-48-87).
//
//   node scripts/computed-route/part-look.mjs --client <slug> [--surface cart|checkout|my-account|header] [--site <scratch copy>]
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
//   my-account-in  the account's signed-in views (orders, an order's page, addresses, details): the draft is signed in on its own
//              sign-in page and read view by view (lib/part-look-signed-in.mjs); --verify reads the copy signed in as --login <user:pass>
//              (the seeded customer) on every view its menu links to and the seed's order page.
// A client may name a surface's opening steps in sites/<client>/build/part-look.json: { surfaces: { <surface>: { file, route, init } } }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './lib/db.mjs';
import { buildLook, tableSelector } from './lib/fill-part-look.mjs';
import { compareSettings, faultsOf } from './lib/part-look-compare.mjs';
import { REPO, assertMayWrite, blockRows, customCssOf, liveProductPath, patchBlock, readParts, readSavedBlock, templateIdOf } from './lib/part-look-run.mjs';
import { draftProductSlugs } from './lib/template-live-address.mjs';
import { reportMarkdown, totalsOf } from './lib/part-look-report.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { applyBuiltinButtons, declaredButtons } from './lib/fill-builtin-button.mjs';
import { OPENER_PART, flowControls, openerShopParts, orderWrite } from './lib/part-look-controls.mjs';
import { blockElementsOf, liveSelectorsFor, readLiveSurface, seedOf, shootLiveSurface, verifySurface } from './lib/part-look-verify.mjs';
import { READ_PROPS } from './lib/fill-part-look.mjs';
import { evaluateModes } from './lib/part-look-modes.mjs';
import { readTargets, siteUrl, targetOf } from './lib/site-targets.mjs';
import { readLiveSignedIn, readSignedInParts, shootLiveSignedIn, signedInSeedOf } from './lib/part-look-signed-in.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SURFACES = [ 'cart', 'checkout', 'my-account', 'header', 'product', 'shop', 'my-account-in' ];
const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const SELECTOR_TABLE = path.join( REPO, 'plugins', 'sgs-blocks', 'includes', 'woocommerce', 'commerce-look', 'selectors.json' );

// The draft file each role lives in: the cart and checkout page rows of the page map, the account surface's own file and the
// sign-in page its WooCommerce parts name.
export function pagesOf( { rows, surfaces } ) {
	const route = ( template ) => rows.find( ( r ) => 'page' === r.postType && template === r.template )?.route ?? null;
	const account = surfaces[ 'my-account' ]?.draftIndex ?? null;
	const accountRow = rows.find( ( r ) => r.route === account );
	const signin = ( accountRow?.parts || [] ).filter( ( p ) => 'woocommerce' === p.owner ).map( ( p ) => String( p.draftId ).split( ':' )[ 0 ] ).find( ( f ) => f && f !== account ) ?? null;
	return Object.fromEntries( Object.entries( { cart: route( 'cart' ), checkout: route( 'checkout' ), account, signin } ).filter( ( [ , v ] ) => v ) );
}

export async function runPartLook( { client, surfaces: wanted = SURFACES, site = null, compare = false, write = false, verify = false, seed = null, login = null, shots = true, only = null, dryRun = false, out = null, headed = false, log = ( m ) => console.log( m ) } ) {
	if ( ( compare || write || verify ) && ! site ) {
		throw new Error( `${ verify ? '--verify' : ( write ? '--write' : '--compare' ) } needs --site <scratch copy>` );
	}
	( write || verify ) && assertMayWrite( site );
	const buildDir = path.join( REPO, 'sites', client, 'build' );
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
	const draftDirOf = ( entry ) => path.resolve( REPO, entry.draftDir );
	const anyEntry = Object.values( manifest ).find( ( e ) => e.draftDir );
	const pages = Object.fromEntries( Object.entries( pagesOf( { rows, surfaces: manifest } ) ).filter( ( [ , f ] ) => anyEntry && fs.existsSync( path.join( draftDirOf( anyEntry ), f ) ) ) );
	// The draft route of a surface (`Product.dc.html?id=zookies` names the product the draft shows), from the intake.
	const intakeFile = path.join( buildDir, 'intake', 'intake.json' );
	let intake = null;
	const draftRouteOf = ( entry ) => ( intake ??= fs.existsSync( intakeFile ) ? readJson( intakeFile ) : {} ).skeletons?.[ entry.intakeSurface ]?.route ?? null;
	let snapshot = null;
	let snapshotNote = null;
	let buttonPresets = {};
	try {
		snapshot = loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) );
		buttonPresets = readJson( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) ).settings?.custom?.buttonPresets || {};
	} catch ( e ) {
		snapshotNote = `no theme snapshot read (${ e.message.split( '\n' )[ 0 ] }): colours and font families are written as literals`;
	}
	const db = openDb();
	const stamp = new Date().toISOString().replace( /[-:]/g, '' ).replace( /\.\d+Z$/, 'Z' );
	const outDir = out || path.join( buildDir, 'qa', 'part-look', stamp );
	fs.mkdirSync( outDir, { recursive: true } );
	const results = {};
	const notes = snapshotNote ? [ snapshotNote ] : [];
	for ( const surface of wanted ) {
		const loc = locators.surfaces[ surface ];
		// A surface may read another's manifest entry (the signed-in account views live on the account's post and draft).
		const entry = manifest[ loc?.entryOf || surface ];
		if ( ! loc || ! entry ) {
			notes.push( `${ surface }: the client's surfaces.json has no such surface; skipped` );
			continue;
		}
		const cfg = config.surfaces?.[ surface ] || {};
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
			controls = flowControls( { repo: REPO, client, entry, surface: loc.entryOf || surface, template: loc.template } );
			Object.assign( shopParts, openerShopParts( controls ) );
			controls.why && notes.push( `${ surface }: the flow opener is not located: ${ controls.why }` );
		}
		const builtin = declaredButtons( loc.block );
		const spec = { anchors: group.anchors, parts: group.parts, shopParts, rootName: String( mainFile ).replace( /\.dc\.html$/, '' ) };
		const also = ( loc.alsoRead || [] ).map( ( role ) => pages[ role ] ).filter( Boolean );
		const { rows: blockRowsOf, names } = blockRows( loc.block, db );
		const blockKey = [ 'woocommerce/cart', 'woocommerce/checkout' ].includes( loc.block ) ? loc.block.split( '/' )[ 1 ] : null;
		const tableParts = blockKey ? Object.entries( table.rows ).filter( ( [ , r ] ) => r[ blockKey ] && ( r.columns || [] ).length ).map( ( [ id ] ) => id.replace( /_/g, '-' ) ) : [];
		const noDraft = entry.noDraft ? String( entry.noDraft ) : null;
		log( `${ surface }: ${ noDraft ? `no draft page (${ noDraft })` : `reading ${ mainFile }${ also.length ? ` and ${ also.join( ', ' ) }` : '' }` }` );
		let reads = {};
		if ( noDraft ) {
			reads = {};
		} else if ( loc.signedIn && ! pages.signin ) {
			notes.push( `${ surface }: the client's page map names no sign-in page, so the draft cannot be signed in and nothing is read` );
		} else if ( loc.signedIn ) {
			const signed = await readSignedInParts( { draftDir: path.resolve( REPO, entry.draftDir ), mainFile, signinFile: pages.signin, spec, parts: group.parts, pages, headed, log } );
			reads = signed.reads;
			notes.push( ...signed.notes.map( ( n ) => `${ surface }: ${ n }` ) );
		} else {
			( { reads } = await readParts( { draftDir: path.resolve( REPO, entry.draftDir ), files: [ mainFile, ...also ], spec, names: Object.keys( group.parts ), pages, config: cfg.route || cfg.init ? cfg : null, hover: builtin.map( ( b ) => b.part ), headed, log } ) );
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
		const modes = evaluateModes( { block: loc.block, rules: modesData.blocks?.[ loc.block ]?.rules, rows: blockRowsOf, reads } );
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
		const lookRows = blockRowsOf.filter( ( r ) => r.css_element && r.css_property && ! r.css_state );
		const partNames = [ ...new Set( lookRows.map( ( r ) => r.css_element ) ) ];
		const located = ( part ) => Object.values( reads[ part ] || {} ).some( ( l ) => l.length );
		const result = {
			surface, block: loc.block, settingsStats, template: loc.template ?? null, postId: loc.template && site ? templateIdOf( site, loc.template ) : ( entry.target?.postId ?? null ), draftFile: noDraft ? `none (${ noDraft })` : mainFile, alsoRead: also, pages,
			rowsPaired: { tableRows: { present: tableParts.length, paired: tableParts.filter( located ).length }, parts: { withSettings: partNames.length, paired: partNames.filter( located ).length } },
			build, located: Object.fromEntries( Object.entries( reads ).map( ( [ part, byWidth ] ) => [ part, Object.fromEntries( Object.entries( byWidth ).map( ( [ w, l ] ) => [ w, l.map( ( i ) => ( { text: i.text, tag: i.tag, box: i.box } ) ) ] ) ) ] ) ),
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
		const base0 = verify || shots ? ( site ? siteUrl( targetOf( site, readTargets() ), REPO ) : null ) : null;
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
		if ( verify && shots && base0 && signedIn?.login ) {
			result.shots = { before: await shootLiveSignedIn( { base: base0, pagePath: pagePathOf(), login: signedIn.login, orderView: signedIn.orderView, dir: outDir, prefix: `${ surface }-before` } ) };
		} else if ( verify && shots && base0 && ! loc.signedIn ) {
			result.shots = { before: path.join( outDir, `${ surface }-before-1440.png` ) };
			await shootLiveSurface( { base: base0, pagePath: pagePathOf(), product: false === loc.basket || ! seed ? null : seedOf( fs.readFileSync( seed, 'utf8' ) ), file: result.shots.before } );
		}
		if ( write ) {
			const set = Object.fromEntries( build.writes.filter( ( w ) => ! only || only.includes( w.attr ) || only.includes( w.companionOf ) ).map( ( w ) => [ w.attr, w.value ] ) );
			result.written = { site, count: Object.keys( set ).length, output: Object.keys( set ).length ? patchBlock( { site, postId: result.postId, block: loc.block, set, file: path.join( outDir, `patch-${ surface }.json` ), dryRun } ) : 'nothing to write on this surface' };
		}
		if ( verify ) {
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
	const report = { client, site, compare, generated: new Date().toISOString(), outDir, widths: [ 1440, 768, 375 ], notes, totals, surfaces: results };
	fs.writeFileSync( path.join( outDir, 'report.json' ), `${ JSON.stringify( report, null, '\t' ) }\n` );
	fs.writeFileSync( path.join( outDir, 'report.md' ), reportMarkdown( { client, site, compare, generated: report.generated, surfaces: results, totals, notes } ) );
	return { outDir, totals, report };
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
			throw new Error( 'usage: part-look.mjs --client <slug> [--surface cart|checkout|my-account|header|product|shop|my-account-in] [--site <scratch copy>] [--compare] [--write [--only <attr,attr>] [--dry-run]] [--verify --seed <seed-out.json> [--login <user:pass>]] [--out <dir>] [--headed]' );
		}
		const surface = flag( '--surface' );
		if ( surface && ! SURFACES.includes( surface ) ) {
			throw new Error( `--surface must be one of ${ SURFACES.join( ', ' ) }` );
		}
		const r = await runPartLook( { client, surfaces: surface ? [ surface ] : SURFACES, site: flag( '--site' ), compare: argv.includes( '--compare' ), write: argv.includes( '--write' ), verify: argv.includes( '--verify' ), shots: ! argv.includes( '--no-shots' ), seed: flag( '--seed' ), login: loginOf( flag( '--login' ) ), only: flag( '--only' ) ? flag( '--only' ).split( ',' ) : null, dryRun: argv.includes( '--dry-run' ), out: flag( '--out' ), headed: argv.includes( '--headed' ) } );
		for ( const [ block, t ] of Object.entries( r.totals ) ) {
			console.log( `${ block }: ${ t.written } values to write (${ t.knownFaultWrites } known not to paint), table rows paired ${ t.tableRowsPaired}/${ t.tableRowsPresent }, parts paired ${ t.partsPaired }/${ t.partsWithSettings }, ${ t.unpaired } unpaired, ${ t.noLocator } no locator, ${ t.noSetting } no setting${ t.compare ? `; compare: equal ${ t.compare.equal }, differs ${ t.compare.differs }, hand-set only ${ t.compare.handSetOnly }, route only ${ t.compare.routeOnly }` : '' }` );
		}
		console.log( `Report: ${ path.join( r.outDir, 'report.md' ) }` );
	} catch ( e ) {
		console.error( e.message );
		process.exit( 2 );
	}
}
