/**
 * Browser gate (Spec 49 §7.2, §8): `assets/css/media-base.css` on its own, with the `img{height:auto}` rule themes ship.
 * Proves, in real Chromium (all three engines with --all), that:
 *   - a helper with a Ratio crops to it, with and without a Height, Width or maximum;
 *   - a helper with no Ratio keeps the file's own size, large, small and tall;
 *   - Fit's default (`cover`) applies to every cropped image and leaves SVG and embed boxes as they were;
 *   - legacy `.sgs-media-el` markup without `.sgs-media--renderer` gets no Fit default.
 * Two negative controls plant the old rules (a theme `img` rule beating the helper height, no Fit default) and must fail.
 *
 * Run: node scripts/tests/test-media-base-css.mjs [--all]
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN = path.resolve( HERE, '..', '..' );
const pw = createRequire( path.join( PLUGIN, 'package.json' ) )( 'playwright' );
const CSS = fs.readFileSync( path.join( PLUGIN, 'assets', 'css', 'media-base.css' ), 'utf8' );
const ENGINES = process.argv.includes( '--all' ) ? [ 'chromium', 'firefox', 'webkit' ] : [ 'chromium' ];

const svg = ( w, h ) =>
	'data:image/svg+xml;utf8,' +
	encodeURIComponent( `<svg xmlns="http://www.w3.org/2000/svg" width="${ w }" height="${ h }"><rect width="${ w }" height="${ h }" fill="red"/></svg>` );
const img = ( w, h ) => `<img class="sgs-media-el" src="${ svg( w, h ) }" width="${ w }" height="${ h }">`;
const LARGE = [ 1600, 900 ];

// [label, helper printed, style, markup, expected [width, height]]; every image is expected to compute object-fit cover.
const CASES = [
	[ 'helper ratio 4/3, width 100%', true, 'aspect-ratio:4/3;width:100%', img( ...LARGE ), [ 600, 450 ] ],
	[ 'helper ratio 1/1, height 300px', true, 'aspect-ratio:1/1;height:300px;width:auto', img( ...LARGE ), [ 300, 300 ] ],
	[ 'helper height 300px only', true, 'height:300px;width:100%', img( ...LARGE ), [ 600, 300 ] ],
	[ 'helper ratio 16/9, max-height 200px', true, 'aspect-ratio:16/9;width:100%;max-height:200px', img( ...LARGE ), [ 600, 200 ] ],
	[ 'helper no ratio, large file', true, 'width:fit-content', img( ...LARGE ), [ 600, 337.5 ] ],
	[ 'helper no ratio, small file', true, 'width:fit-content', img( 300, 169 ), [ 300, 169 ] ],
	[ 'helper no ratio, tall file', true, 'width:fit-content', img( 400, 800 ), [ 400, 800 ] ],
	[ 'helper keeps the file shape at a height', true, 'height:300px;width:auto;aspect-ratio:1600/900', img( ...LARGE ), [ 533.33, 300 ] ],
	[ 'bare image ratio 4/3', false, 'aspect-ratio:4/3;width:100%', img( ...LARGE ), [ 600, 450 ] ],
	[ 'bare image width and height crop', false, 'width:300px;height:300px', img( ...LARGE ), [ 300, 300 ] ],
	[ 'bare image nothing, small file', false, '', img( 300, 169 ), [ 300, 169 ] ],
];

const page = ( css ) =>
	`<style>img{height:auto;max-width:100%}${ css }</style>` +
	CASES.map( ( [ , helper, style, markup ], i ) => {
		const root = helper
			? `<span class="sgs-media-box" style="${ style }">${ markup }</span>`
			: markup.replace( 'class="sgs-media-el"', `class="sgs-media-el" style="${ style }"` );
		return `<div style="width:600px"><figure id="c${ i }" style="margin:0" class="sgs-media sgs-media--renderer">${ root }</figure></div>`;
	} ).join( '' ) +
	'<div style="width:600px" id="kinds"><svg class="sgs-media-el" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%"><rect width="200" height="100" fill="red"/></svg>' +
	'<iframe class="sgs-media-el" srcdoc="x"></iframe></div>' +
	`<div style="width:600px"><figure id="legacy">${ img( ...LARGE ) }</figure></div>`;

const OLD_SPECIFICITY = CSS.replace(
	':where(.sgs-media-box, .sgs-media-box__mask) .sgs-media-el {',
	':where(.sgs-media-box, .sgs-media-box__mask) :where(.sgs-media-el) {'
);
const NO_FIT = CSS.replace( /:where\(\.sgs-media--renderer\.sgs-media-el[^{]*\{[^}]*\}/, '' );

async function run( engine, css ) {
	const browser = await pw[ engine ].launch();
	const p = await browser.newPage();
	await p.setContent( page( css ) );
	await p.waitForTimeout( 300 );
	const r = await p.evaluate( () => {
		const box = ( el ) => {
			const b = el.getBoundingClientRect();
			return [ b.width, b.height ];
		};
		return {
			cases: [ ...document.querySelectorAll( 'figure[id^=c]' ) ].map( ( f ) => {
				const el = f.querySelector( 'img' );
				return [ ...box( el ), getComputedStyle( el ).objectFit ];
			} ),
			svgBox: box( document.querySelector( '#kinds svg' ) ),
			iframeBox: box( document.querySelector( '#kinds iframe' ) ),
			legacyFit: getComputedStyle( document.querySelector( '#legacy img' ) ).objectFit,
		};
	} );
	await browser.close();
	return r;
}

const problems = ( r ) => {
	const out = [];
	const off = ( got, want ) => Math.abs( got[ 0 ] - want[ 0 ] ) > 1 || Math.abs( got[ 1 ] - want[ 1 ] ) > 1;
	CASES.forEach( ( c, i ) => {
		const [ w, h, fit ] = r.cases[ i ];
		if ( off( [ w, h ], c[ 4 ] ) || 'cover' !== fit ) {
			out.push( `${ c[ 0 ] }: ${ w.toFixed( 1 ) }x${ h.toFixed( 1 ) } ${ fit }, want ${ c[ 4 ].join( 'x' ) } cover` );
		}
	} );
	if ( off( r.svgBox, [ 600, 300 ] ) ) {
		out.push( `svg box ${ r.svgBox.join( 'x' ) }, want 600x300` );
	}
	if ( off( r.iframeBox, [ 600, 337.5 ] ) ) {
		out.push( `iframe box ${ r.iframeBox.join( 'x' ) }, want 600x337.5` );
	}
	if ( 'fill' !== r.legacyFit ) {
		out.push( `legacy markup object-fit ${ r.legacyFit }, want fill` );
	}
	return out;
};

let fail = 0;
const ck = ( name, cond, extra = '' ) => {
	process.stdout.write( `  ${ cond ? 'ok   ' : 'FAIL ' }${ name }${ cond ? '' : '  ' + extra }\n` );
	fail += cond ? 0 : 1;
};

process.stdout.write( 'media-base.css browser gate\n\n' );
ck( 'the planted rules exist in the source, so the controls plant something', OLD_SPECIFICITY !== CSS && NO_FIT !== CSS );
for ( const engine of ENGINES ) {
	const found = problems( await run( engine, CSS ) );
	ck( `${ engine }: ${ CASES.length } image cases, svg, iframe and legacy markup`, 0 === found.length, '\n    ' + found.join( '\n    ' ) );
}
ck( 'negative control: a theme img rule beating the helper height is caught', problems( await run( 'chromium', OLD_SPECIFICITY ) ).length > 0 );
ck( 'negative control: no Fit default is caught', problems( await run( 'chromium', NO_FIT ) ).length > 0 );

process.stdout.write( fail ? `\nFAILED (${ fail })\n` : '\nOK\n' );
process.exit( fail ? 1 : 0 );
