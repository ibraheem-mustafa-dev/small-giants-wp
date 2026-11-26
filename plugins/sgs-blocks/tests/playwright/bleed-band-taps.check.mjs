// Real-engine check for assets/js/bleed-band-taps.js in Chromium, Firefox and WebKit: what jsdom cannot show (a new
// tab from a modifier or middle click, a real drag, real focus, no double activation of the element beneath, an iframe
// beneath letting the click through, an unmarked full-width section left alone).
//
// A static fixture: a row of controls, then a scrolling row whose 80px bleed band (padding cancelled by a negative
// margin, marked `--sgs-bleed-band: 1`, positioned as the real rows are) lies over them, then an unmarked row of the same shape over a second link (a
// WordPress core full-width section) and a marked row over an iframe. No WordPress site and no credentials.
//
// Run:            node tests/playwright/bleed-band-taps.check.mjs
// Prove it fails: SGS_BLEED_BASELINE=<commit> node tests/playwright/bleed-band-taps.check.mjs
//                 (loads the script and the gallery stylesheet as committed at <commit>; the cases that commit lacks go red).
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const pluginRoot = path.resolve( here, '..', '..' );
const require = createRequire( path.join( pluginRoot, 'package.json' ) );
const pw = require( 'playwright' );
const BASE = process.env.SGS_BLEED_BASELINE;
const SRC = BASE
	? execFileSync(
			'git',
			[
				'show',
				`${ BASE }:plugins/sgs-blocks/assets/js/bleed-band-taps.js`,
			],
			{ cwd: pluginRoot, encoding: 'utf8' }
	  )
	: readFileSync(
			path.join( pluginRoot, 'assets/js/bleed-band-taps.js' ),
			'utf8'
	  );

const GALLERY_CSS = BASE
	? execFileSync(
			'git',
			[
				'show',
				`${ BASE }:plugins/sgs-blocks/src/blocks/gallery/style.css`,
			],
			{ cwd: pluginRoot, encoding: 'utf8' }
	  )
	: readFileSync(
			path.join( pluginRoot, 'src/blocks/gallery/style.css' ),
			'utf8'
	  );
// A stylesheet as the fixture loads it: the working copy, or the baseline commit's.
const sheet = ( rel ) =>
	BASE
		? execFileSync(
				'git',
				[ 'show', `${ BASE }:plugins/sgs-blocks/${ rel }` ],
				{
					cwd: pluginRoot,
					encoding: 'utf8',
				}
		  )
		: readFileSync( path.join( pluginRoot, rel ), 'utf8' );
const EXT_CSS = sheet( 'assets/css/extensions.css' );
const MARQUEE_CSS = sheet( 'assets/css/fx-marquee.css' );
const BRAND_CSS = sheet( 'src/blocks/brand-strip/style.css' );
const BAND =
	'position:relative;overflow-x:auto;padding-block:80px;margin-block:-80px';
const TILES =
	'<div style="display:flex;gap:10px"><div style="min-width:200px;height:100px;background:#ccc"></div><div style="min-width:900px;height:100px;background:#ccc"></div></div>';
const html = `<!doctype html><html><head><style>.sgs-bleed-band--pointer{cursor:pointer}</style><style>${ GALLERY_CSS }</style><style>${ EXT_CSS }</style><style>${ MARQUEE_CSS }</style><style>${ BRAND_CSS }</style></head><body style="margin:0">
<div class="wp-site-blocks">
<div style="height:100px"></div>
<div style="display:flex;gap:12px;height:40px;align-items:center">
 <a id="plain" href="#nav">plain</a>
 <select id="sel"><option>a</option><option>b</option></select>
 <label id="lab"><input type="checkbox" id="cb">tick</label>
 <form id="f" onsubmit="event.preventDefault();window.subs=(window.subs||0)+1"><button id="sub">go</button></form>
 <button id="pd" style="width:40px">pd</button>
</div>
<div id="row" style="--sgs-bleed-band:1;${ BAND }">${ TILES }</div>
<div style="height:200px"></div>
<div style="height:40px"><a id="core-link" href="#core">core</a></div>
<div id="core" style="${ BAND }">${ TILES }</div>
<div style="height:200px"></div>
<div class="sgs-gallery sgs-gallery--scroll"><div class="sgs-gallery__grid" id="grow"><figure class="sgs-gallery__item"><a id="tile-link" href="#tile">tile</a></figure><figure class="sgs-gallery__item">x</figure></div></div>
<div style="height:200px"></div>
<iframe id="frame" style="display:block;height:40px;width:300px;border:0" srcdoc="<body style='margin:0'>frame</body>"></iframe>
<div id="frow" style="--sgs-bleed-band:1;${ BAND }">${ TILES }</div>
<div style="height:200px"></div>
<div id="sroot" style="overflow:hidden"><h2 id="stitle" style="margin:0 0 16px;height:30px">Brands</h2><div id="slane" style="--sgs-bleed-band:1;position:relative;display:flex;padding-block:80px;margin-block:-80px"><div style="width:100px;height:60px;background:#ccc"></div></div></div>
<div style="height:200px"></div>
<div id="band2" style="--sgs-bleed-band:1;position:relative;overflow-x:auto;padding-block:20px;margin-block:-20px"><div><a id="pimg" href="#pull-img" style="display:block;height:80px;background:#9cf">img</a><div id="pull" style="margin-top:-40px;padding-top:30px;background:#eee;position:relative">Body text</div></div></div>
<div style="height:200px"></div>
<div style="height:40px"><a id="tlink" href="#track-link">track</a></div>
<div id="trow" style="--sgs-bleed-band:1;${ BAND }">${ TILES }</div>
<div style="height:200px"></div>
<div class="sgs-brand-strip" data-sgs-fx="marquee" data-sgs-marquee="on" data-sgs-fx-marquee-edge-fade="true"><div data-sgs-marquee-lane="on"><a id="logo" href="#logo">logo</a></div></div>
<div style="height:300px"></div>
</div>
<script>window.sPresses=0;document.getElementById('sroot').addEventListener('pointerdown',()=>window.sPresses++);
document.getElementById('trow').addEventListener('pointerdown',(e)=>e.preventDefault(),true);
window.log=[];
for (const t of ['pointerdown','mousedown','pointerup','mouseup','click']) document.getElementById('pd').addEventListener(t,()=>log.push(t));
document.getElementById('cb').addEventListener('click',()=>log.push('cb'));
document.getElementById('frow').addEventListener('click',()=>log.push('frow'));
</script></div></body></html>`;

let failed = 0;
for ( const name of [ 'chromium', 'firefox', 'webkit' ] ) {
	const browser = await pw[ name ].launch();
	const ctx = await browser.newContext( {
		viewport: { width: 900, height: 700 },
	} );
	const p = await ctx.newPage();
	await p.route( 'http://bleed.test/**', ( r ) =>
		r.fulfill( { contentType: 'text/html', body: html } )
	);
	// Records which elements get a click listener (the iOS placement check).
	await p.addInitScript( () => {
		const add = EventTarget.prototype.addEventListener;
		EventTarget.prototype.addEventListener = function ( type, fn, opts ) {
			if ( type === 'click' && this instanceof Element ) {
				this.__sgsClicks = ( this.__sgsClicks || 0 ) + 1;
			}
			return add.call( this, type, fn, opts );
		};
	} );
	await p.goto( 'http://bleed.test/' );
	await p.addScriptTag( { content: SRC } );
	const centre = async ( id ) => {
		await p.evaluate( ( i ) => {
			document.documentElement.style.scrollBehavior = 'auto';
			document.getElementById( i ).scrollIntoView( { block: 'center' } );
		}, id );
		const r = await p.locator( '#' + id ).boundingBox();
		return [ r.x + r.width / 2, r.y + r.height / 2 ];
	};
	const reset = () =>
		p.evaluate( () => {
			history.replaceState( null, '', '#' );
			window.log.length = 0;
		} );
	const newTab = () =>
		ctx
			.waitForEvent( 'page', { timeout: 2000 } )
			.then( ( pg ) => pg.close().then( () => true ) )
			.catch( () => false );
	const results = {};
	const check = ( label, ok ) => {
		results[ label ] = ok;
		if ( ! ok ) failed++;
	};

	await reset();
	await p.mouse.click(
		...( await centre( 'pull' ) ).map( ( v, i ) => ( i ? v - 12 : v ) )
	);
	check(
		'a pull-up card body inside a band is not a band (the marker does not inherit)',
		( await p.evaluate( () => location.hash ) ) !== '#pull-img'
	);

	await reset();
	await p.mouse.click( ...( await centre( 'tlink' ) ) );
	check(
		'a press a listener cancelled (a scrollbar track) keeps its click',
		( await p.evaluate( () => location.hash ) ) !== '#track-link'
	);

	const logoHi = await p.evaluate( () =>
		getComputedStyle( document.getElementById( 'logo' ) ).getPropertyValue(
			'-webkit-tap-highlight-color'
		)
	);
	if ( logoHi ) {
		check(
			"a running brand strip's logo links keep their transparent tap highlight",
			/^(transparent|rgba\(0, 0, 0, 0\))$/.test( logoHi )
		);
	}

	// iOS placement: nothing is armed at load; a touch on a band arms the band, never the page root.
	const idle = await p.evaluate( () => [
		document.getElementById( 'row' ).__sgsClicks || 0,
		document.querySelector( '.wp-site-blocks' ).__sgsClicks || 0,
	] );
	check(
		'nothing is armed until a touch',
		idle[ 0 ] === 0 && idle[ 1 ] === 0
	);
	const touchCtx = await browser.newContext( {
		viewport: { width: 900, height: 700 },
		hasTouch: true,
	} );
	const tp = await touchCtx.newPage();
	await tp.addInitScript( () => {
		const add = EventTarget.prototype.addEventListener;
		EventTarget.prototype.addEventListener = function ( type, fn, opts ) {
			if ( type === 'click' && this instanceof Element ) {
				this.__sgsClicks = ( this.__sgsClicks || 0 ) + 1;
			}
			return add.call( this, type, fn, opts );
		};
	} );
	await tp.route( 'http://bleed.test/**', ( r ) =>
		r.fulfill( { contentType: 'text/html', body: html } )
	);
	await tp.goto( 'http://bleed.test/' );
	await tp.addScriptTag( { content: SRC } );
	const band = await tp.locator( '#row' ).boundingBox();
	// On the band, to the right of the row of controls, where nothing lies beneath.
	await tp.touchscreen.tap( band.x + band.width - 20, band.y + 20 );
	const armed = await tp.evaluate( () => [
		document.getElementById( 'row' ).__sgsClicks || 0,
		document.querySelector( '.wp-site-blocks' ).__sgsClicks || 0,
	] );
	const armedHi = await tp.evaluate( () => [
		document
			.getElementById( 'row' )
			.classList.contains( 'sgs-bleed-band--armed' ),
		getComputedStyle( document.getElementById( 'row' ) ).getPropertyValue(
			'-webkit-tap-highlight-color'
		),
	] );
	check(
		'the armed element is marked, with no tap highlight of its own',
		armedHi[ 0 ] &&
			( ! armedHi[ 1 ] ||
				/^(transparent|rgba\(0, 0, 0, 0\))$/.test( armedHi[ 1 ] ) )
	);
	await tp.evaluate( () => {
		document.documentElement.style.scrollBehavior = 'auto';
		document
			.getElementById( 'stitle' )
			.scrollIntoView( { block: 'center' } );
	} );
	const title = await tp.locator( '#stitle' ).boundingBox();
	await tp.touchscreen.tap( title.x + 50, title.y + 15 );
	await tp.waitForTimeout( 200 );
	check(
		'a tap on a strip title presses the strip root once (a tap-to-pause toggles once)',
		( await tp.evaluate( () => window.sPresses ) ) === 1
	);
	await touchCtx.close();
	check(
		'a touch arms the band it lands on, never the page root',
		armed[ 0 ] >= 1 && armed[ 1 ] === 0
	);
	const tapHi = await p.evaluate( () =>
		[ 'grow', 'tile-link', 'plain' ].map( ( id ) =>
			getComputedStyle( document.getElementById( id ) ).getPropertyValue(
				'-webkit-tap-highlight-color'
			)
		)
	);
	if ( tapHi[ 0 ] ) {
		check(
			'a band row has a transparent tap highlight',
			/^(transparent|rgba\(0, 0, 0, 0\))$/.test( tapHi[ 0 ] )
		);
		check(
			'a link inside a band keeps the default tap highlight',
			tapHi[ 1 ] === tapHi[ 2 ] && tapHi[ 1 ] !== tapHi[ 0 ]
		);
	} else {
		results[ 'tap highlight: not supported in this engine' ] = true;
	}

	// Red control: the bands really do lie over the controls.
	check(
		'the band lies over the link (control)',
		await p.evaluate(
			( [ x, y ] ) => document.elementFromPoint( x, y ).id === 'row',
			await centre( 'plain' )
		)
	);
	check(
		'the unmarked section lies over its link (control)',
		await p.evaluate(
			( [ x, y ] ) => document.elementFromPoint( x, y ).id === 'core',
			await centre( 'core-link' )
		)
	);

	await reset();
	await p.mouse.click( ...( await centre( 'plain' ) ) );
	check(
		'a click on the band follows the link',
		( await p.evaluate( () => location.hash ) ) === '#nav'
	);

	await reset();
	await p.mouse.click( ...( await centre( 'pd' ) ) );
	check(
		'the button beneath gets the press, one click, and focus',
		JSON.stringify(
			await p.evaluate( () => [ window.log, document.activeElement.id ] )
		) ===
			JSON.stringify( [
				[ 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click' ],
				'pd',
			] )
	);

	await reset();
	await p.mouse.click( ...( await centre( 'lab' ) ) );
	check(
		'a covered label toggles its checkbox once',
		JSON.stringify(
			await p.evaluate( () => [
				document.getElementById( 'cb' ).checked,
				window.log,
			] )
		) === JSON.stringify( [ true, [ 'cb' ] ] )
	);

	await p.mouse.click( ...( await centre( 'sub' ) ) );
	check(
		'a covered submit button submits once',
		( await p.evaluate( () => window.subs || 0 ) ) === 1
	);

	await p.mouse.click( ...( await centre( 'sel' ) ) );
	check(
		'a covered select takes focus',
		( await p.evaluate( () => document.activeElement.id ) ) === 'sel'
	);
	await p.keyboard.press( 'Escape' );

	await reset();
	const [ px, py ] = await centre( 'plain' );
	await p.mouse.move( px, py - 40 ); // on the band, above the row of controls
	await p.mouse.down();
	await p.mouse.move( px, py, { steps: 8 } );
	await p.mouse.up();
	check(
		'a drag that ends on the band does not follow the link',
		( await p.evaluate( () => location.hash ) ) !== '#nav'
	);

	await reset();
	let tab = newTab();
	await p.keyboard.down( 'ControlOrMeta' );
	await p.mouse.click( ...( await centre( 'plain' ) ) );
	await p.keyboard.up( 'ControlOrMeta' );
	check(
		'a ctrl or cmd click opens a new tab and leaves this one',
		( await tab ) && ( await p.evaluate( () => location.hash ) ) !== '#nav'
	);

	await reset();
	await p.mouse.click( ...( await centre( 'core-link' ) ) );
	check(
		'an unmarked full-width section keeps its click',
		( await p.evaluate( () => location.hash ) ) !== '#core'
	);

	await reset();
	await p.mouse.click( ...( await centre( 'frame' ) ) );
	check(
		'an iframe beneath lets the original click through',
		( await p.evaluate( () => window.log ) ).includes( 'frow' )
	);

	await p.mouse.move( 5, 5 );
	await p.mouse.move( ...( await centre( 'plain' ) ) );
	await p.waitForTimeout( 100 );
	check(
		'the cursor is the pointer over the band above a link',
		( await p.evaluate(
			() => getComputedStyle( document.getElementById( 'row' ) ).cursor
		) ) === 'pointer'
	);

	// Last: on a script without the middle-click handling, Chromium's autoscroll would swallow the next click.
	await reset();
	tab = newTab();
	await p.mouse.click( ...( await centre( 'plain' ) ), { button: 'middle' } );
	check( 'a middle click opens a new tab', await tab );

	console.log(
		name,
		Object.entries( results )
			.map( ( [ k, v ] ) => ( v ? 'ok   ' : 'FAIL ' ) + k )
			.join( '\n  ' )
			.replace( /^/, '\n  ' )
	);
	await browser.close();
}
console.log(
	failed
		? `bleed-band-taps check: ${ failed } failure(s)`
		: 'bleed-band-taps check: all pass'
);
process.exit( failed ? 1 : 0 );
