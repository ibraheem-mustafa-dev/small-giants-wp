// AC-26 check for the logo slots (Spec 49 §10.4): reads the page install.php made and asserts the computed styles its
// settings set, at 375, 768 and 1440. Exit 0 when every assertion holds, 1 on any mismatch, 2 when the page is missing.
//
//   node tests/playwright/media-logos/check.mjs --base http://localhost:8098
//
// Playwright is loaded from this checkout's node_modules, else from SGS_PLAYWRIGHT_ROOT (the folder holding the
// package.json that installs it, such as scripts/computed-route in a worktree).
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const root = process.env.SGS_PLAYWRIGHT_ROOT ? path.resolve( process.env.SGS_PLAYWRIGHT_ROOT ) : path.resolve( here, '..', '..', '..' );
const { chromium } = createRequire( path.join( root, 'package.json' ) )( 'playwright' );

const args = process.argv.slice( 2 );
const base = ( args[ args.indexOf( '--base' ) + 1 ] || '' ).replace( /\/$/, '' );
if ( ! base || ! args.includes( '--base' ) ) {
	console.error( 'usage: node check.mjs --base <site url>' );
	process.exit( 2 );
}

const WIDTHS = [ 375, 768, 1440 ];
const TOLERANCE = 1;
const WIDE = 'sgs-w3c-fixture-wide';
const SQUARE = 'sgs-w3c-fixture-square';

// Expected state of each logo block per width: the file it shows and the box it draws. `w`/`h` in px.
const EXPECT = {
	'w3c-rl-mobile': { 375: { file: SQUARE, w: 200, h: 200 }, 768: { file: WIDE, w: 200, h: 50 }, 1440: { file: WIDE, w: 200, h: 50 } },
	'w3c-rl-tablet': { 375: { file: SQUARE, w: 200, h: 200 }, 768: { file: SQUARE, w: 200, h: 200 }, 1440: { file: WIDE, w: 200, h: 50 } },
	'w3c-rl-custom': { 375: { file: SQUARE, w: 200, h: 200 }, 768: { file: SQUARE, w: 200, h: 200 }, 1440: { file: WIDE, w: 200, h: 50 } },
	'w3c-rl-dark': { 375: { file: SQUARE, w: 200, h: 200 }, 768: { file: WIDE, w: 200, h: 50 }, 1440: { file: WIDE, w: 200, h: 50 } },
};
const DRAWER = { 375: { file: SQUARE, w: 120, h: 120 }, 768: { file: WIDE, w: 176, h: 44 }, 1440: { file: WIDE, w: 176, h: 44 } };
const TILE_RADIUS = { 375: '0px', 768: '50%', 1440: '50%' };

const failures = [];
let checks = 0;
const expectEqual = ( label, actual, wanted ) => {
	checks++;
	if ( actual !== wanted ) {
		failures.push( `${ label }: expected ${ JSON.stringify( wanted ) }, got ${ JSON.stringify( actual ) }` );
	}
};
const expectNear = ( label, actual, wanted ) => {
	checks++;
	if ( ! ( Math.abs( actual - wanted ) <= TOLERANCE ) ) {
		failures.push( `${ label }: expected ${ wanted }px (within ${ TOLERANCE }), got ${ actual }` );
	}
};

const measure = () => {
	const box = ( el ) => {
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle( el );
		return { w: r.width, h: r.height, src: ( el.currentSrc || el.src || '' ).split( '/' ).pop(), fit: cs.objectFit, display: cs.display, radius: cs.borderRadius, maxHeight: cs.maxHeight };
	};
	const out = { logos: {}, strip: [], drawer: null, flow: null, problems: [] };
	for ( const cls of [ 'w3c-rl-mobile', 'w3c-rl-tablet', 'w3c-rl-custom', 'w3c-rl-dark' ] ) {
		const root = document.querySelector( `.sgs-responsive-logo.${ cls }` );
		const img = root && root.querySelector( 'img.sgs-media-el:not(.sgs-responsive-logo__dark)' );
		const dark = root && root.querySelector( '.sgs-responsive-logo__dark' );
		out.logos[ cls ] = img ? { ...box( img ), dark: dark ? getComputedStyle( dark ).display : null } : null;
	}
	document.querySelectorAll( '.w3c-bs .sgs-brand-strip__item' ).forEach( ( item, i ) => {
		const img = item.querySelector( 'img' );
		if ( i < 3 && img ) {
			out.strip.push( { ...box( img ), tile: getComputedStyle( item ).borderRadius } );
		}
	} );
	const dialog = document.querySelector( 'dialog.w3c-nd' );
	if ( dialog ) {
		dialog.showModal();
		const img = dialog.querySelector( '.sgs-nav-drawer__chrome-logo img' );
		out.drawer = img ? box( img ) : null;
		dialog.close();
	}
	const flow = document.querySelector( '.w3c-cf .sgs-choice-flow__chrome-logo' );
	out.flow = flow ? box( flow.matches( 'img' ) ? flow : flow.querySelector( 'img' ) || flow ) : null;
	const text = document.body.innerText;
	if ( /\b(Notice|Warning|Fatal error|Deprecated):/.test( text ) ) {
		out.problems.push( 'a PHP message is printed on the page' );
	}
	return out;
};

const browser = await chromium.launch();
let missing = false;
for ( const width of WIDTHS ) {
	const page = await browser.newPage( { viewport: { width, height: 900 } } );
	const errors = [];
	// A resource that fails to load (a slow or offline asset host) is a network matter, not the page's script error.
	page.on( 'console', ( m ) => 'error' === m.type() && ! /^Failed to load resource/.test( m.text() ) && errors.push( m.text() ) );
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	const response = await page.goto( `${ base }/sgs-w3c-logos-fixture/`, { waitUntil: 'domcontentloaded', timeout: 90000 } );
	if ( ! response || 200 !== response.status() ) {
		console.error( `the fixture page is missing (${ response ? response.status() : 'no response' }): run install.php first` );
		missing = true;
		await page.close();
		break;
	}
	await page.waitForLoadState( 'load', { timeout: 60000 } ).catch( () => {} );
	await page.waitForTimeout( 800 );
	const got = await page.evaluate( measure );
	for ( const [ cls, byWidth ] of Object.entries( EXPECT ) ) {
		const want = byWidth[ width ];
		const have = got.logos[ cls ];
		checks++;
		if ( ! have ) {
			failures.push( `${ cls }@${ width }: no logo image printed` );
			continue;
		}
		expectEqual( `${ cls }@${ width } file`, have.src.replace( /(-\d+x\d+)?\.png$/, '' ), want.file );
		expectNear( `${ cls }@${ width } width`, have.w, want.w );
		expectNear( `${ cls }@${ width } height`, have.h, want.h );
		if ( 'w3c-rl-dark' === cls ) {
			expectEqual( `${ cls }@${ width } dark variant hidden by default`, have.dark, 'none' );
		}
	}
	const strip = got.strip;
	checks++;
	if ( 3 !== strip.length ) {
		failures.push( `brand strip@${ width }: expected 3 logos, got ${ strip.length }` );
	} else {
		expectEqual( `brand strip@${ width } logo 1 fit`, strip[ 0 ].fit, 'contain' );
		expectEqual( `brand strip@${ width } logo 2 fit`, strip[ 1 ].fit, 'contain' );
		expectEqual( `brand strip@${ width } logo 3 own fit`, strip[ 2 ].fit, 'cover' );
		expectNear( `brand strip@${ width } logo box is square`, strip[ 0 ].w, strip[ 0 ].h );
		expectEqual( `brand strip@${ width } tile shape`, strip[ 0 ].tile, TILE_RADIUS[ width ] );
	}
	checks++;
	if ( ! got.drawer ) {
		failures.push( `nav drawer chrome logo@${ width }: not printed` );
	} else {
		const want = DRAWER[ width ];
		expectEqual( `nav drawer chrome logo@${ width } file`, got.drawer.src.replace( /(-\d+x\d+)?\.png$/, '' ), want.file );
		expectNear( `nav drawer chrome logo@${ width } width`, got.drawer.w, want.w );
		expectNear( `nav drawer chrome logo@${ width } height`, got.drawer.h, want.h );
	}
	checks++;
	if ( ! got.flow ) {
		failures.push( `choice flow header logo@${ width }: not printed` );
	} else {
		expectEqual( `choice flow header logo@${ width } max height`, got.flow.maxHeight, '32px' );
		expectNear( `choice flow header logo@${ width } height`, got.flow.h, 32 );
	}
	got.problems.forEach( ( p ) => failures.push( `@${ width }: ${ p }` ) );
	errors.forEach( ( e ) => failures.push( `@${ width } console error: ${ e }` ) );
	checks += 1 + got.problems.length;
	await page.close();
}
await browser.close();

if ( missing ) {
	process.exit( 2 );
}
if ( failures.length ) {
	console.error( `FAIL: ${ failures.length } of ${ checks } checks` );
	failures.forEach( ( f ) => console.error( '  ' + f ) );
	process.exit( 1 );
}
console.log( `PASS: ${ checks } checks at ${ WIDTHS.join( ', ' ) }` );
