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
//   --verify   after the writes, opens the scratch copy's own page with the basket filled (--seed <seed.php output>), reads each paired part on the
//              live page at the three widths, writes the settings whose live value differs from the draft's (and takes back a write that changed
//              nothing) and reports what still differs. It needs a `local-mediatest-*` --site; set SGS_SECRETS_ROOT in a worktree.
// A client may name a surface's opening steps in sites/<client>/build/part-look.json: { surfaces: { <surface>: { file, route, init } } }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './lib/db.mjs';
import { buildLook, tableSelector } from './lib/fill-part-look.mjs';
import { compareSettings, faultsOf } from './lib/part-look-compare.mjs';
import { REPO, assertMayWrite, blockRows, customCssOf, patchBlock, readParts, readSavedBlock } from './lib/part-look-run.mjs';
import { reportMarkdown, totalsOf } from './lib/part-look-report.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { blockElementsOf, liveSelectorsFor, readLiveSurface, seedOf, verifySurface } from './lib/part-look-verify.mjs';
import { READ_PROPS } from './lib/fill-part-look.mjs';
import { readTargets, siteUrl, targetOf } from './lib/site-targets.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const SURFACES = [ 'cart', 'checkout', 'my-account', 'header' ];
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

export async function runPartLook( { client, surfaces: wanted = SURFACES, site = null, compare = false, write = false, verify = false, seed = null, only = null, dryRun = false, out = null, headed = false, log = ( m ) => console.log( m ) } ) {
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
	const table = readJson( SELECTOR_TABLE );
	// A role names a file only where the draft has one (a draft whose pages are its logic's own state has none).
	const draftDirOf = ( entry ) => path.resolve( REPO, entry.draftDir );
	const anyEntry = Object.values( manifest ).find( ( e ) => e.draftDir );
	const pages = Object.fromEntries( Object.entries( pagesOf( { rows, surfaces: manifest } ) ).filter( ( [ , f ] ) => anyEntry && fs.existsSync( path.join( draftDirOf( anyEntry ), f ) ) ) );
	let snapshot = null;
	let snapshotNote = null;
	try {
		snapshot = loadSnapshot( path.join( REPO, 'sites', client, 'theme-snapshot.json' ) );
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
		const entry = manifest[ surface ];
		if ( ! loc || ! entry ) {
			notes.push( `${ surface }: the client's surfaces.json has no such surface; skipped` );
			continue;
		}
		const cfg = config.surfaces?.[ surface ] || {};
		const group = locators.groups[ loc.group ];
		const spec = { anchors: group.anchors, parts: group.parts };
		const mainFile = cfg.file || pages[ loc.pageRole ] || entry.draftIndex;
		const also = ( loc.alsoRead || [] ).map( ( role ) => pages[ role ] ).filter( Boolean );
		const { rows: blockRowsOf, names } = blockRows( loc.block, db );
		const blockKey = [ 'woocommerce/cart', 'woocommerce/checkout' ].includes( loc.block ) ? loc.block.split( '/' )[ 1 ] : null;
		const tableParts = blockKey ? Object.entries( table.rows ).filter( ( [ , r ] ) => r[ blockKey ] && ( r.columns || [] ).length ).map( ( [ id ] ) => id.replace( /_/g, '-' ) ) : [];
		const noDraft = entry.noDraft ? String( entry.noDraft ) : null;
		log( `${ surface }: ${ noDraft ? `no draft page (${ noDraft })` : `reading ${ mainFile }${ also.length ? ` and ${ also.join( ', ' ) }` : '' }` }` );
		const { reads } = noDraft ? { reads: {} } : await readParts( { draftDir: path.resolve( REPO, entry.draftDir ), files: [ mainFile, ...also ], spec, names: Object.keys( group.parts ), pages, config: cfg.route || cfg.init ? cfg : null, headed, log } );
		const build = buildLook( {
			block: loc.block, rows: blockRowsOf, names, locators: spec, reads, snapshot,
			selectorOf: ( part ) => ( blockKey ? tableSelector( table, part, blockKey ) : null ),
			faultOf: faultsOf( { block: loc.block, blockKey, table, listed } ), tableParts, switches,
		} );
		const lookRows = blockRowsOf.filter( ( r ) => r.css_element && r.css_property && ! r.css_state );
		const partNames = [ ...new Set( lookRows.map( ( r ) => r.css_element ) ) ];
		const located = ( part ) => Object.values( reads[ part ] || {} ).some( ( l ) => l.length );
		const result = {
			surface, block: loc.block, postId: entry.target?.postId ?? null, draftFile: noDraft ? `none (${ noDraft })` : mainFile, alsoRead: also, pages,
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
		if ( write ) {
			const set = Object.fromEntries( build.writes.filter( ( w ) => ! only || only.includes( w.attr ) || only.includes( w.companionOf ) ).map( ( w ) => [ w.attr, w.value ] ) );
			result.written = { site, count: Object.keys( set ).length, output: Object.keys( set ).length ? patchBlock( { site, postId: result.postId, block: loc.block, set, file: path.join( outDir, `patch-${ surface }.json` ), dryRun } ) : 'nothing to write on this surface' };
		}
		if ( verify ) {
			const short = loc.block.split( '/' )[ 1 ];
			const live = liveSelectorsFor( { parts: partNames, blockKey, table, map: liveMap, elements: blockKey ? null : blockElementsOf( REPO, short ), short } );
			const base = siteUrl( targetOf( site, readTargets() ), REPO );
			const pageId = 'header' === surface ? manifest.cart?.target?.postId : result.postId;
			const product = seed ? seedOf( fs.readFileSync( seed, 'utf8' ) ) : null;
			let n = 0;
			result.verify = await verifySurface( {
				buildInputs: { block: loc.block, rows: blockRowsOf, names, locators: spec, reads, snapshot, selectorOf: ( part ) => ( blockKey ? tableSelector( table, part, blockKey ) : null ), faultOf: faultsOf( { block: loc.block, blockKey, table, listed } ), tableParts, switches },
				built: build,
				readLive: () => readLiveSurface( { base, pagePath: `/?page_id=${ pageId }`, selectors: live.selectors, props: READ_PROPS, product, openDrawer: 'header' === surface, headed } ),
				patch: async ( { set, unset } ) => patchBlock( { site, postId: result.postId, block: loc.block, set, unset, file: path.join( outDir, `patch-verify-${ surface }-${ ++n }.json` ) } ),
				readSaved: async () => readSavedBlock( { site, postId: result.postId, block: loc.block } ).attrs,
				selectorsNone: live.none, selectors: live.selectors, log,
			} );
		}
		results[ surface ] = result;
	}
	const totals = totalsOf( results );
	const report = { client, site, compare, generated: new Date().toISOString(), outDir, widths: [ 1440, 768, 375 ], notes, totals, surfaces: results };
	fs.writeFileSync( path.join( outDir, 'report.json' ), `${ JSON.stringify( report, null, '\t' ) }\n` );
	fs.writeFileSync( path.join( outDir, 'report.md' ), reportMarkdown( { client, site, compare, generated: report.generated, surfaces: results, totals, notes } ) );
	return { outDir, totals, report };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	try {
		const client = flag( '--client' );
		if ( ! client ) {
			throw new Error( 'usage: part-look.mjs --client <slug> [--surface cart|checkout|my-account|header] [--site <scratch copy>] [--compare] [--write [--only <attr,attr>] [--dry-run]] [--verify --seed <seed-out.json>] [--out <dir>] [--headed]' );
		}
		const surface = flag( '--surface' );
		if ( surface && ! SURFACES.includes( surface ) ) {
			throw new Error( `--surface must be one of ${ SURFACES.join( ', ' ) }` );
		}
		const r = await runPartLook( { client, surfaces: surface ? [ surface ] : SURFACES, site: flag( '--site' ), compare: argv.includes( '--compare' ), write: argv.includes( '--write' ), verify: argv.includes( '--verify' ), seed: flag( '--seed' ), only: flag( '--only' ) ? flag( '--only' ).split( ',' ) : null, dryRun: argv.includes( '--dry-run' ), out: flag( '--out' ), headed: argv.includes( '--headed' ) } );
		for ( const [ block, t ] of Object.entries( r.totals ) ) {
			console.log( `${ block }: ${ t.written } values to write (${ t.knownFaultWrites } known not to paint), table rows paired ${ t.tableRowsPaired}/${ t.tableRowsPresent }, parts paired ${ t.partsPaired }/${ t.partsWithSettings }, ${ t.unpaired } unpaired, ${ t.noLocator } no locator, ${ t.noSetting } no setting${ t.compare ? `; compare: equal ${ t.compare.equal }, differs ${ t.compare.differs }, hand-set only ${ t.compare.handSetOnly }, route only ${ t.compare.routeOnly }` : '' }` );
		}
		console.log( `Report: ${ path.join( r.outDir, 'report.md' ) }` );
	} catch ( e ) {
		console.error( e.message );
		process.exit( 2 );
	}
}
