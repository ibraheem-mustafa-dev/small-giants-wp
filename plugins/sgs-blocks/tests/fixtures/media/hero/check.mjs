/**
 * AC-20 and AC-26 check for sgs/hero's media fixture (see install.mjs). Asserts computed styles at 375, 768 and 1440
 * and exits 1 on any mismatch.
 *
 * Usage: node check.mjs --base http://localhost:8102
 *
 * Asserts, per width:
 *  - the background photo's object-fit is cover, its object-position the Focal setting of that device (50% 20% on
 *    desktop and tablet, 50% 80% on mobile), and the overlay paints at opacity 0.4;
 *  - parallax (AC-20): the moving `.sgs-bg-media` covers the section's top and bottom edges at the top of the page, at
 *    a mid scroll and past the section, and it moves with the scroll; under reduced motion it never moves;
 *  - the split photo is 80% wide and 360px high on desktop, its radius is 24px, and its object-position is the
 *    mobile Focal setting (50% 20%) on mobile;
 *  - the default split hero's photo fills its grid cell (object-fit cover).
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const repoRoot = path.resolve( here, '../../../../../..' );
const require = createRequire( path.join( repoRoot, 'scripts/computed-route/package.json' ) );
const { chromium } = require( 'playwright' );

const base = ( process.argv[ process.argv.indexOf( '--base' ) + 1 ] || 'http://localhost:8102' ).replace( /\/$/, '' );
const failures = [];
const expect = ( ok, what ) => {
	if ( ! ok ) failures.push( what );
};

const browser = await chromium.launch();
for ( const width of [ 375, 768, 1440 ] ) {
	for ( const reduced of [ false, true ] ) {
		const ctx = await browser.newContext( { viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' } );
		const page = await ctx.newPage();
		await page.goto( `${ base }/hero-media-fixture/`, { waitUntil: 'load', timeout: 90000 } );
		await page.waitForTimeout( 1500 );
		const tag = `@${ width }${ reduced ? ' reduced-motion' : '' }`;
		const geo = () =>
			page.evaluate( () => {
				const hero = document.querySelector( '.media-fixture-bg' );
				const bg = hero.querySelector( ':scope > .sgs-bg-media' );
				const img = bg.querySelector( 'img' );
				const h = hero.getBoundingClientRect();
				const b = bg.getBoundingClientRect();
				return { hero: [ h.top, h.bottom ], bg: [ b.top, b.bottom ], fit: getComputedStyle( img ).objectFit, pos: getComputedStyle( img ).objectPosition, overlay: getComputedStyle( hero.querySelector( ':scope > .sgs-bg-overlay' ) ).opacity, transform: getComputedStyle( bg ).transform };
			} );
		const start = await geo();
		if ( ! reduced ) {
			expect( start.fit === 'cover', `${ tag } background object-fit ${ start.fit }` );
			expect( start.pos === ( 375 === width ? '50% 80%' : '50% 20%' ), `${ tag } background object-position ${ start.pos }` );
			expect( '0.4' === start.overlay, `${ tag } overlay opacity ${ start.overlay }` );
		}
		const positions = [];
		for ( const y of [ 0, 250, 500, 800 ] ) {
			await page.evaluate( ( top ) => window.scrollTo( 0, top ), y );
			await page.waitForTimeout( 500 );
			const g = await geo();
			positions.push( g.bg[ 0 ] - g.hero[ 0 ] );
			// The moving layer must cover the section's own top and bottom edge wherever the section is on screen.
			expect( g.bg[ 0 ] <= g.hero[ 0 ] + 0.5 && g.bg[ 1 ] >= g.hero[ 1 ] - 0.5, `${ tag } scroll ${ y }: background gap (bg ${ g.bg } hero ${ g.hero })` );
		}
		if ( reduced ) {
			expect( positions.every( ( p ) => Math.abs( p - positions[ 0 ] ) < 0.5 ), `${ tag } background moved under reduced motion (${ positions })` );
		} else {
			expect( positions.some( ( p ) => Math.abs( p - positions[ 0 ] ) > 1 ), `${ tag } background did not move with the scroll (${ positions })` );
		}
		if ( ! reduced ) {
			await page.evaluate( () => window.scrollTo( 0, 0 ) );
			const split = await page.evaluate( () => {
				const media = ( cls ) => document.querySelector( `.${ cls } .sgs-hero__media` ).querySelector( 'img' );
				const s = media( 'media-fixture-split' );
				const d = media( 'media-fixture-default' );
				const cell = document.querySelector( '.media-fixture-split .sgs-hero__media' ).getBoundingClientRect();
				const r = s.getBoundingClientRect();
				return { w: r.width, cellW: cell.width, h: r.height, radius: getComputedStyle( s ).borderTopLeftRadius, pos: getComputedStyle( s ).objectPosition, dFit: getComputedStyle( d ).objectFit, dW: d.getBoundingClientRect().width, dCellW: document.querySelector( '.media-fixture-default .sgs-hero__media' ).getBoundingClientRect().width };
			} );
			expect( Math.abs( split.w - split.cellW * 0.8 ) <= 1, `${ tag } split width ${ split.w } of cell ${ split.cellW }` );
			expect( Math.abs( split.h - 360 ) <= 1, `${ tag } split height ${ split.h }` );
			expect( '24px' === split.radius, `${ tag } split radius ${ split.radius }` );
			expect( 375 !== width || '50% 20%' === split.pos, `${ tag } split object-position ${ split.pos }` );
			expect( 'cover' === split.dFit && Math.abs( split.dW - split.dCellW ) <= 1, `${ tag } default split fit ${ split.dFit } width ${ split.dW } of ${ split.dCellW }` );
		}
		await ctx.close();
	}
}
await browser.close();
if ( failures.length ) {
	console.error( `FAIL (${ failures.length })\n` + failures.join( '\n' ) );
	process.exit( 1 );
}
console.log( 'OK: hero media fixture holds at 375, 768 and 1440' );
