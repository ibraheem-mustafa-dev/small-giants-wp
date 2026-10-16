/**
 * Probe: the theme focus glow follows a section's own --sgs-focus-glow (Spec 38A FR-38A-7, FR-38A-42).
 *
 * Loads the theme's real focus rules (`theme/sgs-theme/assets/css/core-blocks-critical.css`, `utilities.css`) and the
 * motion channel rules (`assets/css/motion.css`) into a local page in headless Chromium, no site involved. A wrapper sets
 * `--sgs-focus-glow: red` while the root accent is blue; a plain link and a hover-ring motion element
 * (`[data-sgs-mc~="box-shadow"]`) inside it take keyboard focus in turn, and the computed `box-shadow` of each must be
 * drawn in red. A `--sgs-focus-shadow` defined on :root substitutes the root glow (blue) at the root, so this is the
 * check jsdom cannot make: jsdom does not resolve var() inside custom properties or compute color-mix().
 *
 * Usage: node plugins/sgs-blocks/scripts/motion-qa/probe-focus-glow-scope.mjs   (exit 1 when a glow is not red)
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = resolve( HERE, '..', '..' );
const THEME_CSS = resolve( PLUGIN, '..', '..', 'theme', 'sgs-theme', 'assets', 'css' );
const css = [
	resolve( THEME_CSS, 'core-blocks-critical.css' ),
	resolve( THEME_CSS, 'utilities.css' ),
	resolve( PLUGIN, 'assets', 'css', 'motion.css' ),
].map( ( file ) => readFileSync( file, 'utf8' ) );

const html = `<!doctype html><html><head>
<style>:root { --wp--preset--color--accent: rgb(0, 0, 255); }</style>
${ css.map( ( text ) => `<style>${ text }</style>` ).join( '\n' ) }
<style>.sgs-probe-ring { --sgs-mh-ring: 0px; --sgs-mh-ring-c: transparent; --sgs-mh-accent: 0px; --sgs-mh-accent-c: transparent; }</style>
</head><body>
<div style="--sgs-focus-glow: rgb(255, 0, 0)">
	<a id="plain" href="#a">Plain link</a>
	<a id="ring" class="sgs-probe-ring" data-sgs-mc="box-shadow" href="#b">Ring link</a>
</div>
</body></html>`;

// The first shadow layer's colour channels, whatever form Chromium serialises color-mix() in.
const firstLayerIsRed = ( shadow ) => {
	const first = shadow.split( /,(?![^(]*\))/ )[ 0 ];
	const rgb = first.match( /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/ );
	if ( rgb ) {
		return Number( rgb[ 1 ] ) === 255 && Number( rgb[ 2 ] ) === 0 && Number( rgb[ 3 ] ) === 0;
	}
	const srgb = first.match( /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/ );
	return Boolean( srgb ) && Number( srgb[ 1 ] ) === 1 && Number( srgb[ 2 ] ) === 0 && Number( srgb[ 3 ] ) === 0;
};

const browser = await chromium.launch();
let failed = 0;
try {
	const page = await browser.newPage();
	await page.setContent( html );
	for ( const id of [ 'plain', 'ring' ] ) {
		await page.keyboard.press( 'Tab' );
		const shadow = await page.evaluate(
			( target ) => {
				const el = document.getElementById( target );
				return document.activeElement === el && el.matches( ':focus-visible' )
					? getComputedStyle( el ).boxShadow
					: null;
			},
			id
		);
		const ok = shadow !== null && firstLayerIsRed( shadow );
		failed += ok ? 0 : 1;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } #${ id } box-shadow: ${ shadow }` );
	}
} finally {
	await browser.close();
}
process.exit( failed ? 1 : 0 );
