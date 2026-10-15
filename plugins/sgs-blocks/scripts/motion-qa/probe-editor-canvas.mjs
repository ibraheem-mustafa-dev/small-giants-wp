/**
 * Spec 38A unit M3.7 (FR-38A-28): the block editor shows motion at its final state, carries the shared motion
 * assets in the canvas iframe, mounts the motion panels and draws the preset thumbnails.
 *
 * Usage (repo root, after a deploy of M3.7 to the canary):
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-editor-canvas.mjs [--page 5223] [--site sandybrown] [--control-pages 5229,5244,2740]
 *
 * Page 5223 is the read-only motion-model fixture. The probe never saves a page: it aborts and records EVERY non-GET
 * request to /wp-json/ or ?rest_route=, fails on any recorded request other than the expected editor-preference write
 * (`/wp/v2/users/me`, from the preferences the probe sets in memory), and fails if the core data store holds a dirty
 * entity record. Credentials come from `.claude/secrets/<site>.env`.
 *
 * Every step runs inside `attempt`, so a locator that is not found or a page that did not load becomes an UNANSWERED row,
 * never a crash and never a pass. Stylesheets are read from their rules (the host's CSS optimiser combines and renames
 * sheets, so link names prove nothing); clickability is a viewport-clipped grid sample, not a point test.
 *
 * Checks (a check with a control has a negative control that must come out red; a control that stays green fails the run):
 *   scroll-entrance-opacity      every block with a scroll entrance: its motion targets, data-sgs-me elements, text and image
 *                                nodes are at opacity 1 (aria-hidden, .sgs-motion-layer and data-sgs-fx nodes excluded)
 *   scroll-entrance-selectable   the block is in view with a size, a share of it hits the block, and a real click on a point
 *                                that hits it selects it (or a block inside it)
 *   final-state-rule             with the reveal's hidden-start state forced on a block, the rule holds it at opacity 1
 *                                (control: the rule's stylesheet disabled, opacity 0)
 *   replay-wins                  the real Replay button on a root entrance moves the target (sampled per frame) and then
 *                                leaves no data-sgs-me or data-sgs-in (control: an unscoped important from-value rule
 *                                injected, no movement)
 *   iframe-stylesheet            the canvas iframe holds the motion rules
 *   front-end-guard              the public page holds the motion rules but no final-state rule and no thumbnail rules
 *                                (control: the editor iframe does carry the final-state rule)
 *   panel-mounts                 the Hover and Entrance panels' mount markers exist in the Styles tab of a motion block
 *                                (control: a named block type without supports.sgs.motion shows neither)
 *   hover-thumbnails / entrance-thumbnails   the panel draws a radio group; thumbnails are still until a radio is hovered
 *                                or keyboard-focused; the chosen one runs; a named radio runs on hover
 *   thumbnails-reduced           under prefers-reduced-motion nothing runs even hovered (control: it ran when allowed)
 *   console-errors / no-save     zero console errors; no save request; no dirty entity record
 * Exit: 0 all pass and every control red; 1 on any FAIL or a control that stayed green; 2 when only UNANSWERED rows remain.
 *
 * @package SGS\Blocks
 */
import { chromium } from 'playwright';
import {
	describePanel,
	judgeReplay,
	loadSite,
	locateClick,
	makeReporter,
	openPanel,
	openStyles,
	readBlockState,
	readPlan,
	readSheetFacts,
	readThumbs,
	sampleReplay,
} from './probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback );
const SITE_KEY = opt( '--site', 'sandybrown' );
const PAGE_ID = opt( '--page', '5223' );
const CONTROL_PAGES = opt( '--control-pages', '5229,5244,2740' ).split( ',' );
const site = loadSite( SITE_KEY );
const R = makeReporter();
const { verdict, control, unanswered, note, attempt } = R;

const EXPECTED_WRITE = /\/wp\/v2\/users\/me/;
const consoleErrors = [];
const writes = [];
const abortedUrls = new Set();
const browser = await chromium.launch();
const finish = async () => {
	await browser.close();
	if ( R.failures.length ) {
		console.log( `\n${ R.failures.length } failed: ${ R.failures.join( '; ' ) }` );
	}
	if ( R.unansweredRows.length ) {
		console.log( `\n${ R.unansweredRows.length } unanswered: ${ R.unansweredRows.join( '; ' ) }` );
	}
	const code = R.exitCode();
	if ( code === 0 ) console.log( '\nAll editor-canvas assertions passed.' );
	process.exit( code );
};

const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await context.newPage();
page.setDefaultTimeout( 15000 );
page.on( 'dialog', ( d ) => d.accept() );
page.on( 'console', ( m ) => {
	const url = m.location()?.url || '';
	const ownAbort = abortedUrls.has( url ) || [ ...abortedUrls ].some( ( aborted ) => m.text().includes( aborted ) );
	if ( m.type() === 'error' && ! ownAbort ) consoleErrors.push( `${ m.text().slice( 0, 200 ) } ${ url }`.trim() );
} );
page.on( 'pageerror', ( e ) => consoleErrors.push( String( e.message ).slice( 0, 240 ) ) );
await page.route( /\/wp-json\/|[?&]rest_route=/, ( route ) => {
	// GET, HEAD and the CORS preflight (OPTIONS) are not writes; POST, PUT, PATCH and DELETE are aborted and recorded.
	// A block-renderer POST is a read (server-side render previews are POSTed because GET URLs overflow), so it goes through.
	if ( [ 'GET', 'HEAD', 'OPTIONS' ].includes( route.request().method() ) || /\/wp\/v2\/block-renderer\//.test( route.request().url() ) ) return route.continue();
	writes.push( `${ route.request().method() } ${ route.request().url() }` );
	abortedUrls.add( route.request().url() );
	return route.abort();
} );

const openEditor = async ( id ) => {
	await page.goto( `${ site.url }/wp-admin/post.php?post=${ id }&action=edit`, { waitUntil: 'domcontentloaded' } );
	// Wait for THIS post's blocks, counted recursively, to be present and stable across two reads, in the post (not the template) view.
	const read = () => page.evaluate( () => {
		const editor = window.wp?.data?.select( 'core/editor' );
		const blocks = window.wp?.data?.select( 'core/block-editor' );
		return editor && blocks ? { postId: editor.getCurrentPostId(), mode: editor.getRenderingMode?.() ?? null, count: blocks.getClientIdsWithDescendants().length } : null;
	} );
	const deadline = Date.now() + 90000;
	let last = null;
	let loaded = null;
	while ( Date.now() < deadline ) {
		const now = await read().catch( () => null );
		if ( now && String( now.postId ) === String( id ) && now.mode && now.mode !== 'post-only' ) {
			await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).setRenderingMode( 'post-only' ) );
		} else if ( now && String( now.postId ) === String( id ) && now.count > 0 && last && last.count === now.count ) {
			loaded = now;
			break;
		}
		last = now;
		await page.waitForTimeout( 700 );
	}
	if ( ! loaded ) throw new Error( `the editor did not settle on post ${ id } with blocks (last read ${ JSON.stringify( last ) })` );
	// Preferences are set in memory; their persistence write is aborted and recorded as the one expected write.
	await page.evaluate( () => {
		window.wp.data.dispatch( 'core/preferences' ).set( 'core/edit-post', 'welcomeGuide', false );
		window.wp.data.dispatch( 'core/preferences' ).set( 'core/edit-post', 'fullscreenMode', false );
	} );
	await page.waitForSelector( 'iframe[name="editor-canvas"]', { timeout: 60000 } );
	const handle = await page.$( 'iframe[name="editor-canvas"]' );
	const frame = await handle.contentFrame();
	await frame.waitForSelector( '.is-root-container [data-block]', { timeout: 60000 } );
	await page.waitForTimeout( 1500 );
	return { handle, frame, loaded };
};

const loggedIn = await attempt( 'login', async () => {
	await page.goto( `${ site.url }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
	try {
		await page.locator( '#user_login' ).waitFor( { timeout: 15000 } );
	} catch ( e ) {
		throw new Error( `no login form (page title "${ await page.title() }", ${ page.url() })` );
	}
	await page.fill( '#user_login', site.user );
	await page.fill( '#user_pass', site.pass );
	await page.click( '#wp-submit' );
	await page.waitForLoadState( 'domcontentloaded' );
	return true;
} );
if ( ! loggedIn ) await finish();

const editor = await attempt( 'open-editor', () => openEditor( PAGE_ID ) );
if ( ! editor ) await finish();
const { handle: frameHandle, frame: canvas } = editor;
const plan = await attempt( 'read-plan', () => page.evaluate( readPlan ) );
if ( ! plan ) await finish();
const ready = plan.scrollBlocks.length > 0 && Boolean( plan.motionBlock ) && Boolean( plan.rootEntrance );
verdict( ready, 'fixture-has-what-the-probe-needs', { editor: editor.loaded, blocks: plan.total, scrollEntrances: plan.scrollBlocks.length, rootEntrance: Boolean( plan.rootEntrance ) } );
if ( ! ready ) {
	unanswered( 'checks-that-need-the-fixture', 'the fixture page has no scroll entrance, motion block or root entrance in the editor', { editor: editor.loaded, blocks: plan.total } );
	await finish();
}

// 1. Every scroll-entrance block is at its final state and selectable in the canvas.
await attempt( 'scroll-entrance-opacity', async () => {
	const states = [];
	for ( const block of plan.scrollBlocks ) states.push( await canvas.evaluate( readBlockState, [ block.id, block.selectors ] ) );
	verdict(
		states.every( ( s ) => s.found && s.counted > 0 && s.notOne === 0 ),
		'scroll-entrance-opacity',
		states.map( ( s ) => ( { id: s.id.slice( 0, 8 ), counted: s.counted, notOne: s.notOne, targets: s.targets } ) )
	);
} );
await attempt( 'scroll-entrance-selectable', async () => {
	const box = await frameHandle.boundingBox();
	const rows = [];
	for ( const block of plan.scrollBlocks ) {
		const located = await canvas.evaluate( locateClick, [ block.id ] );
		const row = { id: block.id.slice( 0, 8 ), ...located, point: undefined };
		if ( ! located.found || ! located.inView || ! located.point ) {
			rows.push( { ...row, why: ! located.found ? 'no element for the block' : ! located.inView ? 'not in view or zero size' : 'no sampled point hits the block' } );
			continue;
		}
		await page.mouse.click( box.x + located.point.x, box.y + located.point.y );
		row.selected = await page.evaluate( ( id ) => {
			const store = window.wp.data.select( 'core/block-editor' );
			const sel = store.getSelectedBlockClientId();
			return Boolean( sel && ( sel === id || store.getBlockParents( sel ).includes( id ) ) );
		}, block.id );
		rows.push( row );
	}
	const unmeasured = rows.filter( ( r ) => r.why && ( ! r.found || ! r.inView ) );
	if ( unmeasured.length ) {
		unanswered( 'scroll-entrance-selectable', 'the block could not be measured in the viewport', { rows: unmeasured } );
	}
	const measured = rows.filter( ( r ) => ! unmeasured.includes( r ) );
	if ( measured.length ) {
		verdict( measured.every( ( r ) => r.selected === true && r.insidePct > 0 ), 'scroll-entrance-selectable', measured );
	}
} );

// 2. The final-state rule: forced onto a block's element (attributes added and removed inside one evaluate).
await attempt( 'final-state-rule', async () => {
	const force = ( disableRule ) => canvas.evaluate( ( [ id, off ] ) => {
		const el = document.getElementById( `block-${ id }` );
		const rule = [ ...document.styleSheets ].find( ( s ) => s.ownerNode?.id === 'sgs-motion-inline-css' );
		const html = document.documentElement;
		const before = { cls: html.className, me: el.getAttribute( 'data-sgs-me' ) };
		if ( rule && off ) rule.disabled = true;
		html.classList.add( 'sgs-motion-ready' );
		el.setAttribute( 'data-sgs-me', 'scroll opacity' );
		el.style.setProperty( '--sgs-me-from-op', '0' );
		const out = { ruleFound: Boolean( rule ), opacity: getComputedStyle( el ).opacity };
		if ( rule ) rule.disabled = false;
		html.className = before.cls;
		if ( before.me === null ) el.removeAttribute( 'data-sgs-me' );
		else el.setAttribute( 'data-sgs-me', before.me );
		el.style.removeProperty( '--sgs-me-from-op' );
		return out;
	}, [ plan.scrollBlocks[ 0 ].id, disableRule ] );
	const on = await force( false );
	const off = await force( true );
	verdict( on.ruleFound && on.opacity === '1', 'final-state-rule', on );
	control( off.opacity === '0', 'final-state-rule', off );
} );

// 3. Replay through the real button: it moves the target and leaves it clean; an unscoped important rule stops the movement.
await attempt( 'replay-wins', async () => {
	if ( ! ( await openStyles( page, plan.rootEntrance ) ) ) throw new Error( 'no Styles tab for the root-entrance block' );
	await openPanel( page, 'entrance' );
	const button = page.locator( '.sgs-motion-panel--entrance' ).getByRole( 'button', { name: 'Replay', exact: true } ).first();
	await button.waitFor( { timeout: 8000 } );
	const once = async () => {
		const sampling = canvas.evaluate( sampleReplay, [ plan.rootEntrance, 3500 ] );
		await page.waitForTimeout( 150 );
		await button.click( { timeout: 8000 } );
		return judgeReplay( await sampling );
	};
	const played = await once();
	verdict( played.moved && played.restedClean, 'replay-wins', played );
	await canvas.evaluate( () => {
		const style = document.createElement( 'style' );
		style.id = 'probe-unscoped-final-state';
		style.textContent = '[data-sgs-me]{--sgs-me-from-op:1!important;--sgs-me-from-ty:0px!important;--sgs-me-from-tx:0px!important;--sgs-me-from-s:1!important;--sgs-me-from-blur:0px!important}';
		document.head.appendChild( style );
	} );
	try {
		control( ! ( await once() ).moved, 'replay-wins', { unscopedRuleInjected: true } );
	} finally {
		await canvas.evaluate( () => document.getElementById( 'probe-unscoped-final-state' )?.remove() );
	}
} );

// 4. Stylesheets, read from their rules.
await attempt( 'iframe-stylesheet', async () => {
	const facts = await canvas.evaluate( readSheetFacts );
	verdict( facts.motionRules && facts.rulesSeen > 0, 'iframe-stylesheet', facts );
} );
await attempt( 'front-end-guard', async () => {
	const publicContext = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	try {
		const publicPage = await publicContext.newPage();
		await publicPage.goto( `${ site.url }/?p=${ PAGE_ID }`, { waitUntil: 'networkidle' } );
		const front = await publicPage.evaluate( readSheetFacts );
		if ( front.rulesSeen === 0 || ( front.unreadable > 0 && ! front.motionRules ) ) {
			unanswered( 'front-end-guard', 'the public page stylesheets could not be read', front );
		} else {
			verdict( front.motionRules && ! front.finalStateRule && ! front.thumbRules, 'front-end-guard', front );
		}
	} finally {
		await publicContext.close();
	}
	control( ( await canvas.evaluate( readSheetFacts ) ).finalStateRule, 'front-end-guard', { editorIframeHasTheRule: true } );
} );
await attempt( 'thumbnails-stylesheet-in-admin', async () => {
	const facts = await page.evaluate( readSheetFacts );
	verdict( facts.thumbRules, 'thumbnails-stylesheet-in-admin', facts );
} );

// 5. The panels' mount markers in the Styles tab.
await attempt( 'panel-mounts', async () => {
	if ( ! ( await openStyles( page, plan.motionBlock ) ) ) throw new Error( 'no Styles tab for the motion block' );
	const mounts = await page.evaluate( () => ( { hover: Boolean( document.querySelector( '.sgs-motion-panel--hover' ) ), entrance: Boolean( document.querySelector( '.sgs-motion-panel--entrance' ) ) } ) );
	verdict( mounts.hover && mounts.entrance, 'panel-mounts', mounts );
} );

// 6. Thumbnails, per panel: a radio group; still until hovered or keyboard-focused; the chosen one runs.
const GROUPS = { hover: 'Hover state previews', entrance: 'Entrance previews' };
const thumbRun = async ( panel, label ) => {
	await openPanel( page, panel );
	const described = await page.evaluate( describePanel, panel );
	if ( ! described.radiogroups ) return { unanswered: 'the panel has no radiogroup', described };
	const group = page.locator( `.sgs-motion-panel--${ panel }` ).getByRole( 'radiogroup', { name: GROUPS[ panel ], exact: true } ).first();
	if ( ! ( await group.count() ) ) return { unanswered: `no radiogroup named "${ GROUPS[ panel ] }"`, described };
	const radio = group.getByRole( 'radio', { name: label, exact: true } ).first();
	if ( ! ( await radio.count() ) ) return { unanswered: `no radio named "${ label }"`, described };
	await page.mouse.move( 0, 0 );
	await page.waitForTimeout( 200 );
	const idle = await page.evaluate( readThumbs, panel );
	await radio.hover( { timeout: 5000 } );
	await page.waitForTimeout( 300 );
	const hovered = await radio.locator( '.sgs-motion-thumb__box' ).evaluate( ( b ) => b.getAnimations().some( ( a ) => a.playState === 'running' ) );
	await page.mouse.move( 0, 0 );
	const checked = group.locator( '[aria-checked="true"]' ).first();
	await ( ( await checked.count() ) ? checked : group.getByRole( 'radio' ).first() ).focus( { timeout: 5000 } );
	await page.keyboard.press( 'ArrowRight' );
	await page.waitForTimeout( 300 );
	const keyboard = await page.evaluate( () => {
		const box = document.activeElement?.querySelector( '.sgs-motion-thumb__box' );
		return { focusedIsRadio: document.activeElement?.getAttribute( 'role' ) === 'radio', running: Boolean( box && box.getAnimations().some( ( a ) => a.playState === 'running' ) ) };
	} );
	return { idle, hovered, keyboard, radios: described.radios.length };
};
const judge = ( run, min ) => run.idle.radios >= min && run.idle.count >= min && run.idle.inlineStyles === 0 && run.idle.running === run.idle.checkedRunning && run.idle.running <= 1 && run.hovered && run.keyboard.focusedIsRadio && run.keyboard.running;
const report = ( label, run, min ) => ( run.unanswered ? unanswered( label, run.unanswered, { described: run.described } ) : verdict( judge( run, min ), label, run ) );
const runs = {};
for ( const [ key, panel, name, min ] of [ [ 'hover', 'hover', 'Lift', 6 ], [ 'entrance', 'entrance', 'Fade in', 10 ] ] ) {
	runs[ key ] = await attempt( `${ panel }-thumbnails`, async () => {
		const run = await thumbRun( panel, name );
		report( `${ panel }-thumbnails`, run, min );
		return run;
	} );
}
await attempt( 'thumbnails-reduced', async () => {
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.waitForTimeout( 400 );
	const reduced = { hover: await thumbRun( 'hover', 'Lift' ), entrance: await thumbRun( 'entrance', 'Fade in' ) };
	await page.emulateMedia( { reducedMotion: 'no-preference' } );
	const stopped = ( r ) => ! r.unanswered && r.idle.running === 0 && ! r.hovered && ! r.keyboard.running;
	if ( reduced.hover.unanswered || reduced.entrance.unanswered ) {
		unanswered( 'thumbnails-reduced', 'a panel could not be measured', { hover: reduced.hover.unanswered, entrance: reduced.entrance.unanswered } );
	} else {
		verdict( reduced.hover.idle.count > 0 && stopped( reduced.hover ) && stopped( reduced.entrance ), 'thumbnails-reduced', reduced );
	}
	const allowed = [ runs.hover?.hovered, runs.entrance?.hovered ];
	control( allowed.every( Boolean ), 'thumbnails-reduced', { hoveredRunsWhenAllowed: allowed } );
} );

// 8. Hygiene.
verdict( consoleErrors.length === 0, 'console-errors', consoleErrors );
await attempt( 'no-save', async () => {
	const dirty = await page.evaluate( () => window.wp.data.select( 'core' ).__experimentalGetDirtyEntityRecords().length );
	const unexpected = writes.filter( ( w ) => ! EXPECTED_WRITE.test( w ) );
	verdict( unexpected.length === 0 && dirty === 0, 'no-save', { unexpectedWrites: unexpected, expectedPreferenceWrites: writes.length - unexpected.length, dirtyRecords: dirty } );
} );
note( 'blocked-writes', writes );

// 9. Control for panel-mounts: a block type known to lack supports.sgs.motion. It runs after the hygiene readings. It looks
// on this page, then on other read-only pages; failing that it inserts a core/paragraph in the editor (never saved: the
// guard aborts every write, and the writes recorded before and after are compared) and removes it again.
await attempt( 'panel-mounts-control', async () => {
	const writesBefore = writes.length;
	let plain = plan.plain;
	let inserted = null;
	const tried = [ PAGE_ID ];
	for ( const id of CONTROL_PAGES ) {
		if ( plain ) break;
		tried.push( id );
		await openEditor( id );
		plain = ( await page.evaluate( readPlan ) ).plain;
	}
	if ( ! plain ) {
		inserted = await page.evaluate( () => {
			const block = window.wp.blocks.createBlock( 'core/paragraph', { content: 'probe control' } );
			window.wp.data.dispatch( 'core/block-editor' ).insertBlock( block );
			return { id: block.clientId, name: block.name };
		} );
		plain = inserted;
	}
	try {
		const lacks = await page.evaluate( ( name ) => Boolean( window.wp.blocks.getBlockType( name ) ) && ! window.wp.blocks.getBlockType( name ).supports?.sgs?.motion, plain.name );
		const hadTab = await openStyles( page, plain.id );
		const panels = await page.evaluate( () => document.querySelectorAll( '.sgs-motion-panel' ).length );
		control( lacks && panels === 0, 'panel-mounts', { block: plain.name, lacksTheSupport: lacks, stylesTab: hadTab, panels, pagesTried: tried, inserted: Boolean( inserted ) } );
	} finally {
		if ( inserted ) {
			await page.evaluate( ( id ) => window.wp.data.dispatch( 'core/block-editor' ).removeBlock( id ), inserted.id );
		}
	}
	const unexpected = writes.slice( writesBefore ).filter( ( w ) => ! EXPECTED_WRITE.test( w ) );
	verdict( unexpected.length === 0, 'panel-mounts-control-no-write', { unexpectedWrites: unexpected } );
} );

await finish();
