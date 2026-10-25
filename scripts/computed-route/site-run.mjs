#!/usr/bin/env node
// Phase 2 site run (Spec 48, plan 2026-10-23-cloning-tool-completion, Phase 2 step 4 and 5): every surface of one client
// through inventory, skeleton propose, Fill, the build's dry run, the build and the parity walk, with one status line per
// surface. A failed surface is logged and the run goes on. The draft folder is served once and each page surface opens at
// its hash route.
// A surface's inventory root and opener come from its intake skeleton record: a surface that exists only while a draft state
// holds (record `root.viaState`) takes the inventory intake saved with that state open
// (build/intake/inventories/<intakeSurface>.json) and Fill opens the same state (lib/fill-open.mjs); any other surface is read
// live at the tag of the record's root element, at its route.
//   node scripts/computed-route/site-run.mjs <client> --site <target> [--only a,b] [--skip-stages inventory,walk]
//        [--stages inventory,propose,fill,build,walk] [--jobs 3] [--widths 1440,768,375] [--live-base <url>]
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
import { servedKey, SERVED_ROOT } from './lib/key-space.mjs';

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

// An inventory intake saved, in the served draft's key space: intake names the entry draft's root host after its component
// (`<component>/<n>#<copy>`, an import's `<component>><Child>@...`), the served runtime names it `Root`, and Fill's finders resolve in the served space only.
export function servedInventory( inv, rootComponent ) {
	// A key of an imported component's element starts its chain with the entry component, which is `Root` when served.
	const served = ( key ) => servedKey( rootComponent && String( key ).startsWith( `${ rootComponent }>` ) ? `${ SERVED_ROOT }${ String( key ).slice( rootComponent.length ) }` : key, rootComponent );
	const own = ( e ) => ( e.template === rootComponent ? SERVED_ROOT : e.template );
	const checks = inv.checks ? { ...inv.checks, ...( inv.checks.rootName === rootComponent ? { rootName: SERVED_ROOT } : {} ), ...( inv.checks.rootKey ? { rootKey: served( inv.checks.rootKey ) } : {} ) } : inv.checks;
	return { ...inv, checks, elements: inv.elements.map( ( e ) => ( { ...e, key: served( e.key ), ...( e.parentKey ? { parentKey: served( e.parentKey ) } : {} ), template: own( e ) } ) ) };
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

// The hash a surface opens at (its page row's route, else its intake record's route), and the page row for the live address.
function routeOf( key, skel, rows ) {
	const row = rows.find( ( r ) => 'page' === r.postType && ( r.slug === key || r.route === key ) );
	return { row, hash: row ? ( 'home' !== row.route ? `#/${ row.route }` : '' ) : routeHash( skel?.route ) ?? '' };
}

export async function main( argv ) {
	const client = argv[ 0 ];
	const flag = ( n, d = null ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : d );
	const site = flag( '--site' );
	if ( ! client || ! site ) {
		throw new Error( 'usage: site-run.mjs <client> --site <target> [--only a,b] [--stages ...] [--jobs 3] [--widths 1440,768,375] [--live-base <url>]' );
	}
	const stages = ( flag( '--stages' ) || ALL_STAGES.join( ',' ) ).split( ',' );
	const only = flag( '--only' ) ? flag( '--only' ).split( ',' ) : null;
	const jobs = Number( flag( '--jobs', '3' ) );
	const widths = flag( '--widths', '1440,768,375' );
	const liveOverride = flag( '--live-base' );
	const build = path.join( REPO, 'sites', client, 'build' );
	const surfaces = readJson( path.join( build, 'surfaces.json' ) );
	const rows = readJson( path.join( build, 'page-map.json' ) );
	const intake = readJson( path.join( build, 'intake', 'intake.json' ) );
	const keys = Object.keys( surfaces ).filter( ( k ) => ! only || only.includes( k ) );
	const dir = path.join( build, 'qa', 'site-run', stamp() );
	fs.mkdirSync( dir, { recursive: true } );
	const status = {};
	const save = () => fs.writeFileSync( path.join( dir, 'status.json' ), `${ JSON.stringify( status, null, 2 ) }\n` );
	const note = ( key, stage, ok, ms, detail ) => {
		( status[ key ] ||= {} )[ stage ] = { ok, seconds: Math.round( ms / 1000 ), ...( detail ? { detail } : {} ) };
		save();
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ key } ${ stage } ${ Math.round( ms / 1000 ) }s${ detail ? ` - ${ detail }` : '' }` );
	};
	const first = surfaces[ keys[ 0 ] ];
	const server = await serveDraft( assertDraftPage( path.join( REPO, first.draftDir ), first.draftIndex ), { index: first.draftIndex } );
	const certs = process.env.NODE_EXTRA_CA_CERTS || 'C:\\Users\\Bean\\AppData\\Roaming\\Python\\Python313\\site-packages\\certifi\\cacert.pem';

	async function one( key ) {
		const entry = surfaces[ key ];
		const skel = intake.skeletons?.[ entry.intakeSurface ];
		const kind = skel?.kind;
		const { row, hash } = routeOf( key, skel, rows );
		const draftUrl = `${ server.url }${ hash }`;
		const base = liveOverride ? liveOverride.replace( /\/+$/, '' ) : liveBase( entry.envFile, entry.envKey );
		const liveUrl = row ? `${ base }${ permalinkOf( row, rows ) }` : `${ base }/`;
		const step = async ( stage, fn ) => {
			if ( ! stages.includes( stage ) ) {
				return true;
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
		const exec = async ( stage, cmd, args, env ) => {
			const r = await run( cmd, args, { logFile: path.join( dir, `${ key }.${ stage }.log` ), env } );
			if ( 0 !== r.code ) {
				throw new Error( `exit ${ r.code }: ${ r.tail }` );
			}
			return r.tail.split( ' | ' ).pop();
		};
		if ( ! entry.intakeSurface || ! skel ) {
			return note( key, 'inventory', false, 0, 'no intake surface: no handoff record matched' );
		}
		const p = skeletonPaths( { client, surface: key } );
		const saved = path.join( build, 'intake', 'inventories', `${ entry.intakeSurface }.json` );
		const stateOnly = !! skel.root?.viaState;
		const root = stateOnly ? null : skel.root?.tag;
		if ( ! root && ! ( stateOnly && fs.existsSync( saved ) ) && ! fs.existsSync( p.inventory ) ) {
			return note( key, 'inventory', false, 0, stateOnly ? `no saved intake inventory for the state-driven ${ kind } surface (${ path.relative( REPO, saved ) })` : `the intake record names no root element for a ${ kind } surface` );
		}
		if ( ! await step( 'inventory', async () => {
			if ( stateOnly ) {
				const entryDraft = ( intake.inventory?.animations?.drafts || [] ).find( ( d ) => d.file === path.basename( first.draftIndex ) ) || intake.inventory?.animations?.drafts?.[ 0 ];
				const inv = servedInventory( readJson( saved ), entryDraft?.dc ?? null );
				fs.mkdirSync( path.dirname( p.inventory ), { recursive: true } );
				fs.writeFileSync( p.inventory, `${ JSON.stringify( inv, null, 2 ) }
` );
				return `${ inv.elements.length } elements (intake's inventory with the state open, in the served key space)`;
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
			walkUrl = o?.route ? withRoute( draftUrl, o.route ) : draftUrl;
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
		const tree = path.relative( REPO, path.join( out, 'filled.tree.json' ) );
		const builder = [ 'scripts/wp-build-page.js', '--env-file', entry.envFile, '--env-key', entry.envKey, '--tree', tree, '--post-id', String( entry.target.postId ) ];
		if ( ! await step( 'build', () => exclusive( async () => {
			await exec( 'dry', 'node', [ ...builder, '--dry-run' ] );
			return exec( 'build', 'node', builder );
		} ) ) ) {
			return;
		}
		await step( 'walk', () => exec( 'walk', 'node', [ 'scripts/parity/draft-live-walk.mjs', path.join( parity, path.basename( entry.walkerFull ) ),
			'--out', path.join( parity, 'out', key ), '--widths', widths, '--headless', '--no-review' ], { SGS_DRAFT_URL: walkUrl, NODE_EXTRA_CA_CERTS: certs } ).catch( ( e ) => {
			// The walker exits 1 for open differences; the report is what counts.
			if ( fs.existsSync( path.join( parity, 'out', key, 'report.json' ) ) ) {
				return `report written (${ String( e.message ).slice( 0, 200 ) })`;
			}
			throw e;
		} ) );
	}

	const pending = [ ...keys ];
	await Promise.all( Array.from( { length: jobs }, async () => {
		while ( pending.length ) {
			const key = pending.shift();
			try {
				await one( key );
			} catch ( e ) {
				note( key, 'run', false, 0, String( e.message || e ).slice( 0, 400 ) );
			}
		}
	} ) );
	await server.close();
	const failed = Object.entries( status ).filter( ( [ , s ] ) => Object.values( s ).some( ( x ) => ! x.ok ) );
	console.log( `site run ${ client }: ${ keys.length } surfaces, ${ failed.length } with a failed stage. ${ path.join( dir, 'status.json' ) }` );
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	main( process.argv.slice( 2 ) ).catch( ( e ) => {
		console.error( e.message );
		process.exit( 1 );
	} );
}
