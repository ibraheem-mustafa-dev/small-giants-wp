// The foundation command's steps (build-foundation.mjs): what it takes to give one client a foundation on one site, in the order it must happen.
// Each step is for lib/foundation-run.mjs (applicable, holds, run, fingerprint); everything that touches a machine, a command or a site goes
// through `ctx.ports`, so the whole chain runs under test with fakes:
//   exec( id, cmd, args ) resolves { code, tail }; launch( args ) is lib/site-run-launch.mjs::launchSiteRun for site-run.mjs;
//   sourceCheckout() is the folder holding the gitignored intake files; buildState() { present, stale }, buildsDiffer() { differs, detail },
//   buildDigest() are the plugin build and the site's copy of it; syncDigest() is one digest of everything the sync copies; hostedPush( site ) { ssh, host } is the hosted site's push target;
//   plus the preflight probes (freeBytes, wslAnswers, credentials, restCheck).
// The order, and what each step holds when it is already done:
//   preflight        the checks of lib/foundation-preflight.mjs; never skipped.
//   handoff-check    handoff-check.mjs on the folder; held when MANIFEST.json is what it checked last.
//   intake-files     the gitignored facts.json, inventories/ and replay/ copied from the checkout that holds them, when its intake.json is this one's.
//   intake           intake.mjs (the draft read, with the first run's skeletons); held when intake.json carries the handoff's file hashes and the three
//                    gitignored files are there.
//   apply-review     intake.mjs --apply-review --go-through (Bean's marks optional); held when the state says intake.json is as it left it.
//   tokens           extract.py to sites/<client>/theme-snapshot.json when the client has none, else to a scratch file beside the state, compared with
//                    the committed one (lib/foundation-parts.mjs::tokenOutput); re-extracted when the handoff or intake.json is newer than the output.
//   plugin-build     npm run build (PowerShell, execution policy bypassed for this process so npm.ps1 runs) when the checkout's plugin build is missing or older than its sources; a local copy only.
//   sync             sync-build.sh: the plugin, the theme and the snapshot's theme.json onto a local copy; held when the copy's blocks equal the build
//                    and every part the sync copies (ports.syncDigest) is what the last sync copied.
//   snapshot-push    push-theme-snapshot.py to a hosted site (a local copy takes the snapshot with the sync).
//   site-info        provision-site-info-from-draft.py --intake --apply on the site (a copy through WSL, never its test site).
//   media            media-upload.mjs --apply: the handoff's pictures into the site's library and the record the readers look up.
//   catalogue        site-build.mjs --catalogue --apply (FR-48-92): every product of the draft catalogue (catalogue.json) made on the site, or found by
//                    its SKU, and its id recorded in catalogue.json `sites.<site>`, which the skeletons' product cards and the site build's product
//                    menu links read; for any client whose catalogue lists a product, on any site; held when the catalogue, the media map and the
//                    site's recorded ids are as it last left them.
//   site-build       site-build.mjs --apply: every page-map row's post, menus and layout; held when every row has its id on this site.
//   manifest         manifest.mjs --apply: surfaces.json; held when every layout row has a surface.
//   fixtures         shop-fixtures.mjs --apply: the route's own test products made if missing and hidden from the shop, for a client whose page map
//                    has a shop or product row, on a fixture site only (lib/shop-fixture-sites.mjs).
//   looks            plugins/sgs-blocks/scripts/site-look/site_look.py --all: every block's site look for the client from its committed snapshot,
//                    offline (no site), with lib/setting-record.mjs::lookJobs workers (SGS_LOOK_JOBS overrides), with the shop stylesheet when the page map has a shop (lib/setting-record.mjs::runsShop); the builder
//                    skips a look whose key has not moved; held when the snapshot, the block build, the fixtures and the builder are as last built.
//   skeletons        intake.mjs --rerun-skeletons then --apply-review --go-through, only when this run read the draft or rebuilt the looks.
//   surfaces         lib/clone-surface.mjs::cloneSurfaces on the header, footer and nav drawer (the basket drawer is the header's cart block), Solve included
//                    when the ports carry `solve`; `--picks <file>` is applied first.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { applyPicksFile, cloneSurfaces } from './clone-surface.mjs';
import { distroOf, runPreflight } from './foundation-preflight.mjs';
import { heldByState } from './foundation-run.mjs';
import { intakeCurrent, layoutSurfaces, pageMapBuilt, snapshotDiff, tokenOutput, wslPath } from './foundation-parts.mjs';
import { runsShop, LOOK_JOBS, lookJobs } from './setting-record.mjs';
import { FIXTURE_SITES } from './shop-fixture-sites.mjs';
import { fixtureDefs } from './shop-fixtures.mjs';
import { mediaAssets } from './media-upload.mjs';
import { catalogueProducts } from './site-build-catalogue.mjs';

export const STEP_IDS = [ 'preflight', 'handoff-check', 'intake-files', 'intake', 'apply-review', 'tokens', 'plugin-build', 'sync', 'snapshot-push', 'site-info', 'media', 'catalogue', 'site-build', 'manifest', 'fixtures', 'looks', 'skeletons', 'surfaces' ];
const ROUTE = 'scripts/computed-route';
// The site look builder's worker processes (each renders a block's instances offline).
export { LOOK_JOBS };

export const sha = ( data ) => crypto.createHash( 'sha256' ).update( data ).digest( 'hex' );
const fileSha = ( file ) => ( fs.existsSync( file ) && fs.statSync( file ).isFile() ? sha( fs.readFileSync( file ) ) : null );
const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
const mtime = ( file ) => ( fs.existsSync( file ) ? fs.statSync( file ).mtimeMs : 0 );
const joinFp = ( ...parts ) => sha( parts.map( ( p ) => String( p ?? '' ) ).join( '|' ) );

// The command line of each step that runs one: [ command, args ], run from the repo root.
export const commands = {
	handoffCheck: ( { client } ) => [ 'node', [ `${ ROUTE }/handoff-check.mjs`, `sites/${ client }/handoff` ] ],
	intake: ( { client, record } ) => [ 'node', [ `${ ROUTE }/intake.mjs`, client, ...( record ? [ '--record' ] : [] ) ] ],
	applyReview: ( { client } ) => [ 'node', [ `${ ROUTE }/intake.mjs`, '--apply-review', client, '--go-through' ] ],
	rerunSkeletons: ( { client } ) => [ 'node', [ `${ ROUTE }/intake.mjs`, '--rerun-skeletons', client ] ],
	extract: ( { client, draft, out, trace } ) => [ 'python', [ 'plugins/sgs-blocks/scripts/theme-extractor/extract.py', '--client', client, '--draft', draft, '--intake', `sites/${ client }/build/intake/intake.json`, '--out', out, '--trace', trace ] ],
	pluginBuild: () => [ 'powershell', [ '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'Set-Location plugins/sgs-blocks; npm run build' ] ],
	sync: ( { site, repo, distro } ) => [ 'wsl', [ '-d', distro, '-u', 'root', '--', 'bash', `${ wslPath( repo ) }/scripts/local-wp/sync-build.sh`, site ] ],
	pushSnapshot: ( { client, ssh, host } ) => [ 'python', [ 'plugins/sgs-blocks/scripts/push-theme-snapshot.py', '--client', client, '--target', ssh, '--target-domain', host, '--yes' ] ],
	siteInfo: ( { client, site } ) => [ 'python', [ 'plugins/sgs-blocks/scripts/provision-site-info-from-draft.py', '--site', site, '--intake', `sites/${ client }/build/intake/intake.json`, '--handoff', `sites/${ client }/handoff`, '--apply' ] ],
	media: ( { client, site } ) => [ 'node', [ `${ ROUTE }/media-upload.mjs`, client, '--site', site, '--apply' ] ],
	catalogue: ( { client, site } ) => [ 'node', [ `${ ROUTE }/site-build.mjs`, client, '--site', site, '--catalogue', '--apply' ] ],
	siteBuild: ( { client, site } ) => [ 'node', [ `${ ROUTE }/site-build.mjs`, client, '--site', site, '--apply' ] ],
	manifest: ( { client, site } ) => [ 'node', [ `${ ROUTE }/manifest.mjs`, client, '--site', site, '--apply' ] ],
	hideFixtures: ( { client, site } ) => [ 'node', [ `${ ROUTE }/shop-fixtures.mjs`, client, '--site', site, '--apply' ] ],
	looks: ( { client, shop } ) => [ 'python', [ 'plugins/sgs-blocks/scripts/site-look/site_look.py', '--snapshot', `sites/${ client }/theme-snapshot.json`, '--site', client, '--out', `${ ROUTE }/site-look`, '--all', '--jobs', String( lookJobs() ), ...( shop ? [ '--woocommerce' ] : [] ) ] ],
};

// The one-line failure of a command that exited non-zero, with what to do next.
const failed = ( id, r, next ) => Object.assign( new Error( `${ id } exited ${ r.code }: ${ r.tail }` ), { next } );

// The steps for `ctx` ({ client, site, repo, targets, options, ports, log }).
export function buildSteps( ctx ) {
	const { client, site, repo, targets, ports } = ctx;
	const options = { replaceSnapshot: false, allowMissingPaint: [], allowUnpicked: false, picks: null, plan: false, ...ctx.options };
	const log = ctx.log ?? console.log;
	const target = targets[ site ];
	const distro = distroOf( target );
	const state = ctx.state ?? { steps: {} };
	const ran = ctx.ran ?? {};
	const at = ( ...p ) => path.join( repo, ...p );
	const build = at( 'sites', client, 'build' );
	const p = {
		manifest: at( 'sites', client, 'handoff', 'MANIFEST.json' ),
		intake: path.join( build, 'intake', 'intake.json' ),
		facts: path.join( build, 'intake', 'facts.json' ),
		inventories: path.join( build, 'intake', 'inventories' ),
		replay: path.join( build, 'intake', 'replay' ),
		confirmed: path.join( build, 'intake', 'page-map.confirmed.json' ),
		pageMap: path.join( build, 'page-map.json' ),
		pageMapSite: path.join( build, 'page-map.site' ),
		surfaces: path.join( build, 'surfaces.json' ),
		catalogue: path.join( build, 'catalogue.json' ),
		snapshot: at( 'sites', client, 'theme-snapshot.json' ),
		scratchSnapshot: path.join( build, 'foundation', 'theme-snapshot.extracted.json' ),
		scratchTrace: path.join( build, 'foundation', 'theme-snapshot.extracted.trace.json' ),
	};
	const hasDir = ( d ) => fs.existsSync( d ) && fs.readdirSync( d ).length > 0;
	const hasReplay = () => fs.existsSync( p.replay ) && fs.readdirSync( p.replay ).some( ( f ) => f.endsWith( '.har' ) );
	const gitignoredPresent = () => fs.existsSync( p.facts ) && hasDir( p.inventories ) && hasReplay();
	const heldBy = ( id, fp, reason ) => ( heldByState( state, id, fp ) ? reason : null );
	const cmd = async ( id, [ command, args ], next ) => {
		const r = await ports.exec( id, command, args );
		if ( 0 !== r.code ) {
			throw failed( id, r, next );
		}
		return r.tail;
	};
	const layout = () => layoutSurfaces( { rows: readJson( p.pageMap ) ?? [], surfaces: readJson( p.surfaces ) ?? {} } );
	const local = Boolean( distro );
	// A snapshot this command wrote as the client's own (the client had none) stays the extraction's target on later runs; `wrote` is this run's choice.
	let wrote = null;
	const out = () => ( 'committed' === ( wrote ?? state.steps.tokens?.to ) && ! options.replaceSnapshot
		? { to: 'committed', why: 'the extraction wrote this snapshot on an earlier run' }
		: tokenOutput( { committedExists: fs.existsSync( p.snapshot ), replace: options.replaceSnapshot, mainCheckout: fs.existsSync( at( '.git' ) ) && fs.statSync( at( '.git' ) ).isDirectory() } ) );
	const entryDraft = () => readJson( p.manifest )?.entry_drafts?.[ 0 ];
	const snapshotSha = () => fileSha( p.snapshot );
	// The looks' inputs: the snapshot, the block build, the fixtures the looks are drawn from and the builder (site_look.py keeps
	// its own per-block key as well, so a run whose inputs moved rebuilds only the looks whose key moved).
	// The builder's own code is site_look.py, its property list and the record modules it imports (site_look.py::builder_hash);
	// the theme's theme.json, functions.php and stylesheets are drawn under every look (setting-record/theme.py::theme_css).
	const filesIn = ( dir, test, recursive = true ) => ( fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true, recursive } ).filter( ( e ) => e.isFile() && test( e.name ) ).map( ( e ) => path.join( e.parentPath ?? e.path, e.name ) ).sort() : [] );
	const builderFiles = () => [
		...filesIn( at( 'plugins', 'sgs-blocks', 'scripts', 'site-look' ), ( n ) => 'site_look.py' === n || 'props.json' === n, false ),
		...filesIn( at( 'plugins', 'sgs-blocks', 'scripts', 'setting-record' ), ( n ) => n.endsWith( '.py' ) || 'fixtures.json' === n, false ),
		...[ 'theme.json', 'functions.php' ].map( ( n ) => at( 'theme', 'sgs-theme', n ) ),
		...filesIn( at( 'theme', 'sgs-theme', 'assets', 'css' ), ( n ) => n.endsWith( '.css' ) ),
	];
	const fixturesFp = () => joinFp( site, fileSha( p.pageMap ), sha( JSON.stringify( fixtureDefs( client ) ) ), fileSha( path.join( build, 'media-map.json' ) ) );
	// The draft catalogue's inputs and what the step recorded for this site: the catalogue without its per-site records (the step writes
	// them), the media map its pictures are found by, and the site's own product and attribute ids (a record removed runs it again).
	const catalogueOf = () => readJson( p.catalogue );
	const catalogueFp = () => {
		const c = catalogueOf();
		const { sites = {}, ...draft } = c ?? {};
		return joinFp( site, sha( JSON.stringify( draft ) ), fileSha( path.join( build, 'media-map.json' ) ), sha( JSON.stringify( [ sites[ site ]?.products ?? null, sites[ site ]?.attributes ?? null ] ) ) );
	};
	const looksFp = async () => joinFp( client, snapshotSha(), await ports.buildDigest(), ...builderFiles().map( ( f ) => `${ path.relative( repo, f ) }:${ fileSha( f ) }` ), runsShop( client, repo ) );
	const localOnly = ( what ) => ( local ? null : `${ site } is a hosted site: ${ what }` );

	const steps = [
		{
			id: 'preflight', always: true, title: 'the checks that would waste an hour of the run',
			run: async () => {
				const checks = await runPreflight( { client, site, repo, targets, probes: ports, deep: ! options.plan } );
				checks.forEach( ( c ) => log( `${ c.skipped ? 'skip' : c.warn ? 'warn' : c.ok ? 'ok  ' : 'FAIL' } pre-${ c.id } - ${ c.detail }${ c.ok ? '' : `; next: ${ c.next }` }` ) );
				const bad = checks.filter( ( c ) => ! c.ok );
				if ( bad.length ) {
					throw Object.assign( new Error( `${ bad.length } check${ 1 === bad.length ? '' : 's' } failed: ${ bad.map( ( c ) => c.id ).join( ', ' ) }` ), { next: bad[ 0 ].next } );
				}
				return `${ checks.filter( ( c ) => ! c.warn ).length } checks passed${ checks.some( ( c ) => c.warn ) ? ', with handoff warnings' : '' }`;
			},
		},
		{
			id: 'handoff-check', deps: [ 'preflight' ], title: 'handoff-check.mjs on the handoff folder',
			fingerprint: () => fileSha( p.manifest ),
			holds: () => heldBy( 'handoff-check', fileSha( p.manifest ), 'MANIFEST.json is what the check last passed' ),
			run: () => cmd( 'handoff-check', commands.handoffCheck( { client } ), `fix what the check names in sites/${ client }/handoff (or re-export the draft)` ),
		},
		{
			id: 'intake-files', deps: [ 'handoff-check' ], title: 'the gitignored intake files from the checkout that holds them',
			holds: () => ( gitignoredPresent() ? 'facts.json, inventories/ and replay/ are here' : null ),
			run: () => {
				const src = ports.sourceCheckout();
				const from = ( ...q ) => ( src ? path.join( src, 'sites', client, 'build', 'intake', ...q ) : null );
				if ( ! src || path.resolve( src ) === path.resolve( repo ) || ! fileSha( p.intake ) || ! fs.existsSync( from( 'facts.json' ) ) || fileSha( from( 'intake.json' ) ) !== fileSha( p.intake ) ) {
					return 'no checkout holds them for this intake.json; the intake step reads the draft and writes them';
				}
				fs.mkdirSync( path.dirname( p.facts ), { recursive: true } );
				const copied = [];
				for ( const name of [ 'facts.json', 'inventories', 'replay' ] ) {
					fs.existsSync( from( name ) ) && ( fs.cpSync( from( name ), path.join( path.dirname( p.facts ), name ), { recursive: true } ), copied.push( name ) );
				}
				return `copied ${ copied.join( ', ' ) } from ${ src }`;
			},
		},
		{
			id: 'intake', deps: [ 'intake-files' ], title: 'intake.mjs: the draft read, the page map, the palette, the skeletons',
			fingerprint: () => joinFp( fileSha( p.manifest ), fileSha( p.intake ) ),
			holds: () => ( intakeCurrent( { intake: readJson( p.intake ), manifest: readJson( p.manifest ) } ) && gitignoredPresent() ? 'intake.json carries this handoff\'s file hashes and its gitignored files are here' : null ),
			run: async () => {
				ran.intake = true;
				return cmd( 'intake', commands.intake( { client, record: ! hasReplay() } ), `read the stage log; intake takes one to two hours on a loaded machine, so rerun it alone: node ${ ROUTE }/intake.mjs ${ client } --record` );
			},
		},
		{
			id: 'apply-review', deps: [ 'intake' ], title: 'intake.mjs --apply-review --go-through',
			fingerprint: () => joinFp( fileSha( p.intake ), fileSha( p.confirmed ) ),
			holds: () => ( ran.intake ? null : heldBy( 'apply-review', joinFp( fileSha( p.intake ), fileSha( p.confirmed ) ), 'intake.json and the confirmed page map are as the review left them' )
				?? ( ! state.steps[ 'apply-review' ] && fs.existsSync( p.confirmed ) && readJson( p.intake )?.review?.length ? 'intake.json already carries review marks and a confirmed page map' : null ) ),
			run: () => cmd( 'apply-review', commands.applyReview( { client } ), 'a row the review cannot take is listed in build/intake/go-through-open.json; fix what the command names' ),
		},
		{
			id: 'tokens', deps: [ 'apply-review' ], title: 'extract.py: the draft\'s tokens as a theme snapshot',
			fingerprint: () => joinFp( fileSha( p.manifest ), fileSha( p.intake ), fileSha( out().to === 'committed' ? p.snapshot : p.scratchSnapshot ) ),
			record: () => ( { to: wrote } ),
			holds: () => {
				const to = out().to;
				const file = 'committed' === to ? p.snapshot : p.scratchSnapshot;
				if ( heldByState( state, 'tokens', joinFp( fileSha( p.manifest ), fileSha( p.intake ), fileSha( file ) ) ) ) {
					return `${ path.relative( repo, file ) } is current for this handoff and intake`;
				}
				const newest = Math.max( mtime( p.manifest ), mtime( p.intake ) );
				return ! state.steps.tokens && fs.existsSync( file ) && mtime( file ) >= newest && 'committed' !== to ? `${ path.relative( repo, file ) } is newer than the handoff and intake.json` : null;
			},
			run: async () => {
				const { to, why } = out();
				wrote = to;
				const draft = entryDraft();
				if ( ! draft ) {
					throw new Error( `${ path.relative( repo, p.manifest ) } names no entry draft` );
				}
				const dest = 'committed' === to ? p.snapshot : p.scratchSnapshot;
				fs.mkdirSync( path.dirname( dest ), { recursive: true } );
				await cmd( 'tokens', commands.extract( { client, draft: `sites/${ client }/handoff/${ draft }`, out: path.relative( repo, dest ), trace: path.relative( repo, 'committed' === to ? path.join( build, 'foundation', 'theme-extract-trace.json' ) : p.scratchTrace ) } ), 'the extractor HALTed: read its message (a draft that differs from the snapshot\'s source needs --replace-snapshot)' );
				if ( 'scratch' === to ) {
					const d = snapshotDiff( readJson( dest ), readJson( p.snapshot ) );
					return `${ why }: ${ d.equal } values equal, ${ d.differ } differ, ${ d.onlyA } only in the extraction, ${ d.onlyB } only in the committed one (${ path.relative( repo, dest ) })`;
				}
				return `${ why }: written to ${ path.relative( repo, dest ) }`;
			},
		},
		{
			id: 'plugin-build', deps: [ 'tokens' ], title: 'npm run build in plugins/sgs-blocks',
			applicable: () => localOnly( 'its build comes from build-deploy.py --target' ),
			holds: () => {
				const s = ports.buildState();
				return s.present && ! s.stale ? 'the checkout\'s plugin build is newer than its sources' : null;
			},
			run: () => cmd( 'plugin-build', commands.pluginBuild(), 'a worktree has no installed packages: copy them from a checkout that has them (.claude/dev-setup.md, clean worktree), then rerun; a half-written build stops the sync, so rerun the build whole' ),
		},
		{
			id: 'sync', deps: [ 'plugin-build', 'tokens' ], title: 'sync-build.sh: the plugin, the theme and the snapshot onto the copy',
			applicable: () => localOnly( 'its plugin and theme come from build-deploy.py --target, and its snapshot from push-theme-snapshot.py' ),
			fingerprint: async () => joinFp( snapshotSha(), await ports.buildDigest(), await ports.syncDigest() ),
			holds: async () => {
				const d = await ports.buildsDiffer();
				return ! d.differs && heldByState( state, 'sync', joinFp( snapshotSha(), await ports.buildDigest(), await ports.syncDigest() ) ) ? 'the copy\'s blocks equal the build, and the plugin, theme and snapshot are what the last sync copied' : null;
			},
			run: () => cmd( 'sync', commands.sync( { site, repo, distro } ), 'check WSL answers and the copy exists (scratch-mirror.sh list); a refused sync names the build it found' ),
		},
		{
			id: 'snapshot-push', deps: [ 'tokens' ], title: 'push-theme-snapshot.py to the hosted site',
			applicable: () => ( local ? `${ site } is a local copy: sync-build.sh installs the client's theme-snapshot.json as its theme.json` : null ),
			fingerprint: () => joinFp( snapshotSha(), site ),
			holds: () => heldBy( 'snapshot-push', joinFp( snapshotSha(), site ), 'the snapshot was pushed and has not changed' ),
			run: () => {
				const h = ports.hostedPush( site );
				return cmd( 'snapshot-push', commands.pushSnapshot( { client, ssh: h.ssh, host: h.host } ), 'the push script names the diff it refused' );
			},
		},
		{
			id: 'site-info', deps: [ 'apply-review', 'sync', 'snapshot-push' ], title: 'provision-site-info-from-draft.py: the business details',
			fingerprint: () => joinFp( fileSha( p.intake ), site ),
			holds: () => heldBy( 'site-info', joinFp( fileSha( p.intake ), site ), 'the confirmed Site Info rows were applied for this intake.json' ),
			run: () => cmd( 'site-info', commands.siteInfo( { client, site } ), 'the script lists each key it refused and why' ),
		},
		{
			id: 'media', deps: [ 'apply-review', 'sync', 'snapshot-push' ], title: 'media-upload.mjs: the handoff\'s pictures into the library',
			fingerprint: () => joinFp( sha( JSON.stringify( mediaAssets( repo, client ).map( ( f ) => [ f, fileSha( at( f ) ) ] ) ) ), site, fileSha( path.join( build, 'media-map.json' ) ) ),
			holds: () => heldBy( 'media', joinFp( sha( JSON.stringify( mediaAssets( repo, client ).map( ( f ) => [ f, fileSha( at( f ) ) ] ) ) ), site, fileSha( path.join( build, 'media-map.json' ) ) ), 'every picture was uploaded for this site and none has changed' ),
			run: () => cmd( 'media', commands.media( { client, site } ), `a 401 means the application password was refused: node ${ ROUTE }/tools/scratch-target.mjs list, then scratch-mirror.sh secrets ${ site }` ),
		},
		{
			// The client's own products (FR-48-92), on whatever site the foundation builds, before the site build: a product card on a page
			// that is not the shop carries the product id recorded here (lib/skeleton-carried.mjs::carriedIds product), and a product row's
			// menu entry links to the address recorded here (lib/site-build-menu-links.mjs). A product already on the site is found by its
			// SKU and only completed, so a copy of a site that holds them records their ids under its own name.
			id: 'catalogue', deps: [ 'media' ], title: 'site-build.mjs --catalogue --apply: the draft catalogue\'s products made on the site and their ids recorded',
			applicable: () => {
				const c = catalogueOf();
				return c && Array.isArray( c.products ) && catalogueProducts( c ).length ? null : 'catalogue.json lists no product';
			},
			fingerprint: () => catalogueFp(),
			holds: () => heldBy( 'catalogue', catalogueFp(), `the draft catalogue's products were made and their ids recorded for ${ site }` ),
			run: () => cmd( 'catalogue', commands.catalogue( { client, site } ), 'it names each product step a fresh read still plans; rerun it: it finds the products already made by their SKU' ),
		},
		{
			id: 'site-build', deps: [ 'media', 'site-info', 'catalogue' ], title: 'site-build.mjs --apply: every page-map row\'s post, the menus and the layout',
			fingerprint: () => joinFp( fileSha( p.pageMap ), site ),
			holds: () => ( pageMapBuilt( { rows: readJson( p.pageMap ), siteFile: fs.existsSync( p.pageMapSite ) ? fs.readFileSync( p.pageMapSite, 'utf8' ) : '', site, targets } ) ? `every page-map row has its id on ${ site }'s post ids` : null ),
			run: () => cmd( 'site-build', commands.siteBuild( { client, site } ), 'the build writes each row\'s id as it goes, so rerun it: it adopts the posts already made' ),
		},
		{
			id: 'manifest', deps: [ 'site-build' ], title: 'manifest.mjs --apply: surfaces.json',
			fingerprint: () => joinFp( fileSha( p.pageMap ), fileSha( p.surfaces ) ),
			holds: () => ( fs.existsSync( p.surfaces ) && layout().found.length > 0 && 0 === layout().missing.length ? 'every layout row has a surface in surfaces.json' : null ),
			run: () => cmd( 'manifest', commands.manifest( { client, site } ), 'it lists each row it could not settle' ),
		},
		{
			// The route's own test products are made when missing and catalogue-hidden (lib/shop-fixtures.mjs: a fixture found listed is hidden, a
			// missing one is made hidden), so a client's shop shows only the client's products. What the step makes is the fixture definitions
			// (their SKUs, prices, sizes) and the image the site's media map names, so a change to either runs it again.
			id: 'fixtures', deps: [ 'site-build' ], title: 'shop-fixtures.mjs --apply: the test products made if missing and hidden from the shop',
			applicable: () => ( ! runsShop( client, repo ) ? 'the page map has no shop or product row' : ! FIXTURE_SITES.includes( site ) ? `${ site } is not a fixture site (${ FIXTURE_SITES.join( ', ' ) })` : null ),
			fingerprint: () => fixturesFp(),
			holds: () => heldBy( 'fixtures', fixturesFp(), 'the test products were made and hidden for this page map and these fixture definitions' ),
			run: () => cmd( 'fixtures', commands.hideFixtures( { client, site } ), 'it names the product it could not hide' ),
		},
		{
			id: 'looks', deps: [ 'tokens', 'plugin-build', 'apply-review' ], title: `site_look.py --all: every block's site look for the client, offline`,
			fingerprint: () => looksFp(),
			holds: async () => heldBy( 'looks', await looksFp(), `every block's site look was built for this snapshot, block build, fixtures and builder` ),
			run: async () => {
				const shop = runsShop( client, repo );
				await cmd( 'looks', commands.looks( { client, shop } ), `site_look.py names each block it could not build (FAILED): fix that block's fixture or render, then rerun` );
				ran.looks = true;
				return `every block's site look is current for ${ client }${ shop ? ' (with the shop stylesheet)' : '' }`;
			},
		},
		{
			id: 'skeletons', deps: [ 'looks' ], title: 'intake.mjs --rerun-skeletons, then --apply-review --go-through',
			applicable: () => ( ran.intake || ran.looks ? null : 'this run neither read the draft nor rebuilt the site looks, so the skeleton records already carry their keys' ),
			run: async () => {
				await cmd( 'skeletons', commands.rerunSkeletons( { client } ), 'it proposes offline from the saved inventories: rerun it' );
				return cmd( 'skeletons', commands.applyReview( { client } ), 'a row the review cannot take is listed in build/intake/go-through-open.json' );
			},
		},
		{
			id: 'surfaces', deps: [ 'skeletons', 'looks', 'manifest' ], title: 'clone-surface: the header, footer and nav drawer',
			fingerprint: () => joinFp( site, fileSha( p.intake ), fileSha( p.surfaces ), snapshotSha() ),
			holds: () => heldBy( 'surfaces', joinFp( site, fileSha( p.intake ), fileSha( p.surfaces ), snapshotSha() ), 'the layout surfaces passed every stage for this intake.json and snapshot' ),
			run: async () => {
				const { found, missing } = layout();
				if ( missing.length || ! found.length ) {
					throw Object.assign( new Error( missing.length ? `no surface for the layout row${ 1 === missing.length ? '' : 's' } ${ missing.map( ( m ) => m.slug ).join( ', ' ) }` : 'the page map has no header, footer or drawer row' ), { next: `node ${ ROUTE }/manifest.mjs ${ client } --site ${ site } --apply` } );
				}
				const keys = found.map( ( s ) => s.key );
				if ( options.picks ) {
					const picked = await applyPicksFile( { repo, client, file: options.picks, exec: ( args ) => ports.exec( 'picks', 'node', [ `${ ROUTE }/intake.mjs`, ...args ] ) } );
					log( `${ picked.ok ? 'ok  ' : 'FAIL' } picks - ${ picked.detail }` );
					if ( ! picked.ok ) {
						throw Object.assign( new Error( picked.detail ), { next: 'fix the picks file (the shape intake.mjs --finalise names) and rerun with --picks' } );
					}
				}
				const v = await cloneSurfaces( { client, site, keys, intake: readJson( p.intake ), surfaces: readJson( p.surfaces ), run: ports.launch, solve: ports.solve ? ( { key } ) => ports.solve( { key, allowMissingPaint: options.allowMissingPaint } ) : null, allowMissingPaint: options.allowMissingPaint, allowUnpicked: options.allowUnpicked, log } );
				if ( ! v.ok ) {
					const picks = v.failed.some( ( l ) => / finalise: /.test( l ) );
					throw Object.assign( new Error( [ ...v.failed.map( ( l ) => `failed: ${ l }` ), ...v.skipped.map( ( l ) => `not run: ${ l }` ), ...v.missing ].join( '; ' ).slice( 0, 600 ) ), {
						next: picks
							? `run node ${ ROUTE }/intake.mjs --finalise ${ client }, dispatch an agent with ${ ROUTE }/prompts/skeleton-finaliser.md, run node ${ ROUTE }/intake.mjs --apply-picks ${ client }, then rerun this command; or rerun it with --allow-unpicked to go through on the writer's proposals`
							: `fix the first failure, then rerun this command (the steps before it are held), or run the surfaces alone: node ${ ROUTE }/clone-surface.mjs ${ client } --surface ${ keys.join( ',' ) } --site ${ site }`,
					} );
				}
				return `${ keys.join( ', ' ) }: every stage ran and passed`;
			},
		},
	];
	return steps;
}
