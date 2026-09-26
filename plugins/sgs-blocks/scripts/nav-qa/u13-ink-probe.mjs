/**
 * U-13 live probe: section-adaptive header ink on /qa-section-ink/.
 *
 * Usage: node scripts/nav-qa/u13-ink-probe.mjs <page-url> --expect on|off
 *
 * At 375, 768 and 1440 (headless), scrolls each fixture section under the header's midpoint,
 * waits out the ink transition, then reads the header's tone class, its computed `color`, a menu
 * link's computed `color`, the section's computed background, and a pixel from a screenshot of the
 * header over that section. Contrast is computed ink against the section's measured ground.
 *
 * --expect on  (fixture `section-ink`): the ink differs between the light and the dark section,
 *              the plain group (browser-side fallback) reads dark, the photo section carries a tone
 *              class, and every section with a tone reaches 4.5:1.
 * --expect off (fixture `section-ink-off`, the negative control): no tone class anywhere and the ink
 *              is the same over every section.
 * Exit code 1 on any failed assertion. Screenshots land beside the JSON output in --out (default
 * the OS temp directory).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const url    = process.argv[ 2 ];
const expect = process.argv.includes( '--expect' ) ? process.argv[ process.argv.indexOf( '--expect' ) + 1 ] : 'on';
const outDir = process.argv.includes( '--out' ) ? process.argv[ process.argv.indexOf( '--out' ) + 1 ] : join( tmpdir(), 'u13-ink-probe' );
if ( ! url ) {
	console.error( 'usage: u13-ink-probe.mjs <page-url> --expect on|off [--out dir]' );
	process.exit( 2 );
}
mkdirSync( outDir, { recursive: true } );

const LABELS = [ 'Light section', 'Dark section', 'Photo section', 'Plain group, dark fill', 'Light again' ];

function parseRgb( value ) {
	const m = String( value ).match( /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/ );
	return m ? { r: +m[ 1 ], g: +m[ 2 ], b: +m[ 3 ], a: undefined === m[ 4 ] ? 1 : +m[ 4 ] } : null;
}
function luminance( { r, g, b } ) {
	const c = [ r, g, b ].map( ( v ) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ( ( s + 0.055 ) / 1.055 ) ** 2.4;
	} );
	return 0.2126 * c[ 0 ] + 0.7152 * c[ 1 ] + 0.0722 * c[ 2 ];
}
function contrast( a, b ) {
	const [ hi, lo ] = [ luminance( a ), luminance( b ) ].sort( ( x, y ) => y - x );
	return ( hi + 0.05 ) / ( lo + 0.05 );
}

const failures = [];
const results  = [];
const browser  = await chromium.launch( { headless: true } );

for ( const width of [ 375, 768, 1440 ] ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	await page.goto( url + ( url.includes( '?' ) ? '&' : '?' ) + 'nocache=' + Date.now(), { waitUntil: 'load' } );
	await page.waitForTimeout( 800 );

	const rows = [];
	// At rest, over the first section, the header is see-through (Transparent's
	// resting state): the ink alone follows the section.
	const rest = await page.evaluate( async () => {
		window.scrollTo( 0, 0 );
		await new Promise( ( r ) => setTimeout( r, 900 ) );
		const header = document.querySelector( '.sgs-site-header' );
		return {
			tone: header.classList.contains( 'is-header-on-dark' ) ? 'dark' : ( header.classList.contains( 'is-header-on-light' ) ? 'light' : '' ),
			headerColour: getComputedStyle( header ).color,
			headerBg: getComputedStyle( header ).backgroundColor,
			scrolled: header.classList.contains( 'is-header-scrolled' ),
		};
	} );
	if ( 'on' === expect && 'light' !== rest.tone ) {
		failures.push( `${ width }: at rest over the light section the tone is '${ rest.tone }'` );
	}
	if ( 'off' === expect && '' !== rest.tone ) {
		failures.push( `${ width }: at rest the tone is '${ rest.tone }' with ink off` );
	}
	for ( const label of LABELS ) {
		const row = await page.evaluate( async ( text ) => {
			const header = document.querySelector( '.sgs-site-header' );
			const p = Array.from( document.querySelectorAll( 'p' ) ).find( ( el ) => el.textContent.trim() === text );
			if ( ! header || ! p ) {
				return { missing: ! header ? 'header' : 'section' };
			}
			const section = p.closest( '.wp-block-sgs-container, .wp-block-group' ) || p.parentElement;
			const hRect = header.getBoundingClientRect();
			const sTop  = section.getBoundingClientRect().top + window.scrollY;
			window.scrollTo( 0, sTop + 250 - ( hRect.top + hRect.height / 2 ) );
			await new Promise( ( r ) => setTimeout( r, 900 ) );
			const link = header.querySelector( '.sgs-nav-bar-menu__link, .sgs-nav-bar-menu__burger' );
			const hr   = header.getBoundingClientRect();
			return {
				tone: header.classList.contains( 'is-header-on-dark' ) ? 'dark' : ( header.classList.contains( 'is-header-on-light' ) ? 'light' : '' ),
				scrolled: header.classList.contains( 'is-header-scrolled' ),
				live: header.dataset.sgsHeaderInk || '',
				headerColour: getComputedStyle( header ).color,
				headerBg: getComputedStyle( header ).backgroundColor,
				linkColour: link ? getComputedStyle( link ).color : '',
				iconColours: Array.from( header.querySelectorAll( '.wp-block-sgs-business-info:not(.is-style-button) .sgs-business-info__icon, .sgs-cart__trigger' ) )
					.filter( ( el ) => el.getBoundingClientRect().width > 0 )
					.map( ( el ) => getComputedStyle( el ).color ),
				sectionBg: getComputedStyle( section ).backgroundColor,
				sectionClass: section.className,
				sampleX: Math.round( hr.left + 4 ),
				sampleY: Math.round( hr.top + hr.height / 2 ),
			};
		}, label );
		if ( row.missing ) {
			failures.push( `${ width }: ${ label }: ${ row.missing } not found` );
			continue;
		}
		const shot = join( outDir, `${ width }-${ label.replace( /[^a-z]+/gi, '-' ).toLowerCase() }.png` );
		const buf  = await page.screenshot( { path: shot } );
		row.pixel  = await page.evaluate( async ( { b64, x, y } ) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + b64;
			await img.decode();
			const c = document.createElement( 'canvas' );
			c.width = img.width;
			c.height = img.height;
			const ctx = c.getContext( '2d' );
			ctx.drawImage( img, 0, 0 );
			const d = ctx.getImageData( x, y, 1, 1 ).data;
			return `rgb(${ d[ 0 ] }, ${ d[ 1 ] }, ${ d[ 2 ] })`;
		}, { b64: buf.toString( 'base64' ), x: row.sampleX, y: row.sampleY } );
		const ink    = parseRgb( row.headerColour );
		const ground = parseRgb( row.pixel );
		row.label    = label;
		row.contrast = ink && ground ? +contrast( ink, ground ).toFixed( 2 ) : null;
		rows.push( row );
	}
	results.push( { width, rest, rows } );

	const by = Object.fromEntries( rows.map( ( r ) => [ r.label, r ] ) );
	const light = by[ 'Light section' ];
	const dark  = by[ 'Dark section' ];
	if ( 'on' === expect ) {
		if ( light && dark && light.headerColour === dark.headerColour ) {
			failures.push( `${ width }: ink identical over light and dark (${ light.headerColour })` );
		}
		if ( light && 'light' !== light.tone ) {
			failures.push( `${ width }: light section read as '${ light.tone }'` );
		}
		if ( dark && 'dark' !== dark.tone ) {
			failures.push( `${ width }: dark section read as '${ dark.tone }'` );
		}
		const group = by[ 'Plain group, dark fill' ];
		if ( group && 'dark' !== group.tone ) {
			failures.push( `${ width }: plain dark group (browser fallback) read as '${ group.tone }'` );
		}
		const photo = by[ 'Photo section' ];
		if ( photo && '' === photo.tone ) {
			failures.push( `${ width }: photo section has no tone (measure-tone not run, or the image layer is not read)` );
		}
		rows.filter( ( r ) => r.tone && r.linkColour && r.linkColour !== r.headerColour ).forEach( ( r ) => {
			failures.push( `${ width }: ${ r.label } menu link ${ r.linkColour } does not follow the ink ${ r.headerColour }` );
		} );
		rows.filter( ( r ) => r.tone && r.iconColours.some( ( c ) => c !== r.headerColour ) ).forEach( ( r ) => {
			failures.push( `${ width }: ${ r.label } header icons ${ r.iconColours.join( ' / ' ) } do not follow the ink ${ r.headerColour }` );
		} );
		rows.filter( ( r ) => r.tone && null !== r.contrast && r.contrast < 4.5 ).forEach( ( r ) => {
			failures.push( `${ width }: ${ r.label } ink ${ r.headerColour } on ground ${ r.pixel } = ${ r.contrast }:1` );
		} );
	} else {
		rows.filter( ( r ) => r.tone ).forEach( ( r ) => failures.push( `${ width }: ${ r.label } carries tone '${ r.tone }' with ink off` ) );
		if ( light && dark && light.headerColour !== dark.headerColour ) {
			failures.push( `${ width }: ink changed with section ink off (${ light.headerColour } vs ${ dark.headerColour })` );
		}
	}
	await page.close();
}
await browser.close();

writeFileSync( join( outDir, `results-${ expect }.json` ), JSON.stringify( results, null, 2 ) );
for ( const { width, rows } of results ) {
	console.log( `\n== ${ width }px` );
	rows.forEach( ( r ) => console.log( `  ${ r.label.padEnd( 24 ) } tone=${ ( r.tone || '-' ).padEnd( 5 ) } ink=${ r.headerColour.padEnd( 20 ) } link=${ r.linkColour.padEnd( 20 ) } ground=${ r.pixel.padEnd( 18 ) } ${ r.contrast }:1 scrolled=${ r.scrolled }` ) );
}
console.log( failures.length ? `\nFAIL (${ failures.length })\n  ` + failures.join( '\n  ' ) : `\nPASS (--expect ${ expect })` );
console.log( `evidence: ${ outDir }` );
process.exit( failures.length ? 1 : 0 );
