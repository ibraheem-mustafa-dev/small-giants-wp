#!/usr/bin/env node
// Phase 2 site run (Spec 48, plan 2026-10-23-cloning-tool-completion, Phase 2 step 4 and 5): every surface of one client
// through inventory, skeleton propose, Fill, the build's dry run, the build and the parity walk, with one status line per
// surface. A failed surface is logged and the run goes on. The draft folder is served once and each page surface opens at
// its hash route.
// A surface's inventory root and opener come from its intake skeleton record: a surface that exists only while a draft state
// holds (record `root.viaState`) takes the inventory intake saved with that state open
// (build/intake/inventories/<intakeSurface>.json) and Fill opens the same state (lib/fill-open.mjs); any other surface is read
// live at the tag of the record's root element, at its route. A form opens on its page (entry `draftRoute`) and its live address
// is that page's; a `contentOnly` post surface is skipped unless `--with-content` is passed.
// Template copies (FR-48-56, lib/template-copies.mjs): the run is two passes, every surface's inventory, propose and Fill
// first, then the builds and walks, because a template several pages share takes the shell all their Filled trees have.
// Between the passes each copy's tree is written to trees/template/<slug>.json: a `copy.from: 'pages'` surface from the
// shell its pages share (it reads no draft), a `'fill'` surface (the single-post template at its first post, a WooCommerce
// page's template at that page, a `template` row) from its own Fill, a shop row (`'whole'`) from its whole Filled tree, and
// a `'page'` surface (404, search, archive) from the page copy's shell. Each builds through `wp-build-page.js --template` and
// is recorded as the site build records its own copies; a page whose template has a shell builds only what sits below it.
// A built header, footer or drawer (a page-map layout row) becomes its area's active layout, whatever the pointer named
// before (lib/site-run-layout.mjs, FR-48-55); a run whose `--only` leaves it out changes no pointer.
//   node scripts/computed-route/site-run.mjs <client> --site <target> [--only a,b] [--skip-stages inventory,walk]
//        [--stages inventory,propose,fill,build,walk] [--jobs 3] [--widths 1440,768,375] [--live-base <url>] [--with-content]
// Output: sites/<client>/build/qa/site-run/<stamp>/status.json (rewritten after every stage) and <surface>.<stage>.log.
// Fill and walks run <jobs> at a time; builds run one at a time (they write the site's database).
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { assertDraftPage, serveDraft } from './lib/draft.mjs';
import { readInventory } from './lib/skeleton-inventory.mjs';
import { permalinkOf } from './lib/fill-route.mjs';
import { skeletonPaths, inventoryStrips, proposeSurface } from './skeleton.mjs';
import { routeHash, withRoute } from './lib/fill-open.mjs';
import { isStatePage, stateRouteHash } from './lib/state-route.mjs';
import { savedInventoryOf, servedInventoryOf } from './lib/skeleton-saved-inventory.mjs';
import { openRunSession, readEnv } from './lib/wp-run-session.mjs';
import { isContentOnlySurface, isUnwalkedWooPage, wooContentRole } from './lib/site-build-plan.mjs';
import { rowKey, treeHash } from './lib/site-build-map.mjs';
import { deleteTestOrdersPhp, templateRecordPhp, testOrderPhp } from './lib/site-build-apply.mjs';
import { wpCommand, wpEvalRunner } from './lib/calibration-refs.mjs';
import { pointAfterBuild } from './lib/site-run-layout.mjs';
import { WHOLE_TREE, commonChain, contentUnder, copyFile, copyTree, readShell, splitShell, writeCopy } from './lib/template-copies.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const ALL_STAGES = [ 'inventory', 'propose', 'fill', 'build', 'walk' ];

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const stamp = () => new Date().toISOString().replace( /\.\d+Z$/, '' ).replace( /:/g, '-' );

// Runs a command, writes its output to `logFile` and resolves with { code, tail } (the last lines).
function run( cmd, args, { logFile, env = {}, cwd = REPO } ) {
	return new Promise( ( resolve ) => {
		const out = fs.createWriteStream( logFile );
		const child = spawn( cmd, args, { cwd, env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		child.stdout.pipe( out, { end: false } );
		child.stderr.pipe( out, { end: false } );
		child.on( 'close', ( code ) => {
			out.end();
			const lines = fs.readFileSync( logFile, 'utf8' ).trimEnd().split( /\r?\n/ );
			resolve( { code, tail: lines.slice( -4 ).join( ' | ' ).slice( 0, 600 ) } );
		} );
	} );
}

// A mutex: tasks passed to `exclusive` run one after another.
const queue = { tail: Promise.resolve() };
const exclusive = ( task ) => {
	const result = queue.tail.then( task );
	queue.tail = result.catch( () => {} );
	return result;
};

// The envFile value of a surface (never read for its secrets: only the site's address).
function liveBase( envFile, envKey ) {
	const line = fs.readFileSync( path.join( REPO, envFile ), 'utf8' ).split( /\r?\n/ ).find( ( l ) => l.startsWith( `WP_URL_${ envKey }=` ) );
	return line.slice( line.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ).replace( /\/+$/, '' );
}

// Where one surface is read: the draft route it opens at, the page-map row whose permalink is its live address, and why it is
// skipped (a content-only post surface runs only with `--with-content`). The route is the entry's `draftRoute` (a form's
// page, a post's route), else its page row's route, else its intake record's route. A post surface (`contentOnly`) and the
// single-post template (`fromPost`) are read at the post row's address; a form is read on its page, the page row carrying
// its `draftRoute`; any other surface at the page row its key names. `routing` (intake.json `routing`) names the adapter: a
// state-page draft is reached by state, so the hash is that state route (lib/state-route.mjs); a page-file draft is reached
// by the file the surface's `draftIndex` names, so it takes no hash.
export function surfaceReach( { key, entry, skel, rows, withContent = false, routing = null } ) {
	const routeName = ( r ) => String( r ?? '' ).replace( /^#?\/?/, '' );
	const postSlug = entry.fromPost ?? ( entry.contentOnly ? key : null );
	// A template copy Filled on its own is read at the row playing it (`copy.row`, a row key).
	const byRow = 'fill' === entry.copy?.from ? rows.find( ( r ) => rowKey( r ) === entry.copy.row ) : null;
	const own = byRow ?? ( postSlug ? rows.find( ( r ) => 'post' === r.postType && r.slug === postSlug ) : rows.find( ( r ) => 'page' === r.postType && ( r.slug === key || r.route === key ) ) );
	const named = entry.draftRoute && ! postSlug ? rows.find( ( r ) => 'page' === r.postType && r.route === routeName( entry.draftRoute ) ) : null;
	const row = own ?? named ?? null;
	// A surface the manifest marks `noDraft` (one of WooCommerce's own pages the draft has no page for) has nothing to read.
	const skip = entry.noDraft ?? ( isContentOnlySurface( entry ) && ! withContent ? 'content-only post surface: pass --with-content to read its post content' : null );
	// A state-page draft ignores a route hash: its route is the state fragment Fill, the inventory read and the walker set on the loaded draft.
	const at = ( r ) => ( 'files' === routing?.adapter ? '' : isStatePage( routing ) ? ( stateRouteHash( r ) ? `#${ stateRouteHash( r ) }` : '' ) : routeHash( r ) ?? '' );
	const hash = entry.draftRoute ? at( entry.draftRoute ) : own && [ 'page', 'template' ].includes( own.postType ) ? ( 'home' !== own.route ? at( own.route ) : '' ) : at( skel?.route );
	return { row, hash, skip };
}

// The live address of a row: a page or post's permalink; a `template` row's template where WordPress shows it (the search
// results for any query, the not-found page for an address nothing holds, the order confirmation at the run's test order,
// `shown`: template slug -> address), or null when the run has none.
export function liveAddress( row, rows, shown = {} ) {
	if ( 'template' !== row?.postType ) {
		return row ? permalinkOf( row, rows ) : '/';
	}
	return { search: '/?s=sgs', 404: '/sgs-no-such-page/', ...shown }[ row.template ] ?? null;
}

// Whether the run reads the order confirmation, which shows only at an order's received page.
export const needsTestOrder = ( surfaces, keys ) => keys.some( ( k ) => 'order-confirmation' === surfaces[ k ]?.target?.template && 'fill' === surfaces[ k ]?.copy?.from );

// The path and query of the received page a test order reply names ({ url }), or null for a reply with no url.
export const orderAddress = ( reply ) => ( reply?.url ? ( ( u ) => `${ u.pathname }${ u.search }` )( new URL( reply.url ) ) : null );

// The surfaces a run covers: the named ones, plus each template copy a named page's content sits in (its shell decides what
// the page's post holds) and, with the page copy, the copies built from its shell.
export function runKeys( surfaces, only ) {
	const keys = Object.keys( surfaces ).filter( ( k ) => ! only || only.includes( k ) );
	if ( ! only ) {
		return keys;
	}
	const add = ( k ) => k && Object.hasOwn( surfaces, k ) && ! keys.includes( k ) && keys.push( k );
	[ ...keys ].forEach( ( k ) => surfaces[ k ].shell && add( `template-${ surfaces[ k ].shell }` ) );
	keys.includes( 'template-page' ) && Object.keys( surfaces ).filter( ( k ) => 'page' === surfaces[ k ].copy?.from ).forEach( add );
	return keys;
}

// The copy trees from the pass's Filled trees (`filled`: surface key -> tree): { slug: { tree, shell } } for every
// template surface in `keys`. A 'pages' copy takes the shell its pages share, each page's own shell from this run or as
// the copy last recorded it; 'page' copies take the page copy's shell; `buildDir` holds the recorded shells.
export function copyTrees( { surfaces, keys, filled, buildDir } ) {
	const out = {};
	const shellOf = ( slug ) => out[ slug ]?.shell ?? readShell( buildDir, slug );
	const order = [ 'whole', 'fill', 'pages', 'page' ];
	const mine = keys.filter( ( k ) => surfaces[ k ].copy && surfaces[ k ].target?.template ).sort( ( a, b ) => order.indexOf( surfaces[ a ].copy.from ) - order.indexOf( surfaces[ b ].copy.from ) );
	for ( const key of mine ) {
		const e = surfaces[ key ];
		const slug = e.target.template;
		const from = e.copy.from;
		if ( 'whole' === from || 'fill' === from ) {
			if ( filled[ key ] ) {
				out[ slug ] = 'whole' === from || WHOLE_TREE.includes( slug ) ? { tree: copyTree( { slug, whole: filled[ key ] } ), shell: null } : ( ( chain ) => ( { tree: copyTree( { slug, chain } ), shell: { chain, from: key } } ) )( splitShell( filled[ key ] ).chain );
			}
		} else if ( 'pages' === from ) {
			const had = readShell( buildDir, slug )?.surfaces || {};
			const each = Object.fromEntries( e.copy.surfaces.map( ( k ) => [ k, filled[ k ] ? splitShell( filled[ k ] ).chain : had[ k ] ] ).filter( ( [ , c ] ) => c ) );
			if ( Object.keys( each ).length ) {
				const chain = commonChain( Object.values( each ) );
				out[ slug ] = { tree: copyTree( { slug, chain } ), shell: { chain, surfaces: each } };
			}
		} else if ( 'page' === from && shellOf( 'page' ) ) {
			out[ slug ] = { tree: copyTree( { slug, chain: shellOf( 'page' ).chain } ), shell: null };
		}
	}
	return out;
}

export async function main( argv ) {
	const client = argv[ 0 ];
	const flag = ( n, d = null ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : d );
	const site = flag( '--site' );
	if ( ! client || ! site ) {
		throw new Error( 'usage: site-run.mjs <client> --site <target> [--only a,b] [--stages ...] [--jobs 3] [--widths 1440,768,375] [--live-base <url>] [--with-content]' );
	}
	const stages = ( flag( '--stages' ) || ALL_STAGES.join( ',' ) ).split( ',' );
	const only = flag( '--only' ) ? flag( '--only' ).split( ',' ) : null;
	const jobs = Number( flag( '--jobs', '3' ) );
	const widths = flag( '--widths', '1440,768,375' );
	const liveOverride = flag( '--live-base' );
	const withContent = argv.includes( '--with-content' );
	const build = path.join( REPO, 'sites', client, 'build' );
	const surfaces = readJson( path.join( build, 'surfaces.json' ) );
	const rows = readJson( path.join( build, 'page-map.json' ) );
	const intake = readJson( path.join( build, 'intake', 'intake.json' ) );
	const keys = runKeys( surfaces, only );
	const dir = path.join( build, 'qa', 'site-run', stamp() );
	fs.mkdirSync( dir, { recursive: true } );
	const status = {};
	const save = () => fs.writeFileSync( path.join( dir, 'status.json' ), `${ JSON.stringify( status, null, 2 ) }\n` );
	const note = ( key, stage, ok, ms, detail ) => {
		( status[ key ] ||= {} )[ stage ] = { ok, seconds: Math.round( ms / 1000 ), ...( detail ? { detail } : {} ) };
		save();
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ key } ${ stage } ${ Math.round( ms / 1000 ) }s${ detail ? ` - ${ detail }` : '' }` );
	};
	// One draft server per draft file, serving that file as its index (a page-file draft has one file per page; a hash or
	// state-page draft names one entry file for every surface).
	const servers = new Map();
	const serverFor = ( entry ) => {
		const id = `${ entry.draftDir }|${ entry.draftIndex }`;
		servers.has( id ) || servers.set( id, serveDraft( assertDraftPage( path.join( REPO, entry.draftDir ), entry.draftIndex ), { index: entry.draftIndex } ) );
		return servers.get( id );
	};
	const certs = process.env.NODE_EXTRA_CA_CERTS || 'C:\\Users\\Bean\\AppData\\Roaming\\Python\\Python313\\site-packages\\certifi\\cacert.pem';

	// The stage runner of one surface: a stage not asked for counts as passed; a WooCommerce page's own Fill and build are
	// skipped and its walk then stops (a failed stage stops the surface).
	const stepper = ( key, wooPage ) => async ( stage, fn ) => {
		if ( ! stages.includes( stage ) ) {
			return true;
		}
		// Fill writes block settings and the walker pairs the draft with the blocks Fill wrote: WooCommerce renders these
		// pages itself, so neither applies to the page's content; its layout is its template copy's surface.
		if ( wooPage && [ 'fill', 'build', 'walk' ].includes( stage ) ) {
			note( key, stage, true, 0, `skipped: WooCommerce's own ${ wooPage } page keeps WooCommerce's content (its layout is the template-<slug> surface)` );
			return 'walk' !== stage;
		}
		const t = Date.now();
		try {
			const r = await fn();
			note( key, stage, true, Date.now() - t, r );
			return true;
		} catch ( e ) {
			note( key, stage, false, Date.now() - t, String( e.message || e ).slice( 0, 600 ) );
			return false;
		}
	};
	const execFor = ( key ) => async ( stage, cmd, args, env ) => {
		const r = await run( cmd, args, { logFile: path.join( dir, `${ key }.${ stage }.log` ), env } );
		if ( 0 !== r.code ) {
			throw new Error( `exit ${ r.code }: ${ r.tail }` );
		}
		return r.tail.split( ' | ' ).pop();
	};

	// Pass 1: inventory, propose and Fill. Resolves with what pass 2 needs, or null when the surface stopped.
	async function prepare( key ) {
		const entry = surfaces[ key ];
		// A copy from its pages' shell or the page copy's reads no draft: it is made between the passes.
		if ( [ 'pages', 'page' ].includes( entry.copy?.from ) ) {
			return { key, entry, row: null };
		}
		const skel = intake.skeletons?.[ entry.intakeSurface ];
		const kind = skel?.kind;
		const { row, hash, skip } = surfaceReach( { key, entry, skel, rows, withContent, routing: intake.routing ?? null } );
		if ( skip ) {
			note( key, 'skipped', true, 0, skip );
			return null;
		}
		const draftUrl = `${ ( await serverFor( entry ) ).url }${ hash }`;
		// WooCommerce's own cart and checkout pages keep WooCommerce's content (lib/site-build-plan.mjs::keepsWooContent): they
		// are never Filled or built over; a template copy read at one of them is. The account page is Filled like any page.
		const wooPage = isUnwalkedWooPage( entry.target, row ) ? wooContentRole( row ) : null;
		const base = liveOverride ? liveOverride.replace( /\/+$/, '' ) : liveBase( entry.envFile, entry.envKey );
		const address = liveAddress( row, rows, shown );
		const liveUrl = `${ base }${ address ?? '/' }`;
		const step = stepper( key, wooPage );
		const exec = execFor( key );
		if ( ! entry.intakeSurface || ! skel ) {
			return note( key, 'inventory', false, 0, 'no intake surface: no handoff record matched' );
		}
		const p = skeletonPaths( { client, surface: key } );
		const saved = path.join( build, 'intake', 'inventories', `${ entry.intakeSurface }.json` );
		// A state-driven surface and a form (read on its page, with no root selector of its own) take the inventory intake saved.
		const stateOnly = !! skel.root?.viaState;
		const fromSaved = stateOnly || 'form' === kind;
		const root = fromSaved ? null : skel.root?.tag;
		if ( ! root && ! ( fromSaved && fs.existsSync( saved ) ) && ! fs.existsSync( p.inventory ) ) {
			return note( key, 'inventory', false, 0, fromSaved ? `no saved intake inventory for the ${ stateOnly ? 'state-driven ' : '' }${ kind } surface (${ path.relative( REPO, saved ) })` : `the intake record names no root element for a ${ kind } surface` );
		}
		if ( ! await step( 'inventory', async () => {
			if ( fromSaved ) {
				const entryDraft = ( intake.inventory?.animations?.drafts || [] ).find( ( d ) => d.file === path.basename( entry.draftIndex ) ) || intake.inventory?.animations?.drafts?.[ 0 ];
				const inv = stateOnly ? servedInventoryOf( readJson( saved ), entryDraft?.dc ?? null ) : savedInventoryOf( { repo: REPO, client, surface: key, surfaces, intake } );
				fs.mkdirSync( path.dirname( p.inventory ), { recursive: true } );
				fs.writeFileSync( p.inventory, `${ JSON.stringify( inv, null, 2 ) }
` );
				return `${ inv.elements.length } elements (intake's inventory${ stateOnly ? ' with the state open' : '' }, in the served key space)`;
			}
			const inv = await readInventory( { url: draftUrl, root, shotsDir: p.shots, strips: inventoryStrips( { client, surface: key } ) } );
			fs.mkdirSync( path.dirname( p.inventory ), { recursive: true } );
			fs.writeFileSync( p.inventory, `${ JSON.stringify( inv, null, 2 ) }
` );
			return `${ inv.elements.length } elements`;
		} ) ) {
			return;
		}
		if ( ! await step( 'propose', async () => {
			const r = proposeSurface( { client, surface: key } );
			if ( r.problems.length ) {
				throw new Error( r.problems.join( '; ' ).slice( 0, 500 ) );
			}
			return `${ r.proposal.counts.skeletonNodes } nodes, ${ r.proposal.counts.low } low`;
		} ) ) {
			return;
		}
		const out = path.join( build, 'qa', 'fill', key, stamp() );
		let walkUrl = draftUrl;
		if ( ! await step( 'fill', async () => {
			const tail = await exec( 'fill', 'node', [ 'scripts/computed-route/fill.mjs', '--client', client, '--surface', key,
				'--skeleton', path.relative( REPO, p.skeleton ), '--draft-url', draftUrl, '--live-url', liveUrl, '--allow-external', '--out', path.relative( REPO, out ) ] );
			// A state that never rendered is an opener failure, not a Fill that happened to run.
			const opened = path.join( out, 'opener.json' );
			const o = fs.existsSync( opened ) ? readJson( opened ) : null;
			if ( o && ! o.widthsOpen.length ) {
				throw new Error( `opener failure: ${ o.refused.map( ( r ) => r.reason ).join( '; ' ).slice( 0, 400 ) }` );
			}
			walkUrl = o?.route ? withRoute( draftUrl, o.route, intake.routing ?? null ) : draftUrl;
			return o ? `${ tail } (state "${ o.state }" open at ${ o.widthsOpen.join( ', ' ) }px)` : tail;
		} ) ) {
			return;
		}
		const parity = path.join( build, 'qa', 'parity' );
		fs.mkdirSync( parity, { recursive: true } );
		for ( const f of [ entry.walker, entry.walkerFull ] ) {
			const src = path.join( out, path.basename( f ) );
			if ( fs.existsSync( src ) ) {
				fs.writeFileSync( path.join( parity, path.basename( f ) ), fs.readFileSync( src, 'utf8' ).replace( '"../../../divergences.json"', '"../divergences.json"' ) );
			}
		}
		const filledFile = path.join( out, 'filled.tree.json' );
		return { key, entry, row, wooPage, step, exec, out, walkUrl, address, filled: fs.existsSync( filledFile ) ? readJson( filledFile ) : null };
	}

	// Pass 2: the build (one at a time: builds write the site's database) and the walk. A template copy builds the tree made
	// between the passes and is recorded as the site build's own; a page under a template with a shell builds what sits
	// below that shell; every other surface builds its Filled tree.
	async function finish( ctx ) {
		const { key, entry } = ctx;
		const step = ctx.step || stepper( key, null );
		const exec = ctx.exec || execFor( key );
		const slug = entry.target?.template;
		let tree;
		if ( slug ) {
			if ( ! copies[ slug ] ) {
				return note( key, 'build', false, 0, `no ${ slug } copy was made: ${ { pages: 'none of its pages has a Filled tree', page: 'the page copy has no recorded shell', fill: 'its Fill wrote no tree', whole: 'its Fill wrote no tree' }[ entry.copy?.from ] || 'it names no copy source' }` );
			}
			tree = path.relative( REPO, copyFile( build, slug ) );
		} else if ( ! ctx.filled ) {
			tree = path.relative( REPO, path.join( ctx.out, 'filled.tree.json' ) );
		} else if ( entry.shell ) {
			const chain = copies[ entry.shell ]?.shell?.chain ?? readShell( build, entry.shell )?.chain ?? [];
			try {
				const file = path.join( ctx.out, 'content.tree.json' );
				fs.writeFileSync( file, `${ JSON.stringify( contentUnder( ctx.filled, chain ), null, 2 ) }\n` );
				tree = path.relative( REPO, file );
			} catch ( e ) {
				return note( key, 'build', false, 0, `${ e.message }: its post would repeat the ${ entry.shell } copy's shell; run the copy's surface (template-${ entry.shell }) with this page` );
			}
		} else {
			tree = path.relative( REPO, path.join( ctx.out, 'filled.tree.json' ) );
		}
		const builder = [ 'scripts/wp-build-page.js', '--env-file', entry.envFile, '--env-key', entry.envKey, '--tree', tree, ...( slug ? [ '--template', slug ] : [ '--post-id', String( entry.target.postId ) ] ) ];
		if ( ! await step( 'build', () => exclusive( async () => {
			await exec( 'dry', 'node', [ ...builder, '--dry-run' ] );
			const said = await exec( 'build', 'node', builder );
			// Recorded as the site build records its own copies, so a later site build sees it as built from this tree.
			slug && recordTemplate( slug, treeHash( readJson( path.join( REPO, tree ) ) ) );
			// A built header, footer or drawer becomes the site's active one (lib/site-run-layout.mjs).
			const pointed = slug ? null : pointAfterBuild( { entry, rows, wp } );
			pointed && console.log( `${ key } ${ pointed }` );
			return pointed ? `${ said }; ${ pointed }` : said;
		} ) ) ) {
			return;
		}
		if ( [ 'pages', 'page' ].includes( entry.copy?.from ) || ( slug && entry.copy && null === ctx.address ) ) {
			return note( key, 'walk', true, 0, 'pages' === entry.copy?.from ? `skipped: walked with its pages (${ entry.copy.surfaces.join( ', ' ) })` : 'page' === entry.copy?.from ? 'skipped: no draft surface plays it' : `skipped: the ${ slug } template shows only at a WooCommerce endpoint` );
		}
		const parity = path.join( build, 'qa', 'parity' );
		await step( 'walk', () => exec( 'walk', 'node', [ 'scripts/parity/draft-live-walk.mjs', path.join( parity, path.basename( entry.walkerFull ) ),
			'--out', path.join( parity, 'out', key ), '--widths', widths, '--headless', '--no-review' ], { SGS_DRAFT_URL: ctx.walkUrl, NODE_EXTRA_CA_CERTS: certs } ).catch( ( e ) => {
			// The walker exits 1 for open differences; the report is what counts.
			if ( fs.existsSync( path.join( parity, 'out', key, 'report.json' ) ) ) {
				return `report written (${ String( e.message ).slice( 0, 200 ) })`;
			}
			throw e;
		} ) );
	}

	// The site's wp-cli for recording template copies and setting the active layouts (a local mirror's runs in WSL,
	// calibration-targets.json `pluginDir`).
	const targetsFile = path.join( REPO, 'scripts', 'computed-route', 'calibration-targets.json' );
	const target = ( fs.existsSync( targetsFile ) ? readJson( targetsFile )[ site ] : null ) || {};
	const runPhp = wpEvalRunner( target, site, REPO );
	const wp = wpCommand( target, site, REPO );
	const recordTemplate = ( slug, hash ) => runPhp( templateRecordPhp( slug, hash ) );

	const pool = async ( list, fn ) => {
		const pending = [ ...list ];
		const results = [];
		await Promise.all( Array.from( { length: jobs }, async () => {
			while ( pending.length ) {
				const item = pending.shift();
				const key = item?.key ?? item;
				try {
					results.push( await fn( item ) );
				} catch ( e ) {
					note( key, 'run', false, 0, String( e.message || e ).slice( 0, 400 ) );
				}
			}
		} ) );
		return results;
	};
	// The order confirmation is read at a real order: one test order (pending, so no email) for the run, deleted at its end.
	const shown = {};
	// Every template copy's tree, made between the passes (finish builds from it).
	let copies = {};
	if ( needsTestOrder( surfaces, keys ) ) {
		const reply = JSON.parse( String( runPhp( testOrderPhp() ) ).trim().split( /\r?\n/ ).pop() );
		shown[ 'order-confirmation' ] = orderAddress( reply );
		console.log( reply.error ? `test order: none (${ reply.error }); the order confirmation is not read` : `test order ${ reply.id }: ${ shown[ 'order-confirmation' ] }` );
	}
	try {
		const ready = ( await pool( keys, prepare ) ).filter( Boolean );
		// Between the passes: every template copy's tree, from this run's Filled trees and the shells recorded before.
		const filled = Object.fromEntries( ready.filter( ( c ) => c.filled ).map( ( c ) => [ c.key, c.filled ] ) );
		copies = copyTrees( { surfaces, keys, filled, buildDir: build } );
		for ( const [ slug, c ] of Object.entries( copies ) ) {
			writeCopy( build, slug, c.tree, c.shell );
			console.log( `copy ${ slug }: ${ path.relative( REPO, copyFile( build, slug ) ) }${ c.shell ? ` (shell of ${ c.shell.chain.length } wrapper${ 1 === c.shell.chain.length ? '' : 's' })` : '' }` );
		}
		// One logged-in browser for every build of the run (lib/wp-run-session.mjs): each wp-build-page.js child attaches through
		// SGS_CDP_URL instead of launching and logging in on its own.
		const withEnv = keys.map( ( k ) => surfaces[ k ] ).find( ( e ) => e?.envFile && e?.envKey );
		const session = stages.includes( 'build' ) && withEnv ? await openRunSession( site, readEnv( withEnv.envFile, withEnv.envKey ) ) : null;
		// The template copies build first, so a page never shows its content-only post inside the theme's generic template.
		const rank = ( c ) => ( c.entry.target?.template ? 0 : 1 );
		await pool( ready.sort( ( a, b ) => rank( a ) - rank( b ) ), finish );
		session && await session.close();
	} finally {
		Object.hasOwn( shown, 'order-confirmation' ) && console.log( `test orders deleted: ${ String( runPhp( deleteTestOrdersPhp() ) ).trim().split( /\r?\n/ ).pop() }` );
		await Promise.all( [ ...servers.values() ].map( async ( x ) => ( await x ).close() ) );
	}
	const failed = Object.entries( status ).filter( ( [ , s ] ) => Object.values( s ).some( ( x ) => ! x.ok ) );
	console.log( `site run ${ client }: ${ keys.length } surfaces, ${ failed.length } with a failed stage. ${ path.join( dir, 'status.json' ) }` );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
