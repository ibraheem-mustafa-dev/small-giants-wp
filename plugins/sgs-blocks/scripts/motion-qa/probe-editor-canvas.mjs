/**
 * Spec 38A unit M3.7 (FR-38A-28): the block editor shows motion at its final state, carries the shared motion
 * assets in the canvas iframe, mounts the motion panels and draws the preset thumbnails.
 *
 * Usage (repo root, after a deploy of M3.7 to the canary):
 *   node plugins/sgs-blocks/scripts/motion-qa/probe-editor-canvas.mjs [--page 5223] [--site sandybrown] [--control-page 5229]
 *
 * Page 5223 is the read-only motion-model fixture. The probe never saves a page: it aborts and records EVERY non-GET
 * request to /wp-json/ or ?rest_route=, fails on any recorded request other than the expected editor-preference write
 * (`/wp/v2/users/me`, from the preferences the probe sets in memory), and fails if the core data store holds a dirty
 * entity record. Credentials come from `.claude/secrets/<site>.env`.
 *
 * Checks (a check with a control has a negative control that must come out red; a control that stays green fails the run):
 *   scroll-entrance-opacity      every block with a scroll entrance: its motion targets, data-sgs-me elements, text and image
 *                                nodes are at opacity 1 (aria-hidden, .sgs-motion-layer and data-sgs-fx nodes excluded)
 *   scroll-entrance-selectable   a real click at its centre selects it (or a block inside it)
 *   final-state-rule             with the reveal's hidden-start state forced on a block, the rule holds it at opacity 1
 *                                (control: the rule's stylesheet disabled, opacity 0)
 *   replay-wins                  the real Replay button on a root entrance moves the target (sampled per frame) and then
 *                                leaves no data-sgs-me or data-sgs-in (control: an unscoped important from-value rule
 *                                injected, no movement)
 *   iframe-stylesheet            the canvas iframe lists motion.css
 *   front-end-guard              the public page carries no final-state rule and no motion-thumbnails.css
 *                                (control: the editor iframe does carry the rule)
 *   panel-mounts                 the Hover and Entrance panels' mount markers exist in the Styles tab of a motion block
 *                                (control: a named block type without supports.sgs.motion shows neither)
 *   hover-thumbnails / entrance-thumbnails   the panel draws a radio group; thumbnails are still until a radio is hovered
 *                                or keyboard-focused; the chosen one runs; a Fade in radio runs on hover
 *   thumbnails-reduced           under prefers-reduced-motion nothing runs even hovered (control: it ran when allowed)
 *   console-errors / no-save     zero console errors; no save request; no dirty entity record
 * Exit: 0 all pass and every control red; 1 otherwise.
 *
 * @package SGS\Blocks
 */
import { chromium } from 'playwright';
import {
	findFinalStateRule,
	judgeReplay,
	loadSite,
	makeReporter,
	openPanel,
	openStyles,
	readBlockState,
	readPlan,
	readThumbs,
	sampleReplay,
} from './probe-editor-canvas-lib.mjs';

const argv = process.argv.slice( 2 );
const opt = ( name, fallback ) => ( argv.includes( name ) ? argv[ argv.indexOf( name ) + 1 ] : fallback );
const SITE_KEY = opt( '--site', 'sandybrown' );
const PAGE_ID = opt( '--page', '5223' );
const CONTROL_PAGE = opt( '--control-page', '5229' );
const site = loadSite( SITE_KEY );
const { verdict, control, note, failures } = makeReporter();

const EXPECTED_WRITE = /\/wp\/v2\/users\/me/;
const consoleErrors = [];
const writes = [];
const browser = await chromium.launch();
const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const page = await context.newPage();
page.on( 'dialog', ( d ) => d.accept() );
page.on( 'console', ( m ) => {
	const url = m.location()?.url || '';
	if ( m.type() === 'error' && ! EXPECTED_WRITE.test( url ) && ! EXPECTED_WRITE.test( m.text() ) ) consoleErrors.push( m.text().slice( 0, 240 ) );
} );
page.on( 'pageerror', ( e ) => consoleErrors.push( String( e.message ).slice( 0, 240 ) ) );
await page.route( /\/wp-json\/|[?&]rest_route=/, ( route ) => {
	if ( route.request().method() === 'GET' ) return route.continue();
	writes.push( `${ route.request().method() } ${ route.request().url() }` );
	return route.abort();
} );

const openEditor = async ( id ) => {
	await page.goto( `${ site.url }/wp-admin/post.php?post=${ id }&action=edit`, { waitUntil: 'domcontentloaded' } );
	await page.waitForFunction( () => window.wp?.data?.select( 'core/block-editor' )?.getBlocks().length > 0, null, { timeout: 90000 } );
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
	return { handle, frame };
};

await page.goto( `${ site.url }/wp-login.php`, { waitUntil: 'domcontentloaded' } );
await page.fill( '#user_login', site.user );
await page.fill( '#user_pass', site.pass );
await page.click( '#wp-submit' );
await page.waitForLoadState( 'domcontentloaded' );
const { handle: frameHandle, frame: canvas } = await openEditor( PAGE_ID );
const plan = await page.evaluate( readPlan );
verdict( plan.scrollBlocks.length > 0 && Boolean( plan.motionBlock ) && Boolean( plan.rootEntrance ), 'fixture-has-what-the-probe-needs', { blocks: plan.total, scrollEntrances: plan.scrollBlocks.length, rootEntrance: Boolean( plan.rootEntrance ) } );

// 1. Every scroll-entrance block is at its final state and selectable in the canvas.
const states = [];
for ( const block of plan.scrollBlocks ) states.push( await canvas.evaluate( readBlockState, [ block.id, block.selectors ] ) );
verdict(
	states.every( ( s ) => s.found && s.counted > 0 && s.notOne === 0 ),
	'scroll-entrance-opacity',
	states.map( ( s ) => ( { id: s.id.slice( 0, 8 ), counted: s.counted, notOne: s.notOne, targets: s.targets } ) )
);
const frameBox = await frameHandle.boundingBox();
const selected = [];
for ( const s of states.filter( ( x ) => x.found ) ) {
	const at = await canvas.evaluate( readBlockState, [ s.id, [] ] );
	await page.mouse.click( frameBox.x + at.x, frameBox.y + at.y );
	selected.push( await page.evaluate( ( id ) => {
		const store = window.wp.data.select( 'core/block-editor' );
		const sel = store.getSelectedBlockClientId();
		return Boolean( sel && ( sel === id || store.getBlockParents( sel ).includes( id ) ) );
	}, s.id ) );
}
verdict( states.every( ( s ) => s.hitInside ) && selected.length > 0 && selected.every( Boolean ), 'scroll-entrance-selectable', { hitInside: states.map( ( s ) => s.hitInside ), selected } );

// 2. The final-state rule: forced onto a block's element (attributes added and removed inside one evaluate).
const forceHiddenStart = ( disableRule ) => canvas.evaluate( ( [ id, off ] ) => {
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
const ruleOn = await forceHiddenStart( false );
const ruleOff = await forceHiddenStart( true );
verdict( ruleOn.ruleFound && ruleOn.opacity === '1', 'final-state-rule', ruleOn );
control( ruleOff.opacity === '0', 'final-state-rule', ruleOff );

// 3. Replay through the real button: it moves the target and leaves it clean; an unscoped important rule stops the movement.
await openStyles( page, plan.rootEntrance );
await openPanel( page, 'entrance' );
const replayButton = page.locator( '.sgs-motion-panel--entrance' ).getByRole( 'button', { name: 'Replay' } ).first();
const replayOnce = async () => {
	const sampling = canvas.evaluate( sampleReplay, [ plan.rootEntrance, 3500 ] );
	await page.waitForTimeout( 150 );
	await replayButton.click();
	return judgeReplay( await sampling );
};
const played = await replayOnce();
verdict( played.moved && played.restedClean, 'replay-wins', played );
await canvas.evaluate( () => {
	const style = document.createElement( 'style' );
	style.id = 'probe-unscoped-final-state';
	style.textContent = '[data-sgs-me]{--sgs-me-from-op:1!important;--sgs-me-from-ty:0px!important;--sgs-me-from-tx:0px!important;--sgs-me-from-s:1!important;--sgs-me-from-blur:0px!important}';
	document.head.appendChild( style );
} );
const blocked = await replayOnce();
await canvas.evaluate( () => document.getElementById( 'probe-unscoped-final-state' )?.remove() );
control( ! blocked.moved, 'replay-wins', blocked );

// 4. Stylesheets: the iframe lists motion.css; the public page has neither the rule nor the thumbnails (control: the iframe has the rule).
const sheets = await canvas.evaluate( () => [ ...document.querySelectorAll( 'link[rel="stylesheet"], style' ) ].map( ( n ) => n.id || n.getAttribute( 'href' ) || '' ) );
verdict( sheets.some( ( s ) => /assets\/css\/motion\.css|^sgs-motion-css$/.test( s ) ), 'iframe-stylesheet', { sheets: sheets.length } );
const publicContext = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
const publicPage = await publicContext.newPage();
await publicPage.goto( `${ site.url }/?p=${ PAGE_ID }`, { waitUntil: 'networkidle' } );
const frontRule = await publicPage.evaluate( findFinalStateRule );
const frontThumbs = await publicPage.evaluate( () => [ ...document.querySelectorAll( 'link[rel="stylesheet"]' ) ].some( ( l ) => /motion-thumbnails\.css/.test( l.href ) ) );
const frontMotion = await publicPage.evaluate( () => [ ...document.querySelectorAll( 'link[rel="stylesheet"]' ) ].some( ( l ) => /assets\/css\/motion\.css/.test( l.href ) ) );
verdict( frontMotion && ! frontRule && ! frontThumbs, 'front-end-guard', { motionCssLoads: frontMotion, finalStateRule: frontRule, thumbnails: frontThumbs } );
control( await canvas.evaluate( findFinalStateRule ), 'front-end-guard', { editorIframeHasTheRule: true } );
await publicContext.close();
verdict( await page.evaluate( () => [ ...document.querySelectorAll( 'link[rel="stylesheet"]' ) ].some( ( l ) => /motion-thumbnails\.css/.test( l.href ) ) ), 'thumbnails-stylesheet-in-admin', {} );

// 5. The panels' mount markers in the Styles tab.
await openStyles( page, plan.motionBlock );
const mounts = await page.evaluate( () => ( { hover: Boolean( document.querySelector( '.sgs-motion-panel--hover' ) ), entrance: Boolean( document.querySelector( '.sgs-motion-panel--entrance' ) ) } ) );
verdict( mounts.hover && mounts.entrance, 'panel-mounts', mounts );

// 6. Thumbnails, per panel: a radio group; still until hovered or keyboard-focused; the chosen one runs.
const thumbRun = async ( panel, hoverLabel ) => {
	await openPanel( page, panel );
	const group = page.locator( `.sgs-motion-panel--${ panel } [role="radiogroup"]` ).first();
	await page.mouse.move( 0, 0 );
	await page.waitForTimeout( 200 );
	const idle = await page.evaluate( readThumbs, panel );
	const radio = group.getByRole( 'radio', { name: hoverLabel, exact: true } ).first();
	await radio.hover();
	await page.waitForTimeout( 300 );
	const hovered = await radio.locator( '.sgs-motion-thumb__box' ).evaluate( ( b ) => b.getAnimations().some( ( a ) => a.playState === 'running' ) );
	await page.mouse.move( 0, 0 );
	const checked = group.locator( '[aria-checked="true"]' ).first();
	const focusFrom = ( await checked.count() ) ? checked : group.getByRole( 'radio' ).first();
	await focusFrom.focus();
	await page.keyboard.press( 'ArrowRight' );
	await page.waitForTimeout( 300 );
	const keyboard = await page.evaluate( () => {
		const box = document.activeElement?.querySelector( '.sgs-motion-thumb__box' );
		return { focusedIsRadio: document.activeElement?.getAttribute( 'role' ) === 'radio', running: Boolean( box && box.getAnimations().some( ( a ) => a.playState === 'running' ) ) };
	} );
	return { idle, hovered, keyboard };
};
const hoverRun = await thumbRun( 'hover', 'Lift' );
const entranceRun = await thumbRun( 'entrance', 'Fade in' );
const judge = ( run, min ) => run.idle.radios >= min && run.idle.count >= min && run.idle.inlineStyles === 0 && run.idle.running === run.idle.checkedRunning && run.idle.running <= 1 && run.hovered && run.keyboard.focusedIsRadio && run.keyboard.running;
verdict( judge( hoverRun, 6 ), 'hover-thumbnails', hoverRun );
verdict( judge( entranceRun, 10 ), 'entrance-thumbnails', entranceRun );
await page.emulateMedia( { reducedMotion: 'reduce' } );
await page.waitForTimeout( 400 );
const reducedHover = await thumbRun( 'hover', 'Lift' );
const reducedEntrance = await thumbRun( 'entrance', 'Fade in' );
const none = ( r ) => r.idle.running === 0 && ! r.hovered && ! r.keyboard.running;
verdict( reducedHover.idle.count > 0 && none( reducedHover ) && none( reducedEntrance ), 'thumbnails-reduced', { hover: reducedHover, entrance: reducedEntrance } );
control( hoverRun.hovered && entranceRun.hovered, 'thumbnails-reduced', { hoveredRunsWhenAllowed: [ hoverRun.hovered, entranceRun.hovered ] } );
await page.emulateMedia( { reducedMotion: 'no-preference' } );

// 7. Hygiene on this page: dirty records, console, writes.
const dirtyRecords = await page.evaluate( () => window.wp.data.select( 'core' ).__experimentalGetDirtyEntityRecords().length );

// 8. Control for panel-mounts: a block type known to lack supports.sgs.motion (this page's, else the control page's) shows no panel.
let plain = plan.plain;
if ( ! plain ) {
	await openEditor( CONTROL_PAGE );
	plain = await page.evaluate( readPlan ).then( ( p ) => p.plain );
}
if ( plain ) {
	const lacks = await page.evaluate( ( name ) => window.wp.blocks.getBlockType( name ) && ! window.wp.blocks.getBlockType( name ).supports?.sgs?.motion, plain.name );
	const hadTab = await openStyles( page, plain.id );
	const panels = await page.evaluate( () => document.querySelectorAll( '.sgs-motion-panel' ).length );
	control( lacks && panels === 0, 'panel-mounts', { block: plain.name, lacksTheSupport: lacks, stylesTab: hadTab, panels } );
} else {
	verdict( false, 'panel-mounts control needs a block type without the support', { pages: [ PAGE_ID, CONTROL_PAGE ] } );
}

const dirtyEnd = await page.evaluate( () => window.wp.data.select( 'core' ).__experimentalGetDirtyEntityRecords().length );
const unexpected = writes.filter( ( w ) => ! EXPECTED_WRITE.test( w ) );
verdict( consoleErrors.length === 0, 'console-errors', consoleErrors );
verdict( unexpected.length === 0 && dirtyRecords === 0 && dirtyEnd === 0, 'no-save', { unexpectedWrites: unexpected, expectedPreferenceWrites: writes.length - unexpected.length, dirtyRecords, dirtyEnd } );
note( 'blocked-writes', writes );

await browser.close();
if ( failures.length ) {
	console.log( `\n${ failures.length } failed: ${ failures.join( '; ' ) }` );
	process.exit( 1 );
}
console.log( '\nAll editor-canvas assertions passed.' );
