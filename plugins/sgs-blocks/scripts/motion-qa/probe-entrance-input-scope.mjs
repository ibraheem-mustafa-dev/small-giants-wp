/**
 * Probe: a nested motion element never takes its ancestor's entrance or hover inputs (Spec 38A §10, FR-38A-18).
 *
 * Loads the real `assets/css/motion.css` and `assets/css/motion-triggers.css` into a local page in headless Chromium, no
 * site involved, and builds the case measured live on a card grid with "Apply entrance to children" and its own item
 * entrance: the root rule `--sgs-me-from-op: 0; --sgs-me-from-ty: 28px; --sgs-me-dur: 400ms` and the item rule
 * `--sgs-me-from-op: 0; --sgs-me-from-tx: -40px; --sgs-me-dur: 400ms`. With the entrance inputs inheriting, the item's
 * X-only entrance read the root's 28px and drifted in Y. Each check pauses the CSS animations at 200ms and reads the
 * computed values jsdom cannot compute (registered properties, keyframe values, var() fallbacks):
 *   - the item's `--sgs-me-ty` is 0px and its `translate` has no Y part, while its X part is still moving;
 *   - an entrance with no duration of its own inside one with 400ms plays the stylesheet default (0.75s), not 400ms;
 *   - an entrance with no delay inside one with 300ms starts at 0s;
 *   - a loop item's stagger delay (`--sgs-me-loop-delay` on an item that holds no entrance) still reaches the entrance
 *     inside it, and an entrance's own delay beats it;
 *   - a hover target's `--sgs-mh-ty` reads 0px while engaged inside a parent whose hover lifts by 8px.
 *
 * Usage: node plugins/sgs-blocks/scripts/motion-qa/probe-entrance-input-scope.mjs   (exit 1 on any failed check)
 * MOTION_CSS_FILE / MOTION_TRIGGERS_CSS_FILE override the stylesheet paths, for a negative control on a planted copy.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = resolve( HERE, '..', '..' );
const css = [
	process.env.MOTION_CSS_FILE || resolve( PLUGIN, 'assets', 'css', 'motion.css' ),
	process.env.MOTION_TRIGGERS_CSS_FILE || resolve( PLUGIN, 'assets', 'css', 'motion-triggers.css' ),
].map( ( file ) => readFileSync( file, 'utf8' ) );

const html = `<!doctype html><html><head>
${ css.map( ( text ) => `<style>${ text }</style>` ).join( '\n' ) }
<style>
.sgs-m-probe { --sgs-me-from-op: 0; --sgs-me-from-ty: 28px; --sgs-me-dur: 400ms; --sgs-me-delay: 300ms; }
.sgs-m-probe .sgs-card-grid__item { --sgs-me-from-op: 0; --sgs-me-from-tx: -40px; --sgs-me-dur: 400ms; }
.sgs-probe-loop [data-sgs-loop-i="2"] { --sgs-me-delay: 160ms; --sgs-me-loop-delay: 160ms; }
.sgs-probe-own { --sgs-me-from-op: 0; --sgs-me-delay: 40ms; }
.sgs-probe-lift { --sgs-mh-to-ty: -8px; --sgs-mh-on: 1; }
.sgs-probe-lift .sgs-probe-scale { --sgs-mh-to-s: 1.1; --sgs-mh-on: 1; }
</style>
</head><body>
<div id="root" class="sgs-m-probe" data-sgs-me="load translate opacity">
	<div id="item" class="sgs-card-grid__item" data-sgs-me="load translate opacity">Item</div>
	<div id="plain" data-sgs-me="load opacity">No timing of its own</div>
</div>
<ul class="sgs-probe-loop">
	<li data-sgs-loop-i="2"><div id="inner" data-sgs-me="load opacity">Inner card</div><div id="own" class="sgs-probe-own" data-sgs-me="load opacity">Own delay</div></li>
</ul>
<div id="lift" class="sgs-probe-lift" data-sgs-mh="self"><span id="scale" class="sgs-probe-scale" data-sgs-mh="self">Hover</span></div>
</body></html>`;

const browser = await chromium.launch();
let failed = 0;
const check = ( ok, label, value ) => {
	failed += ok ? 0 : 1;
	console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ label }: ${ value }` );
};
try {
	const page = await browser.newPage( { reducedMotion: 'no-preference' } );
	await page.setContent( html );
	const read = await page.evaluate( () => {
		document.getAnimations().forEach( ( animation ) => {
			animation.pause();
			animation.currentTime = 200;
		} );
		const cs = ( id ) => getComputedStyle( document.getElementById( id ) );
		return {
			itemTy: cs( 'item' ).getPropertyValue( '--sgs-me-ty' ).trim(),
			itemTranslate: cs( 'item' ).translate,
			plainDuration: cs( 'plain' ).animationDuration,
			plainDelay: cs( 'plain' ).animationDelay,
			innerDelay: cs( 'inner' ).animationDelay,
			ownDelay: cs( 'own' ).animationDelay,
			scaleTy: cs( 'scale' ).getPropertyValue( '--sgs-mh-ty' ).trim(),
			liftTy: cs( 'lift' ).getPropertyValue( '--sgs-mh-ty' ).trim(),
		};
	} );
	const [ x, y = '0px' ] = read.itemTranslate.split( /\s+/ );
	check( read.itemTy === '0px', 'item --sgs-me-ty mid-entrance (root sets from-ty 28px)', read.itemTy );
	check( parseFloat( y ) === 0 && parseFloat( x ) < 0, 'item translate mid-entrance moves in X only', read.itemTranslate );
	check( read.plainDuration === '0.75s', 'entrance with no duration inside a 400ms one plays the default', read.plainDuration );
	check( read.plainDelay === '0s', 'entrance with no delay inside a 300ms one starts at once', read.plainDelay );
	check( read.innerDelay === '0.16s', "a loop item's stagger delay reaches the entrance inside it", read.innerDelay );
	check( read.ownDelay === '0.04s', "an entrance's own delay beats the loop item's", read.ownDelay );
	check( read.liftTy === '-8px', 'the lifting parent hover still lifts', read.liftTy );
	check( read.scaleTy === '0px', 'a nested hover target does not take the parent lift', read.scaleTy );
} finally {
	await browser.close();
}
process.exit( failed ? 1 : 0 );
